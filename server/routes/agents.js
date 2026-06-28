import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import {
  createAgent, findAgentByEmail, findAgentById, findAgentBySlug,
  updateAgentProfile, incrementAgentLeadCount,
} from '../store/agentStore.js';
import {
  createAgentDeal, listAgentDeals, updateAgentDeal, deleteAgentDeal,
  getAgentDeal, listApprovedDealsByAgent, listApprovedDeals, incrementDealClickCount,
  computeValueScore, listTopValueDeals, markDealPurchased, getAgentStats,
} from '../store/agentDealStore.js';
import { requireAgentAuth, signAgentToken } from '../middleware/agentAuth.js';
import { fetchDestinationMediaForAgent } from '../services/agentMediaService.js';
import { upsertRating, getAgentRatingSummary, getSessionRating, getSessionAllRatings } from '../store/ratingStore.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// ── Registration ──────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { business_name, contact_name, email, password, phone, whatsapp_number } = req.body;
    if (!business_name || !email || !password) {
      return res.status(400).json({ error: 'business_name, email, and password are required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const existing = await findAgentByEmail(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, 12);
    const { id, slug } = await createAgent({ business_name, contact_name: contact_name || business_name, email, password_hash, phone, whatsapp_number });
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

// ── Dashboard: deals ──────────────────────────────────────────────────────────

router.get('/me/deals', requireAgentAuth, async (req, res) => {
  try {
    const deals = await listAgentDeals(req.agentId);
    res.json({ deals });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/me/deals', requireAgentAuth, async (req, res) => {
  try {
    const agent = await findAgentById(req.agentId);
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Check deal limit per tier (pending + approved count toward limit)
    const allDeals = await listAgentDeals(req.agentId);
    const activeCount = allDeals.filter(d => d.status !== 'rejected').length;
    const limits = { basic: 5, pro: 20, unlimited: Infinity };
    const limit = limits[agent.subscription_tier] ?? 5;
    if (activeCount >= limit) {
      return res.status(403).json({ error: `Deal limit reached for ${agent.subscription_tier} plan (${limit} deals)` });
    }

    const { destination, departure_date, price } = req.body;
    if (!destination || !departure_date || !price) {
      return res.status(400).json({ error: 'destination, departure_date, and price are required' });
    }

    // Compute value_score vs market average
    const rawDeal = { destination, price: Number(price) };
    const value_score = await computeValueScore(rawDeal);

    const id = await createAgentDeal(req.agentId, { ...req.body, value_score });
    const deal = await getAgentDeal(id);
    res.status(201).json({ deal });
  } catch (err) {
    console.error('[agents] post deal error:', err);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

router.patch('/me/deals/:id', requireAgentAuth, async (req, res) => {
  try {
    await updateAgentDeal(req.params.id, req.agentId, req.body);
    const deal = await getAgentDeal(req.params.id);
    res.json({ deal });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/me/deals/:id', requireAgentAuth, async (req, res) => {
  try {
    await deleteAgentDeal(req.params.id, req.agentId);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

router.post('/me/deals/:id/purchased', requireAgentAuth, async (req, res) => {
  try {
    await markDealPurchased(req.params.id, req.agentId);
    const deal = await getAgentDeal(req.params.id);
    res.json({ ok: true, purchase_count: deal?.purchase_count ?? 0 });
  } catch (err) {
    console.error('[agents] mark purchased error:', err.message);
    res.status(500).json({ error: 'Failed to mark as purchased' });
  }
});

router.get('/me/stats', requireAgentAuth, async (req, res) => {
  try {
    const stats = await getAgentStats(req.agentId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Media auto-fetch for a destination ───────────────────────────────────────

router.get('/media/:iataCode', requireAgentAuth, async (req, res) => {
  try {
    const media = await fetchDestinationMediaForAgent(req.params.iataCode);
    res.json(media);
  } catch (err) {
    res.status(500).json({ error: 'Media fetch failed' });
  }
});

// ── Public: all approved deals (for feed mixing) ─────────────────────────────

router.get('/deals/approved', async (_req, res) => {
  try {
    const deals = await listApprovedDeals({ limit: 200 });
    res.json({ deals });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Public: top value deals ───────────────────────────────────────────────────

router.get('/deals/top-value', async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const deals = await listTopValueDeals(limit);
    res.json({ deals });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Public: track click (attribution) ────────────────────────────────────────

router.post('/deals/:id/click', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const deal = await getAgentDeal(id);
    if (!deal) return res.status(404).json({ error: 'Not found' });
    await incrementDealClickCount(id);
    await incrementAgentLeadCount(deal.agent_id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Public: agent profile ─────────────────────────────────────────────────────

router.get('/profile/:slug', async (req, res) => {
  try {
    const agent = await findAgentBySlug(req.params.slug);
    if (!agent || agent.status !== 'approved') return res.status(404).json({ error: 'Not found' });
    const deals = await listApprovedDealsByAgent(agent.id);
    res.json({ agent: publicAgent(agent), deals });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

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

function publicAgent(a) {
  const { password_hash, email, phone, stripe_customer_id, stripe_subscription_id, rejection_reason, ...rest } = a;
  return rest;
}

export default router;
