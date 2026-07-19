import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import {
  createAgent, findAgentByEmail, findAgentById,
  updateAgentProfile, deleteAgentById,
} from '../store/agentStore.js';
import { requireAgentAuth, signAgentToken } from '../middleware/agentAuth.js';
import { upsertRating, getAgentRatingSummary, getSessionRating, getSessionAllRatings } from '../store/ratingStore.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

// Flight-deal-specific endpoints below (deal CRUD, dashboard stats, destination media,
// public deal feeds, agent profile) are retired along with the rest of the flight world — see
// README. agentDealStore.js and agentMediaService.js are untouched in the repo, just no longer
// imported here. Account management (register/login/me) and ratings stay live: they're generic
// to the business entity, not flight-deal-specific, and are exactly what the zimmer-owner portal
// reuses per the Step 0 mapping decision (agents table doubles as the owner table for now).

const router = Router();

// ── Registration ──────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { business_name, contact_name, email, password, phone, whatsapp_number, account_type } = req.body;
    if (!business_name || !email || !password) {
      return res.status(400).json({ error: 'business_name, email, and password are required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = await findAgentByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 12);
    const { id, slug } = await createAgent({ business_name, contact_name: contact_name || business_name, email, password_hash, phone, whatsapp_number, account_type });
    const agent = await findAgentById(id);
    const token = signAgentToken(agent);
    res.status(201).json({ token, agent: safeAgent(agent) });
  } catch (err) {
    console.error('[agents] register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// ── Google OAuth Login ────────────────────────────────────────────────────────

router.post('/google', authRateLimiter, async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) return res.status(400).json({ error: 'Missing credential' });

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: 'Google login not configured on this server' });

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) return res.status(400).json({ error: 'Google account has no email' });

    const existing = await findAgentByEmail(email);
    if (existing) {
      const token = signAgentToken(existing);
      return res.json({ token, agent: safeAgent(existing) });
    }

    // New user — tell frontend to complete registration
    res.json({ isNew: true, email, name: name || '', picture: picture || '' });
  } catch (err) {
    console.error('[agents] google auth error:', err.message);
    res.status(401).json({ error: 'Google authentication failed' });
  }
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.post('/login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const agent = await findAgentByEmail(email);
    if (!agent) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, agent.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signAgentToken(agent);
    res.json({ token, agent: safeAgent(agent) });
  } catch (err) {
    console.error('[agents] login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── Dashboard: profile ────────────────────────────────────────────────────────

router.get('/me', requireAgentAuth, async (req, res) => {
  try {
    const agent = await findAgentById(req.agentId);
    if (!agent) return res.status(404).json({ error: 'Not found' });
    res.json({ agent: safeAgent(agent) });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.patch('/me', requireAgentAuth, async (req, res) => {
  try {
    await updateAgentProfile(req.agentId, req.body);
    const agent = await findAgentById(req.agentId);
    res.json({ agent: safeAgent(agent) });
  } catch (err) {
    console.error('[agents] patch /me error:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/me', requireAgentAuth, async (req, res) => {
  try {
    await deleteAgentById(req.agentId);
    res.json({ ok: true });
  } catch (err) {
    console.error('[agents] delete account error:', err.message);
    res.status(500).json({ error: 'שגיאה במחיקת החשבון' });
  }
});

// ── Retired: flight deal CRUD, dashboard stats, destination media, public deal feeds, profile ─

const dealsRetired = (_req, res) => res.status(410).json({ error: 'Flight deals are no longer available on this platform.' });

router.get('/me/deals', requireAgentAuth, dealsRetired);
router.post('/me/deals', requireAgentAuth, dealsRetired);
router.patch('/me/deals/:id', requireAgentAuth, dealsRetired);
router.delete('/me/deals/:id', requireAgentAuth, dealsRetired);
router.post('/me/deals/:id/purchased', requireAgentAuth, dealsRetired);
router.get('/me/stats', requireAgentAuth, dealsRetired);
router.get('/media/:iataCode', requireAgentAuth, dealsRetired);
router.get('/deals/approved', dealsRetired);
router.get('/deals/top-value', dealsRetired);
router.post('/deals/:id/click', dealsRetired);
router.get('/profile/:slug', dealsRetired);

// ── Ratings (specific routes MUST come before /:id wildcard) ─────────────────

router.get('/my-ratings', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const ratings = await getSessionAllRatings(session_id);
    res.json({ ratings });
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/:id/ratings', async (req, res) => {
  try {
    const summary = await getAgentRatingSummary(req.params.id);
    res.json(summary);
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/:id/my-rating', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const rating = await getSessionRating(session_id, req.params.id);
    res.json({ rating });
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/:id/rate', async (req, res) => {
  try {
    const { session_id, rating } = req.body;
    const r = Number(rating);
    if (!session_id || !r || r < 1 || r > 5) return res.status(400).json({ error: 'Invalid rating' });
    await upsertRating(session_id, req.params.id, r);
    const summary = await getAgentRatingSummary(req.params.id);
    res.json(summary);
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeAgent(a) {
  const { password_hash, ...rest } = a;
  return rest;
}

export default router;
