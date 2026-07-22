import { Router } from 'express';
import { requireUserAuth } from '../middleware/userAuth.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';
import { contactRateLimiter } from '../middleware/rateLimiter.js';
import { updateReview, replyToReview, reportReview } from '../store/reviewStore.js';

const router = Router();

/** PATCH /api/reviews/:id — 10.6: edit within 30 days, own review only. */
router.patch('/:id', requireUserAuth, async (req, res) => {
  try {
    const { rating, cleanlinessRating, accuracyRating, hostRating, valueRating, title, body } = req.body || {};
    if (!rating || !body?.trim()) return res.status(400).json({ error: 'rating and body are required' });
    await updateReview(req.params.id, req.user.userId, { rating, cleanlinessRating, accuracyRating, hostRating, valueRating, title, body });
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
});

/** POST /api/reviews/:id/reply — owner-only, one reply per review (overwrites). */
router.post('/:id/reply', requireAgentAuth, async (req, res) => {
  try {
    const { reply } = req.body || {};
    if (!reply?.trim()) return res.status(400).json({ error: 'reply is required' });
    await replyToReview(req.params.id, req.agentId, reply.trim());
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Internal error' });
  }
});

/** POST /api/reviews/:id/report — public (anyone can flag a review), rate-limited against spam. */
router.post('/:id/report', contactRateLimiter, async (req, res) => {
  try {
    const { reason, sessionId } = req.body || {};
    await reportReview(req.params.id, reason, sessionId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
