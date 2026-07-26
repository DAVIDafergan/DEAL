import { Router } from 'express';
import { requireAdminAuth, signAdminToken } from '../middleware/adminAuth.js';
import { listAgentsPending, listAgentsAll, updateAgentStatus, deleteAgentById } from '../store/agentStore.js';
import { listPendingDeals, updateAgentDealStatus, listAllApprovedDealsAdmin, adminDeleteAgentDeal, getAdminAnalytics } from '../store/agentDealStore.js';
import { getAllUsers, deleteUserById } from '../store/userStore.js';
import {
  listPendingClaims, approveClaim, rejectClaim,
  listPropertiesPendingReview, approveAutoProperty, rejectAutoProperty, updateAutoCollectedProperty,
  getPropertyStats, hardDeletePropertyAdmin, listInfoReports, dismissInfoReport,
} from '../store/propertyStore.js';
import { listEngineRuns, getEngineRun, getLatestEngineRun } from '../store/engineRunStore.js';
import { getQueryStats, listQueries } from '../store/engineQueryStore.js';
import { isEmergencyStopped, setEmergencyStop } from '../store/engineSettingsStore.js';
import { getSessionCost } from '../../engine/extractor/costLogger.js';
import { getProgress } from '../../engine/progressTracker.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { getSiteEventStats } from '../store/propertyEventStore.js';
import { listReportedReviews, setReviewStatus } from '../store/reviewStore.js';
import { getImageStorage, resolveImageStorageMode } from '../../media/imageStorage/index.js';
import { isCloudinaryConfigured } from '../../media/cloudinaryUpload.js';

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

// Lets an admin correct extracted fields before approving — updateAutoCollectedProperty already
// whitelists which columns are settable and scopes the UPDATE to source='auto', so this can't
// touch owner-managed or non-auto-collected rows.
router.patch('/properties/:id/auto', async (req, res) => {
  try { await updateAutoCollectedProperty(req.params.id, req.body || {}); res.json({ ok: true }); }
  catch (err) { console.error('[admin] property auto-edit error:', err.message); res.status(500).json({ error: 'Internal error' }); }
});

