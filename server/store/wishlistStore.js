import { randomBytes } from 'node:crypto';
import { getPool } from '../../core/db/index.js';
import { getPropertiesByIds } from './propertyStore.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// 11.13 — shared, signup-free wishlist: a visitor picks properties (from their local favorites),
// names the list, gets a /list/:token link. Anyone with the link can vote/comment without an
// account — see core/db/index.js's wishlists/wishlist_items/wishlist_votes/wishlist_comments
// schema comment for the full shape.

export async function createWishlist(name, propertyIds) {
  const pool = getPool();
  const token = randomBytes(9).toString('base64url'); // ~12 chars, URL-safe, short enough to share
  const ts = nowStr();
  const [result] = await pool.query('INSERT INTO wishlists (token, name, created_at) VALUES (?, ?, ?)', [token, name, ts]);
  const wishlistId = result.insertId;
  let sortOrder = 0;
  for (const propertyId of propertyIds) {
    await pool.query(
      'INSERT IGNORE INTO wishlist_items (wishlist_id, property_id, sort_order, created_at) VALUES (?, ?, ?, ?)',
      [wishlistId, propertyId, sortOrder, ts]
    );
    sortOrder += 1;
  }
  return { id: wishlistId, token, name };
}

export async function getWishlistByToken(token) {
  const pool = getPool();
  const [[wishlist]] = await pool.query('SELECT * FROM wishlists WHERE token = ? LIMIT 1', [token]);
  if (!wishlist) return null;

  const [items] = await pool.query(
    'SELECT * FROM wishlist_items WHERE wishlist_id = ? ORDER BY sort_order ASC, id ASC',
    [wishlist.id]
  );
  if (items.length === 0) return { ...wishlist, items: [] };

  const propertyIds = items.map((i) => i.property_id);
  const properties = await getPropertiesByIds(propertyIds);
  const propertyById = new Map(properties.map((p) => [p.id, p]));

  const itemIds = items.map((i) => i.id);
  const placeholders = itemIds.map(() => '?').join(',');
  const [votes] = await pool.query(
    `SELECT wishlist_item_id, vote, COUNT(*) AS c FROM wishlist_votes WHERE wishlist_item_id IN (${placeholders}) GROUP BY wishlist_item_id, vote`,
    itemIds
  );
  const [comments] = await pool.query(
    `SELECT * FROM wishlist_comments WHERE wishlist_item_id IN (${placeholders}) ORDER BY created_at ASC`,
    itemIds
  );

  const votesByItem = new Map();
  for (const v of votes) {
    const entry = votesByItem.get(v.wishlist_item_id) || { up: 0, down: 0 };
    entry[v.vote] = v.c;
    votesByItem.set(v.wishlist_item_id, entry);
  }
  const commentsByItem = new Map();
  for (const c of comments) {
    const list = commentsByItem.get(c.wishlist_item_id) || [];
    list.push({ id: c.id, authorName: c.author_name, body: c.body, createdAt: c.created_at });
    commentsByItem.set(c.wishlist_item_id, list);
  }

  const enrichedItems = items
    .map((item) => ({
      itemId: item.id,
      property: propertyById.get(item.property_id) || null,
      upvotes: votesByItem.get(item.id)?.up || 0,
      downvotes: votesByItem.get(item.id)?.down || 0,
      comments: commentsByItem.get(item.id) || [],
    }))
    .filter((item) => item.property !== null); // property may have since been unpublished/deleted

  return { id: wishlist.id, token: wishlist.token, name: wishlist.name, createdAt: wishlist.created_at, items: enrichedItems };
}

/** Toggle semantics: casting the same vote again removes it; casting the opposite vote switches
 * it. Returns the item's fresh {up, down} tally. */
export async function voteOnWishlistItem(wishlistItemId, voterKey, vote) {
  const pool = getPool();
  const ts = nowStr();
  const [[existing]] = await pool.query(
    'SELECT vote FROM wishlist_votes WHERE wishlist_item_id = ? AND voter_key = ? LIMIT 1',
    [wishlistItemId, voterKey]
  );
  if (existing && existing.vote === vote) {
    await pool.query('DELETE FROM wishlist_votes WHERE wishlist_item_id = ? AND voter_key = ?', [wishlistItemId, voterKey]);
  } else {
    await pool.query(
      `INSERT INTO wishlist_votes (wishlist_item_id, voter_key, vote, created_at, updated_at) VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE vote = VALUES(vote), updated_at = VALUES(updated_at)`,
      [wishlistItemId, voterKey, vote, ts, ts]
    );
  }
  const [rows] = await pool.query(
    'SELECT vote, COUNT(*) AS c FROM wishlist_votes WHERE wishlist_item_id = ? GROUP BY vote',
    [wishlistItemId]
  );
  const tally = { up: 0, down: 0 };
  for (const r of rows) tally[r.vote] = r.c;
  return tally;
}

export async function addWishlistComment(wishlistItemId, voterKey, authorName, body) {
  const pool = getPool();
  const ts = nowStr();
  const [result] = await pool.query(
    'INSERT INTO wishlist_comments (wishlist_item_id, voter_key, author_name, body, created_at) VALUES (?, ?, ?, ?, ?)',
    [wishlistItemId, voterKey, authorName || null, body, ts]
  );
  return { id: result.insertId, authorName: authorName || null, body, createdAt: ts };
}

/** Guards against a comment/vote being posted against an item that doesn't belong to this
 * wishlist token — the route layer only ever has (token, itemId) from the URL, never a raw
 * wishlist_item_id it can trust without checking the parent relationship first. */
export async function itemBelongsToWishlistToken(wishlistItemId, token) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT wi.id FROM wishlist_items wi
     JOIN wishlists w ON w.id = wi.wishlist_id
     WHERE wi.id = ? AND w.token = ? LIMIT 1`,
    [wishlistItemId, token]
  );
  return Boolean(row);
}
