import 'dotenv/config';
import { chromium } from 'playwright';
import { discoverFromSeeds, loadSeedSources } from './discovery/seedSourceProvider.js';
import { classifySources } from './discovery/sourceClassifier.js';
import { buildQueryMatrix } from './discovery/queryMatrix.js';
import { fetchPage } from './fetcher/pageFetcher.js';
import { extractProperty } from './extractor/extractProperty.js';
import { runPipeline } from './pipeline.js';
import { normalizeDomain } from '../core/compliance/blocklist.js';
import { connectWithRetry, getPool } from '../core/db/index.js';

/**
 * Real, keyless, real-internet live run — engine/discovery/seedSources.json -> SeedSourceProvider
 * -> real single site(s) -> RuleBasedExtractor -> loader. No SEARCH_API_KEY, no ANTHROPIC_API_KEY.
 *
 *   node engine/liveRun.js --single     # discover candidates, run ONE end-to-end, verbose report
 *   node engine/liveRun.js --round=10   # discover candidates, run up to 10 through the full pipeline
 *
 * Every property this loads lands in `properties` with status='unclaimed' (review queue) — never
 * auto-published; that gate lives in server/store/propertyStore.js's upsertAutoCollectedProperty
 * and is untouched here.
 */
const args = process.argv.slice(2);
const singleMode = args.includes('--single');
const roundArg = args.find((a) => a.startsWith('--round='));
const roundSize = singleMode ? 1 : (roundArg ? Number(roundArg.split('=')[1]) : 10);