// ── 11.5: image storage status (which backend is active, how much it's storing) ──────────────
router.get('/image-storage-status', async (_req, res) => {
  try {
    const mode = resolveImageStorageMode();
    const stats = await getImageStorage().getStorageStats();
    res.json({ mode, cloudinaryConfigured: isCloudinaryConfigured(), ...stats });
  } catch (err) {
    console.error('[admin] image-storage-status error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
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

    await setEmergencyStop(false); // clear any stale stop flag from a previous run before starting a new one

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

/**
 * Step 8 — the ONLY route in this codebase that can touch real, live websites. Runs with ZERO
 * external keys/APIs by default: discovery comes from SeedSourceProvider (crawls the curated,
 * human-verified directory pages in engine/discovery/seedSources.json and mines their outbound
 * links — see seedSourceProvider.js), and extraction is RuleBasedExtractor (ruleBasedExtractor.js
 * — deterministic, works off meta tags/JSON-LD/regex already parsed from the HTML, no LLM call).
 * SEARCH_API_KEY/ANTHROPIC_API_KEY, if ever set, are purely optional *enhancements* layered on
 * top (broader discovery via a commercial search API, higher-quality extraction via Claude) —
 * neither is required, and this route never refuses to start for lack of either. `roundSize`
 * implements the staged calibration in 8.4 (20 -> 200 -> full): caps how many *sites*
 * (post-classification) get fetched this run, not how many queries/seeds run.
 */
router.post('/engine/run-live', async (req, res) => {
  if (currentRun) return res.status(409).json({ error: 'A run is already in progress' });
  try {
    const { createCommercialSearchProvider } = await import('../../engine/discovery/commercialSearchProvider.js');
    const { classifySources } = await import('../../engine/discovery/sourceClassifier.js');
    const { runDiscovery } = await import('../../engine/discovery/discoveryEngine.js');
    const { discoverFromSeeds, loadSeedSources } = await import('../../engine/discovery/seedSourceProvider.js');
    const { buildQueryMatrix } = await import('../../engine/discovery/queryMatrix.js');
    const { runPipeline } = await import('../../engine/pipeline.js');
    const { listQueries } = await import('../store/engineQueryStore.js');
    const { normalizeDomain } = await import('../../core/compliance/blocklist.js');
    const { startEngineRun, finishEngineRun } = await import('../store/engineRunStore.js');
    const { startProgress, clearProgress } = await import('../../engine/progressTracker.js');
    const { chromium } = await import('playwright');

    const apiKey = process.env.SEARCH_API_KEY;
    const searchProvider = apiKey ? createCommercialSearchProvider() : null;
    if (apiKey && !searchProvider) {
      return res.status(503).json({ error: 'SEARCH_API_KEY is set but no valid provider could be created — check SEARCH_PROVIDER.' });
    }
    const discoveryMode = searchProvider ? 'commercial_search' : 'seed_sources';
    if (!searchProvider && loadSeedSources().length === 0) {
      return res.status(503).json({
        error: 'No SEARCH_API_KEY and engine/discovery/seedSources.json has no seeds — nothing to discover from. Add seed URLs or set SEARCH_API_KEY.',
      });
    }

    const roundSize = Number(req.body?.roundSize) || null; // 20 | 200 | null (full run)

    // Prefer the persisted matrix (has run history — see 8.2) if it's been synced at least once;
    // otherwise fall back to generating fresh so this route still works without a prior sync call.
    const persisted = await listQueries();
    const queries = persisted.length > 0 ? persisted.map((q) => q.query_text) : buildQueryMatrix();

    await setEmergencyStop(false);
    clearProgress();

    currentRun = (async () => {
      // Classification now needs each candidate's own real page content (meta tags/JSON-LD/body
      // text — see sourceClassifier.js's reject-by-default heuristic), so this browser stays open
      // through both discovery (seed path) and classification, then closes before the pipeline's
      // own browser takes over for the fetch+extract+load stage.
      let approvedSites;
      let classifyBrowser;
      try {
        classifyBrowser = await chromium.launch({ args: ['--no-sandbox'] });
        let discoverySites;
        if (searchProvider) {
          const discovery = await runDiscovery(queries, searchProvider);
          discoverySites = discovery.sites;
        } else {
          const { sites } = await discoverFromSeeds(classifyBrowser);
          discoverySites = sites.map((s) => ({ ...s, domain: s.domain || normalizeDomain(new URL(s.url).hostname) }));
        }

        const classifications = await classifySources(discoverySites, { browser: classifyBrowser });
        approvedSites = discoverySites.filter((_, i) => classifications[i].classification === 'single_property');
        startProgress({ domainsDiscovered: discoverySites.length, classified: classifications.length, approved: approvedSites.length });
        if (roundSize) approvedSites = approvedSites.slice(0, roundSize);
      } catch (err) {
        // Discovery/classification failing here means runPipeline (which normally owns the
        // engine_runs row for a run) never even starts — record the failure directly so this
        // attempt shows up in run history with a real reason instead of just silently vanishing.
        const runId = await startEngineRun('live');
        await finishEngineRun(runId, { status: 'failed', errorMessage: err.message });
        throw err;
      } finally {
        if (classifyBrowser) await classifyBrowser.close();
      }

      return runPipeline({ queries, searchProvider, mode: 'live', preDiscoveredSites: approvedSites });
    })()
      .catch((err) => { console.error('[admin] live engine run failed:', err.message); })
      .finally(() => { currentRun = null; });

    res.status(202).json({
      ok: true,
      discoveryMode,
      message: `Live run started (discovery: ${discoveryMode}, round size: ${roundSize || 'full'}) — poll /admin/engine/status`,
    });
  } catch (err) {
    currentRun = null;
    console.error('[admin] live engine run error:', err.message);
    res.status(500).json({ error: 'Failed to start live run' });
  }
});

router.get('/engine/status', async (_req, res) => {
  try {
    const latest = await getLatestEngineRun();
    // Live cost log (8.5: "לוג עלות מצטבר בזמן אמת בפאנל") — costLogger's session counters are
    // process-global and update in real time as the running pipeline calls the LLM, so reading
    // them here needs no extra plumbing between the pipeline and this endpoint.
    res.json({
      running: currentRun !== null,
      latestRun: latest,
      liveCost: currentRun !== null ? getSessionCost() : null,
      liveProgress: getProgress(),
      emergencyStopped: await isEmergencyStopped(),
    });
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

/** Step 8.5 emergency stop — the running pipeline checks this before every single site fetch
 * (see engine/pipeline.js), so pressing this actually halts a run within one page-fetch, not at
 * the next natural checkpoint. Resets back to false automatically once a run actually finishes
 * (finishEngineRun doesn't touch it, so it must be reset explicitly — done here on start). */
router.post('/engine/emergency-stop', async (_req, res) => {
  try { await setEmergencyStop(true); res.json({ ok: true, emergencyStopped: true }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/engine/emergency-stop/clear', async (_req, res) => {
  try { await setEmergencyStop(false); res.json({ ok: true, emergencyStopped: false }); }
  catch { res.status(500).json({ error: 'Internal error' }); }
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

/** Step 8.2 query-matrix visibility — which queries are productive vs. wasted so a future run
 * can prioritize/skip accordingly. */
router.get('/engine/queries', async (req, res) => {
  try {
    const [stats, queries] = await Promise.all([getQueryStats(), listQueries({ status: req.query.status })]);
    res.json({ stats, queries });
  } catch { res.status(500).json({ error: 'Internal error' }); }
});

/** Step 8.7 — read-only preview of what a periodic refresh would touch (no network calls, no
 * cost). Actually running a refresh re-fetches real external sites, so — same as the live-run
 * route — there's no "run refresh now" trigger here; see engine/refresh.js and
 * ENGINE-RUNBOOK.md. */
router.get('/engine/refresh-candidates', async (req, res) => {
  try {
    const { listRefreshCandidates } = await import('../../engine/refresh.js');
    const candidates = await listRefreshCandidates(Number(req.query.limit) || 500);
    res.json({ candidates, count: candidates.length });
  } catch (err) {
    console.error('[admin] refresh candidates error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** (Re)generates the query matrix into engine_queries — no network call, no cost, safe to run
 * any time; existing rows keep their run history (see upsertQueryMatrix). */
router.post('/engine/queries/sync', async (_req, res) => {
  try {
    const { buildQueryMatrixDetailed, queryMatrixSize } = await import('../../engine/discovery/queryMatrix.js');
    const { upsertQueryMatrix } = await import('../store/engineQueryStore.js');
    const matrix = buildQueryMatrixDetailed();
    await upsertQueryMatrix(matrix);
    res.json({ ok: true, total: matrix.length, expectedTotal: queryMatrixSize() });
  } catch (err) {
    console.error('[admin] query matrix sync error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
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

/** GET /api/admin/property-events — 10.5 site-wide aggregate (views/clicks/shares/favorites
 * across every property, plus a top-10-by-views list) for the property-rental world, distinct
 * from the /analytics route above (that one is the pre-pivot flight/agent-deals analytics). */
router.get('/property-events', async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 30, 90);
    const data = await getSiteEventStats({ days });
    res.json(data);
  } catch (err) {
    console.error('[admin] property-events error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** 10.6 — review moderation queue: reports > 0, not already removed. Admin can hide (soft,
 * reversible), restore, or remove (soft — status='removed', row kept for the report history). */
router.get('/reviews/reported', async (req, res) => {
  try {
    const reviews = await listReportedReviews();
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

router.post('/reviews/:id/hide', async (req, res) => {
  try { await setReviewStatus(req.params.id, 'hidden'); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.post('/reviews/:id/restore', async (req, res) => {
  try { await setReviewStatus(req.params.id, 'visible'); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.delete('/reviews/:id', async (req, res) => {
  try { await setReviewStatus(req.params.id, 'removed'); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

/** 10.8: "report incorrect info" queue — property *data* flags, not reviews. */
router.get('/info-reports', async (req, res) => {
  try { res.json({ reports: await listInfoReports() }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

router.delete('/info-reports/:id', async (req, res) => {
  try { await dismissInfoReport(req.params.id); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ error: 'Internal error' }); }
});

export default router;
