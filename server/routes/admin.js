import { Router } from 'express';
import { requireAdminAuth, signAdminToken } from '../middleware/adminAuth.js';
import { listAgentsPending, listAgentsAll, updateAgentStatus } from '../store/agentStore.js';
import { listPendingDeals, updateAgentDealStatus, listAllApprovedDealsAdmin, adminDeleteAgentDeal } from '../store/agentDealStore.js';

const router = Router();

// Public: hint — safe to expose (username is not a secret; password is never sent)
router.get('/auth/hint', (_req, res) => {
  const u = (process.env.ADMIN_USERNAME || 'admin').trim();
  const p = (process.env.ADMIN_PASSWORD || 'admin-change-me').trim();
  const isDefaultUser = u === 'admin';
  const isDefaultPass = p === 'admin-change-me';
  res.json({
    username: u,
    password_length: p.length,
    password_hint: p.slice(0, 3) + '***',
    using_defaults: isDefaultUser && isDefaultPass,
  });
});

// Public: login (no auth required)
router.post('/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const submitted_user = (username || '').trim();
  const submitted_pass = (password || '').trim();
  const expectedUser = (process.env.ADMIN_USERNAME || 'admin').trim();
  const expectedPass = (process.env.ADMIN_PASSWORD || 'admin-change-me').trim();
  // DEBUG: remove after Railway login is confirmed working
  console.log('[admin-login-debug]', {
    submitted_user_len: submitted_user.length,
    submitted_pass_len: submitted_pass.length,
    expected_user_len: expectedUser.length,
    expected_pass_len: expectedPass.length,
    ADMIN_USERNAME_defined: process.env.ADMIN_USERNAME !== undefined,
    ADMIN_USERNAME_empty: process.env.ADMIN_USERNAME === '',
    ADMIN_PASSWORD_defined: process.env.ADMIN_PASSWORD !== undefined,
    ADMIN_PASSWORD_empty: process.env.ADMIN_PASSWORD === '',
    match: submitted_user === expectedUser && submitted_pass === expectedPass,
  });
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