async function main() {
  await connectWithRetry();

  const seeds = loadSeedSources();
  console.log(`[liveRun] ${seeds.length} seed source(s) loaded from engine/discovery/seedSources.json`);
  if (seeds.length === 0) {
    console.error('[liveRun] FAILED: seedSources.json has no seeds — nothing to discover from.');
    process.exit(1);
  }

  console.log('[liveRun] Launching browser for seed discovery...');
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  console.log('[liveRun] Crawling seed pages for outbound candidate site links...');
  const { sites: discovered, skipped } = await discoverFromSeeds(browser);
  console.log(`[liveRun] Discovery result: ${discovered.length} candidate site(s), ${skipped.length} seed(s) skipped.`);
  if (skipped.length > 0) console.log('[liveRun] Skipped seeds:', JSON.stringify(skipped, null, 2));

  if (discovered.length === 0) {
    console.error('[liveRun] FAILED at Discovery: 0 candidate sites found from any seed. Nothing to fetch.');
    await browser.close();
    process.exit(1);
  }

  const withDomain = discovered.map((s) => ({ ...s, domain: s.domain || normalizeDomain(new URL(s.url).hostname) }));

  console.log('[liveRun] Classifying candidates (single_property / portal / irrelevant)...');
  const classifications = await classifySources(withDomain, { browser });
  const approved = withDomain.filter((_, i) => classifications[i].classification === 'single_property');
  console.log(`[liveRun] ${approved.length}/${withDomain.length} classified single_property. Classifications:`);
  console.table(withDomain.map((s, i) => ({ url: s.url, ...classifications[i] })));

  if (approved.length === 0) {
    console.error('[liveRun] FAILED at Discovery/Classification: 0 sites classified single_property. Nothing to fetch.');
    await browser.close();
    process.exit(1);
  }

  const targets = approved.slice(0, roundSize);

  if (singleMode) {
    // Tries candidates in order until one actually clears Fetcher+Extractor — same behavior the
    // real pipeline already has in its main loop (a rejected page doesn't stop the run, it just
    // moves on to the next site). Every attempt's outcome is printed, not just the final one.
    const MAX_ATTEMPTS = Math.min(approved.length, 30);
    let success = null;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      const site = approved[i];
      console.log(`\n=== ATTEMPT ${i + 1}/${MAX_ATTEMPTS}: ${site.url} ===`);

      let fetched;
      try {
        fetched = await fetchPage(site.url, { browser });
      } catch (err) {
        console.log(`  Fetcher FAILED — ${err.name}: ${err.message}`);
        continue;
      }
      console.log(`  Fetcher OK — fromCache=${fetched.fromCache}, text length=${fetched.text.length}, images=${fetched.imageUrls.length}`);

      let extraction;
      try {
        extraction = await extractProperty({
          pageText: fetched.text, sourceUrl: site.url,
          metaTags: fetched.metaTags, jsonLd: fetched.jsonLd,
          phoneMatches: fetched.phoneMatches, whatsappLinks: fetched.whatsappLinks,
        });
      } catch (err) {
        console.log(`  Extractor FAILED (uncaught) — ${err.name}: ${err.message}`);
        continue;
      }
      if (!extraction.ok) {
        console.log(`  Extractor REJECTED — reason=${extraction.reason}, errors=${JSON.stringify(extraction.errors)}`);
        continue;
      }
      console.log('  Extractor OK.');
      success = { site, fetched, extraction };
      break;
    }

    if (!success) {
      console.error(`\n[liveRun] FAILED: none of ${MAX_ATTEMPTS} candidates cleared Fetcher+Extractor.`);
      await browser.close();
      process.exit(1);
    }

    const { site, fetched, extraction } = success;
    console.log(`\n\n=== FULL REPORT FOR THE SUCCESSFUL SITE: ${site.url} ===\n`);

    console.log('--- 1. Fetcher ---');
    console.log('URL fetched:', site.url);
    console.log('From cache:', fetched.fromCache);
    console.log('HTML text (first 800 chars of visible text):\n', fetched.text.slice(0, 800));
    console.log('\nMeta tags found:', JSON.stringify(fetched.metaTags, null, 2));
    console.log('JSON-LD blocks found:', fetched.jsonLd.length, JSON.stringify(fetched.jsonLd, null, 2));
    console.log('Phone matches:', fetched.phoneMatches);
    console.log('WhatsApp links:', fetched.whatsappLinks);
    console.log('Image URLs found (not downloaded):', fetched.imageUrls.length);

    console.log('\n--- 2. Extractor ---');
    console.log('Used RuleBasedExtractor:', extraction.usedRuleBasedExtractor);
    console.log('Per-field extraction result:');
    for (const [field, value] of Object.entries(extraction.data)) {
      console.log(`  ${field}:`, JSON.stringify(value));
    }
    console.log('Description rejected for copying source text:', extraction.descriptionRejectedForCopying);

    console.log('\n--- 3. Loader ---');
    const { loadProperty } = await import('./loader/loader.js');
    let loadResult;
    try {
      loadResult = await loadProperty(extraction.data, { sourceUrl: site.url, imageUrls: fetched.imageUrls }, []);
    } catch (err) {
      console.error('[liveRun] FAILED at Loader.');
      console.error(err.stack);
      await browser.close();
      process.exit(1);
    }
    console.log('Loader result:', JSON.stringify(loadResult, null, 2));

    if (loadResult.action === 'rejected') {
      console.log(`\n[liveRun] Nothing saved — rejected at Loader (reason: ${loadResult.reason}).`);
    } else {
      const pool = getPool();
      const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [loadResult.id]);
      console.log('\n--- Row actually saved in `properties` (local DB) ---');
      console.log(JSON.stringify(rows[0], null, 2));
    }

    await browser.close();
    console.log('\n[liveRun] Single-site run complete.');
    process.exit(0);
  }

  // Multi-site round: reuse the real pipeline (Fetcher -> Extractor -> Loader) exactly as the
  // admin panel's live-run route does, just without going through the express route.
  await browser.close();
  console.log(`\n[liveRun] Running full pipeline on ${targets.length} site(s)...`);
  const result = await runPipeline({ queries: buildQueryMatrix(), searchProvider: null, mode: 'live', preDiscoveredSites: targets });

  console.log('\n=== RUN STATS ===');
  console.table(result.stats);
  console.log('\n=== LOADED PROPERTIES ===');
  console.table(result.loadedResults);
  console.log('\n=== REJECTED PAGES ===');
  console.table(result.rejectedPages);
  console.log('\n=== COMPLIANCE REPORT ===');
  console.log(JSON.stringify(result.complianceReport, null, 2));
  console.log(`\n[liveRun] engine_runs.id = ${result.runId}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[liveRun] UNCAUGHT FAILURE');
  console.error('Error name:', err.name);
  console.error('Message:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
