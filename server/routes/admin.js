import { Router } from 'express';
import { requireAdminAuth, signAdminToken } from '../middleware/adminAuth.js';
import { listAgentsPending, listAgentsAll, updateAgentStatus, deleteAgentById } from '../store/agentStore.js';
import { listPendingDeals, updateAgentDealStatus, listAllApprovedDealsAdmin, adminDeleteAgentDeal, getAdminAnalytics } from '../store/agentDealStore.js';
import { getAllUsers, deleteUserById } from '../store/userStore.js';
import {
  listPendingClaims, approveClaim, rejectClaim,
  listPropertiesPendingReview, approveAutoProperty, rejectAutoProperty,
  getPropertyStats, hardDeletePropertyAdmin,
} from '../store/propertyStore.js';
import { listEngineRuns, getEngineRun, getLatestEngineRun } from '../store/engineRunStore.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public: login (no auth required)
router.post('/auth/login', authRateLimiter, (req, res) => {
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

router.delete('/agents/:id', async (req, res) => {
  try { await deleteAgentById(req.params.id); res.json({ ok: true }); }
  catch (err) {
    console.error('[admin] delete agent error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.get('/users', async (_req, res) => {
  try { res.json({ users: await getAllUsers() }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.delete('/users/:id', async (req, res) => {
  try { await deleteUserById(req.params.id); res.json({ ok: true }); }
  catch (err) {
    console.error('[admin] delete user error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Property ownership claims (Step 5) ────────────────────────────────────────

router.get('/properties/pending', async (_req, res) => {
  try { res.json({ properties: await listPendingClaims() }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/properties/:id/approve', async (req, res) => {
  try { await approveClaim(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/properties/:id/reject', async (req, res) => {
  try { await rejectClaim(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

// ── Auto-collected property review queue (Step 4 — confidence < 60, not yet published) ───────

router.get('/properties/review-queue', async (_req, res) => {
  try { res.json({ properties: await listPropertiesPendingReview() }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/properties/:id/approve-auto', async (req, res) => {
  try { await approveAutoProperty(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/properties/:id/reject-auto', async (req, res) => {
  try { await rejectAutoProperty(req.params.id); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/properties/stats', async (_req, res) => {
  try { res.json(await getPropertyStats()); }
  catch (err) {
    console.error('[admin] property stats error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** DELETE /api/admin/properties/:id — hard delete (7.6: "מחיקה קשיחה, נפרדת ומסומנת בבירור"),
 * separate from the owner-facing soft delete in server/routes/properties.js. Actually removes
 * the row — property_units/availability/booking_requests cascade via FK. */
router.delete('/properties/:id', async (req, res) => {
  try { await hardDeletePropertyAdmin(req.params.id); res.json({ ok: true }); }
  catch (err) {
    console.error('[admin] hard delete property error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Collection engine (Step 3/4) ──────────────────────────────────────────────
// IMPORTANT: this admin route ALWAYS runs the pipeline against local fixture sites
// (engine/fixtures/), never the real internet — there is no parameter, flag, or code path here
// that can select a live/real-site run. Wiring up a real SearchProvider is a manual, deliberate
// step outside this route — see SESSION-REPORT.md.

let currentRun = null; // in-memory handle so /engine/run can't be double-triggered while one is active

router.post('/engine/run', async (_req, res) => {
  if (currentRun) return res.status(409).json({ error: 'A run is already in progress' });
  try {
    const { startFixtureServers, stopFixtureServers, FIXTURE_SITES } = await import('../../engine/fixtures/fixtureServer.js');
    const { LocalFixtureSearchProvider } = await import('../../engine/discovery/searchProvider.js');
    const { buildQueryMatrix } = await import('../../engine/discovery/queryMatrix.js');
    const { runPipeline } = await import('../../engine/pipeline.js');

    const servers = await startFixtureServers();
    const byName = (name) => servers.find((s) => s.siteName === name);
    const siteHints = {
      [`localhost:${FIXTURE_SITES['galilee-zimmer'].port}`]: { name: 'צימר האגמים', property_type: 'zimmer', region: 'north', city: 'ראש פינה', phone: '046931234' },
      [`localhost:${FIXTURE_SITES['carmel-villa'].port}`]: { name: 'וילת האורנים', property_type: 'villa', region: 'carmel', city: 'עין הוד' },
      [`localhost:${FIXTURE_SITES['jerusalem-suite'].port}`]: { name: 'סוויטת הרי יהודה', property_type: 'suite', region: 'jerusalem', city: 'ירושלים' },
      [`localhost:${FIXTURE_SITES['south-cottage'].port}`]: { name: 'בקתת המדבר', property_type: 'cottage', region: 'south', city: 'מצפה רמון' },
      [`localhost:${FIXTURE_SITES['golan-zimmer-update'].port}`]: { name: 'צימר האגמים', property_type: 'zimmer', region: 'golan', city: 'ראש פינה', phone: '046931234' },
    };
    const searchProvider = new LocalFixtureSearchProvider({
      'צימר': [{ url: byName('galilee-zimmer').url, title: '', snippet: '' }],
      'הגליל': [{ url: byName('galilee-zimmer').url, title: '', snippet: '' }],
      'הגולן': [{ url: byName('golan-zimmer-update').url, title: '', snippet: '' }],
      'הכרמל': [{ url: byName('carmel-villa').url, title: '', snippet: '' }],
      'ירושלים': [{ url: byName('jerusalem-suite').url, title: '', snippet: '' }],
      'הדרום': [{ url: byName('south-cottage').url, title: '', snippet: '' }],
      'וילה': [{ url: byName('sparse-page').url, title: '', snippet: '' }, { url: byName('robots-blocked-site').url, title: '', snippet: '' }],
    });

    currentRun = runPipeline({ queries: buildQueryMatrix(), searchProvider, siteHints, mode: 'dry_run' })
      .then(async (result) => { await stopFixtureServers(servers); return result; })
      .catch(async (err) => { await stopFixtureServers(servers); throw err; })
      .finally(() => { currentRun = null; });

    res.status(202).json({ ok: true, message: 'Run started — poll /admin/engine/status' });
  } catch (err) {
    currentRun = null;
    console.error('[admin] engine run error:', err.message);
    res.status(500).json({ error: 'Failed to start run' });
  }
});

router.get('/engine/status', async (_req, res) => {
  try {
    const latest = await getLatestEngineRun();
    res.json({ running: currentRun !== null, latestRun: latest });
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/engine/runs', async (_req, res) => {
  try { res.json({ runs: await listEngineRuns(20) }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/engine/runs/:id', async (req, res) => {
  try {
    const run = await getEngineRun(req.params.id);
    if (!run) return res.status(404).json({ error: 'Not found' });
    res.json(run);
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const data = await getAdminAnalytics(year, month);
    res.json(data);
  } catch (err) {
    console.error('[admin] analytics error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
