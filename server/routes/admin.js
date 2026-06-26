import { Router } from 'express';
import { requireAdminAuth, signAdminToken } from '../middleware/adminAuth.js';
import { listAgentsPending, listAgentsAll, updateAgentStatus } from '../store/agentStore.js';
import { listPendingDeals, updateAgentDealStatus, listAllApprovedDealsAdmin, adminDeleteAgentDeal } from '../store/agentDealStore.js';

const router = Router();

// Public: login (no auth required)
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const submitted_user = (username || '').trim();
  const submitted_pass = (password || '').trim();
  const expectedUser = (process.env.ADMIN_USERNAME || 'admin').trim();
  const expectedPass = (process.env.ADMIN_PASSWORD || 'admin-change-me').trim();
  if (!submitted_user || !submitted_pass || submitted_user !== expectedUser || submitted_pass !== expectedPass) {
    return res.status(401).json({ error: 'שם משתמש או סיסמה שגויים' });
  }
  res.json({ token: signAdminToken() });
});

// All routes below require admin JWT
router.use(requireAdminAuth);

router.get('/agents/pending', async (_req, res) => {
  try { res.json({ agents: await listAgentsPending() }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/agents', async (_req, res) => {
  try { res.json({ agents: await listAgentsAll() }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/agents/:id/approve', async (req, res) => {
  try { await updateAgentStatus(req.params.id, 'approved'); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/agents/:id/reject', async (req, res) => {
  try { await updateAgentStatus(req.params.id, 'rejected', req.body.reason || null); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/deals/pending', async (_req, res) => {
  try { res.json({ deals: await listPendingDeals() }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/deals/approved', async (_req, res) => {
  try { res.json({ deals: await listAllApprovedDealsAdmin({ limit: 500 }) }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/deals/:id/approve', async (req, res) => {
  try { await updateAgentDealStatus(req.params.id, 'approved'); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/deals/:id/reject', async (req, res) => {
  try { await updateAgentDealStatus(req.params.id, 'rejected', req.body.reason || null); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.delete('/deals/:id', async (req, res) => {
  try { await adminDeleteAgentDeal(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

export default router;
