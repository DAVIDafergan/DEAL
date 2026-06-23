import { Router } from 'express';
import { requireAdminAuth } from '../middleware/adminAuth.js';
import { listAgentsPending, listAgentsAll, updateAgentStatus } from '../store/agentStore.js';
import { listPendingDeals, updateAgentDealStatus, listApprovedDeals } from '../store/agentDealStore.js';

const router = Router();
router.use(requireAdminAuth);

router.get('/agents/pending', async (_req, res) => {
  try { res.json({ agents: await listAgentsPending() }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/agents', async (_req, res) => {
  try { res.json({ agents: await listAgentsAll() }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/agents/:id/approve', async (req, res) => {
  try {
    await updateAgentStatus(req.params.id, 'approved');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/agents/:id/reject', async (req, res) => {
  try {
    await updateAgentStatus(req.params.id, 'rejected', req.body.reason || null);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/deals/pending', async (_req, res) => {
  try { res.json({ deals: await listPendingDeals() }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/deals/approved', async (_req, res) => {
  try { res.json({ deals: await listApprovedDeals({ limit: 500 }) }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/deals/:id/approve', async (req, res) => {
  try {
    await updateAgentDealStatus(req.params.id, 'approved');
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/deals/:id/reject', async (req, res) => {
  try {
    await updateAgentDealStatus(req.params.id, 'rejected', req.body.reason || null);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

export default router;
