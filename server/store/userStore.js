import { getPool } from '../../core/db/index.js';

export async function findUserByEmail(email) {
  const [rows] = await getPool().query('SELECT * FROM users WHERE email=?', [email]);
  return rows[0] || null;
}

export async function findUserById(id) {
  const [rows] = await getPool().query(
    'SELECT id, name, email, auth_provider, created_at FROM users WHERE id=?', [id]
  );
  return rows[0] || null;
}

/** Includes password_hash — only for the change-password flow's current-password check, never
 * returned to the client (findUserById above is the public-shape lookup everywhere else). */
export async function findUserByIdRaw(id) {
  const [rows] = await getPool().query('SELECT * FROM users WHERE id=?', [id]);
  return rows[0] || null;
}

export async function createUser({ name, email, passwordHash, authProvider = 'local' }) {
  const [result] = await getPool().query(
    'INSERT INTO users (name, email, password_hash, auth_provider, created_at) VALUES (?, ?, ?, ?, NOW())',
    [name, email, passwordHash || null, authProvider]
  );
  return findUserById(result.insertId);
}

export async function getAllUsers() {
  const [rows] = await getPool().query(
    'SELECT id, name, email, auth_provider, created_at FROM users ORDER BY created_at DESC'
  );
  return rows;
}

export async function deleteUserById(id) {
  await getPool().query('DELETE FROM users WHERE id = ?', [id]);
}

export async function updateUserName(id, name) {
  await getPool().query('UPDATE users SET name = ? WHERE id = ?', [name, id]);
  return findUserById(id);
}

export async function setUserPasswordHash(id, passwordHash) {
  await getPool().query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
}

// 11.21 — favorites: INSERT IGNORE / plain DELETE, no read-modify-write — the UNIQUE key on
// (user_id, property_id) makes both idempotent (repeat add/remove of the same property is a
// no-op, not an error), which matters for the anonymous->account merge on login (see
// useFavorites.js) where the same id can be pushed more than once.
export async function getFavoritePropertyIds(userId) {
  const [rows] = await getPool().query(
    'SELECT property_id FROM property_favorites WHERE user_id = ? ORDER BY created_at DESC', [userId]
  );
  return rows.map((r) => r.property_id);
}

export async function addFavorite(userId, propertyId) {
  await getPool().query(
    'INSERT IGNORE INTO property_favorites (user_id, property_id, created_at) VALUES (?, ?, NOW())',
    [userId, propertyId]
  );
}

export async function removeFavorite(userId, propertyId) {
  await getPool().query('DELETE FROM property_favorites WHERE user_id = ? AND property_id = ?', [userId, propertyId]);
}

const RECENTLY_VIEWED_MAX = 8; // matches the anonymous localStorage version's MAX_ITEMS (utils/recentlyViewed.js)

export async function getRecentlyViewedPropertyIds(userId) {
  const [rows] = await getPool().query(
    'SELECT property_id FROM user_recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ?',
    [userId, RECENTLY_VIEWED_MAX]
  );
  return rows.map((r) => r.property_id);
}

export async function recordRecentlyViewed(userId, propertyId) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO user_recently_viewed (user_id, property_id, viewed_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE viewed_at = NOW()`,
    [userId, propertyId]
  );
  // Trim to the most recent N — wrapped in a derived-table subquery because MySQL won't allow
  // selecting from the same table being deleted from directly in the NOT IN subquery.
  await pool.query(
    `DELETE FROM user_recently_viewed WHERE user_id = ? AND id NOT IN (
       SELECT id FROM (
         SELECT id FROM user_recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ?
       ) keep
     )`,
    [userId, userId, RECENTLY_VIEWED_MAX]
  );
}
