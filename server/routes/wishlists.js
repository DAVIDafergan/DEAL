import { Router } from 'express';
import { wishlistRateLimiter } from '../middleware/rateLimiter.js';
import {
  createWishlist,
  getWishlistByToken,
  voteOnWishlistItem,
  addWishlistComment,
  itemBelongsToWishlistToken,
} from '../store/wishlistStore.js';

const router = Router();

const MAX_ITEMS = 30;
const MAX_NAME_LENGTH = 120;
const MAX_COMMENT_LENGTH = 500;

/** POST /api/wishlists — 11.13: no auth. Anyone can bundle a handful of property ids (their
 * local favorites) into a named, shareable list. */
router.post('/', wishlistRateLimiter, async (req, res) => {
  try {
    const { name, propertyIds } = req.body || {};
    const trimmedName = (name || '').trim().slice(0, MAX_NAME_LENGTH);
    if (!trimmedName) return res.status(400).json({ error: 'name is required' });
    const ids = Array.isArray(propertyIds) ? propertyIds.map(Number).filter(Number.isInteger) : [];
    if (ids.length === 0) return res.status(400).json({ error: 'propertyIds must be a non-empty array' });
    if (ids.length > MAX_ITEMS) return res.status(400).json({ error: `Lists are capped at ${MAX_ITEMS} properties` });
    const wishlist = await createWishlist(trimmedName, ids);
    res.status(201).json(wishlist);
  } catch (err) {
    console.error('[wishlists] create error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** GET /api/wishlists/:token — public, no auth. 404 rather than leaking whether a token ever
 * existed vs. was deleted (there's no delete path yet, but keeps the response shape simple). */
router.get('/:token', async (req, res) => {
  try {
    const wishlist = await getWishlistByToken(req.params.token);
    if (!wishlist) return res.status(404).json({ error: 'Not found' });
    res.json(wishlist);
  } catch (err) {
    console.error('[wishlists] get error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** POST /api/wishlists/:token/items/:itemId/vote — body: { voterKey, vote: 'up'|'down' }. */
router.post('/:token/items/:itemId/vote', wishlistRateLimiter, async (req, res) => {
  try {
    const { voterKey, vote } = req.body || {};
    if (!voterKey || !['up', 'down'].includes(vote)) return res.status(400).json({ error: 'voterKey and vote (up|down) are required' });
    const itemId = Number(req.params.itemId);
    if (!(await itemBelongsToWishlistToken(itemId, req.params.token))) return res.status(404).json({ error: 'Not found' });
    const tally = await voteOnWishlistItem(itemId, voterKey, vote);
    res.json({ ok: true, ...tally });
  } catch (err) {
    console.error('[wishlists] vote error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** POST /api/wishlists/:token/items/:itemId/comments — body: { voterKey, authorName, body }. */
router.post('/:token/items/:itemId/comments', wishlistRateLimiter, async (req, res) => {
  try {
    const { voterKey, authorName, body } = req.body || {};
    const trimmedBody = (body || '').trim().slice(0, MAX_COMMENT_LENGTH);
    if (!voterKey || !trimmedBody) return res.status(400).json({ error: 'voterKey and body are required' });
    const itemId = Number(req.params.itemId);
    if (!(await itemBelongsToWishlistToken(itemId, req.params.token))) return res.status(404).json({ error: 'Not found' });
    const comment = await addWishlistComment(itemId, voterKey, (authorName || '').trim().slice(0, 80), trimmedBody);
    res.status(201).json(comment);
  } catch (err) {
    console.error('[wishlists] comment error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
