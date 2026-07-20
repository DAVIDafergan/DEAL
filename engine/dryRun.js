import 'dotenv/config';
import { startFixtureServers, stopFixtureServers, FIXTURE_SITES } from './fixtures/fixtureServer.js';
import { LocalFixtureSearchProvider } from './discovery/searchProvider.js';
import { buildQueryMatrix } from './discovery/queryMatrix.js';
import { runPipeline } from './pipeline.js';
import { connectWithRetry } from '../core/db/index.js';

/**
 * Runs the full Step 3 pipeline against LOCAL fixture sites only (engine/fixtures/sites/) —
 * never the real internet. This is the command referenced throughout SESSION-REPORT.md:
 *
 *   node engine/dryRun.js
 *
 * What it proves end-to-end: query matrix generation, domain discovery+dedup, a real
 * Playwright fetch (against localhost, not the internet) with robots.txt enforcement and
 * rate-limiting, LLM-shaped extraction (mock, since no ANTHROPIC_API_KEY is configured here) with
 * schema validation + retry + description-copy rejection, dedup/merge of the same property found
 * on two different "sites", loading into `properties` with the confidence-gate applied, and the
 * automatic Step 5.5 compliance report.
 */
async function main() {
  await connectWithRetry();
  console.log('[dryRun] Starting local fixture servers (never real internet)...');
  const servers = await startFixtureServers();
  for (const s of servers) console.log(`  - ${s.siteName} -> ${s.url}`);

  // "Ground truth" for the 6 real fixture sites, standing in for what a real LLM extractor
  // would infer from reading the page — the mock extractor (no API key in this environment)
  // can't understand Hebrew prose on its own. `sparse-page` deliberately gets NO hint, so it
  // exercises the "extraction rejected — missing required fields" path.
  const siteHints = {
    // mockDescription is a *literal 9-word copy* of a sentence from this fixture's own HTML —
    // deliberately, to prove the pipeline actually rejects a copied description end-to-end
    // (not just in the standalone descriptionCheck.js unit test). See extractProperty.js.
    [`localhost:${FIXTURE_SITES['galilee-zimmer'].port}`]: {
      name: 'צימר האגמים', property_type: 'zimmer', region: 'north', city: 'ראש פינה', phone: '046931234',
      mockDescription: 'צימר האגמים ממוקם על גבעה בלב הגליל העליון',
    },
    // Clean, original description (no 8-word run copied from the source) — proves the pass path too.
    [`localhost:${FIXTURE_SITES['carmel-villa'].port}`]: {
      name: 'וילת האורנים', property_type: 'villa', region: 'carmel', city: 'עין הוד',
      mockDescription: 'וילה מרווחת עם בריכה מחוממת, אידיאלית לחופשה משפחתית שקטה',
    },
    [`localhost:${FIXTURE_SITES['jerusalem-suite'].port}`]: { name: 'סוויטת הרי יהודה', property_type: 'suite', region: 'jerusalem', city: 'ירושלים' },
    [`localhost:${FIXTURE_SITES['south-cottage'].port}`]: { name: 'בקתת המדבר', property_type: 'cottage', region: 'south', city: 'מצפה רמון' },
    // Same phone as galilee-zimmer on purpose — proves the Deduplicator merges instead of duplicating.
    [`localhost:${FIXTURE_SITES['golan-zimmer-update'].port}`]: { name: 'צימר האגמים', property_type: 'zimmer', region: 'golan', city: 'ראש פינה', phone: '046931234' },
    // 'sparse-page': intentionally no hint.
    // 'robots-blocked-site': should never reach the extractor — robots.txt should stop it first.
  };

  const searchProvider = new LocalFixtureSearchProvider({
    'צימר': [{ url: servers.find((s) => s.siteName === 'galilee-zimmer').url, title: 'צימר האגמים', snippet: '' }],
    'הגליל': [{ url: servers.find((s) => s.siteName === 'galilee-zimmer').url, title: 'צימר האגמים', snippet: '' }],
    'הגולן': [{ url: servers.find((s) => s.siteName === 'golan-zimmer-update').url, title: 'צימר האגמים - גולן', snippet: '' }],
    'הכרמל': [{ url: servers.find((s) => s.siteName === 'carmel-villa').url, title: 'וילת האורנים', snippet: '' }],
    'ירושלים': [{ url: servers.find((s) => s.siteName === 'jerusalem-suite').url, title: 'סוויטת הרי יהודה', snippet: '' }],
    'הדרום': [{ url: servers.find((s) => s.siteName === 'south-cottage').url, title: 'בקתת המדבר', snippet: '' }],
    'וילה': [
      { url: servers.find((s) => s.siteName === 'sparse-page').url, title: 'ברוכים הבאים', snippet: '' },
      { url: servers.find((s) => s.siteName === 'robots-blocked-site').url, title: 'חסום', snippet: '' },
      // A portal-shaped domain that should be filtered OUT of siteDomains entirely.
      { url: 'http://zap-index.example/list', title: 'מדריך צימרים', snippet: '' },
    ],
  });

  const queries = buildQueryMatrix();
  console.log(`[dryRun] Query matrix: ${queries.length} queries generated.`);

  console.log('[dryRun] Running pipeline...');
  const result = await runPipeline({ queries, searchProvider, siteHints, mode: 'dry_run' });

  console.log('\n=== RUN STATS ===');
  console.table(result.stats);
  console.log('\n=== LOADED PROPERTIES ===');
  console.table(result.loadedResults);
  console.log('\n=== REJECTED PAGES ===');
  console.table(result.rejectedPages);
  console.log('\n=== COMPLIANCE REPORT ===');
  console.log(JSON.stringify(result.complianceReport, null, 2));
  console.log('\n=== LLM COST (session) ===');
  console.log(result.llmCost);
  console.log(`\n[dryRun] engine_runs.id = ${result.runId}`);

  await stopFixtureServers(servers);
  console.log('[dryRun] Fixture servers stopped. Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[dryRun] FAILED:', err);
  process.exit(1);
});
