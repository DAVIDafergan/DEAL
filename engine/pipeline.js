import { chromium } from 'playwright';
import { runDiscovery } from './discovery/discoveryEngine.js';
import { fetchPage, FetchSkippedError } from './fetcher/pageFetcher.js';
import { pruneExpiredCache } from './fetcher/htmlCache.js';
import { extractProperty } from './extractor/extractProperty.js';
import { hasCopiedPhrase } from './extractor/descriptionCheck.js';
import { loadProperty } from './loader/loader.js';
import { getSessionCost, resetSessionCost } from './extractor/costLogger.js';
import { startEngineRun, finishEngineRun } from '../server/store/engineRunStore.js';

/**
 * Proves (doesn't just assert) that known OTA/platform domains are refused before any network
 * call — the hard-block check in fetchPage runs before robots.txt/cache/Playwright, so passing
 * browser:null here would throw a *different* error if that check were ever bypassed.
 */
async function verifyHardBlockSample() {
  const sample = ['booking.com', 'airbnb.com', 'facebook.com', 'instagram.com', 'zimmer.co.il'];
  const results = [];
  for (const domain of sample) {
    try {
      await fetchPage(`https://${domain}/`, { browser: null });
      results.push({ domain, blocked: false, note: 'DID NOT BLOCK — INVESTIGATE' });
    } catch (err) {
      results.push({ domain, blocked: err instanceof FetchSkippedError && err.reason === 'hard_blocked_domain' });
    }
  }
  return results;
}

/**
 * Full Step 3 pipeline: Discovery -> Fetcher -> Extractor -> Deduplicator -> Loader, plus the
 * Step 5.5 automatic compliance report, all in one run logged to `engine_runs`.
 *
 * `siteHints` maps a site's `siteKey` (url.host) to context for the Extractor — in production,
 * with a real ANTHROPIC_API_KEY, this is unused (the LLM reads the page itself). In dry-run
 * (no key, mock extractor), the mock can't understand Hebrew prose, so hints stand in for what
 * a real LLM would have inferred — see engine/dryRun.js and SESSION-REPORT.md.
 */
export async function runPipeline({ queries, searchProvider, siteHints = {}, mode = 'dry_run' }) {
  resetSessionCost();
  const prunedCacheFiles = pruneExpiredCache();
  const runId = await startEngineRun(mode);

  const stats = {
    domainsDiscovered: 0, pagesFetched: 0, pagesExtracted: 0, pagesRejected: 0,
    propertiesCreated: 0, propertiesUpdated: 0, propertiesQueuedForReview: 0,
    domainsSkippedRobots: 0, domainsSkippedBlocklist: 0,
  };
  const complianceReport = {
    imagesDownloaded: 0,
    descriptionOverlapChecks: [],
    domainsSkippedRobots: [],
    domainsSkippedBlocklist: [],
    domainsSkippedHardBlocked: [],
    hardBlockedDomainsVerified: [],
    cacheFilesPruned: prunedCacheFiles,
  };
  const loadedThisRun = [];
  const rejectedPages = [];
  const loadedResults = [];

  let browser;
  try {
    const discovery = await runDiscovery(queries, searchProvider);
    stats.domainsDiscovered = discovery.sites.length;

    browser = await chromium.launch({ args: ['--no-sandbox'] });

    for (const site of discovery.sites) {
      let fetched;
      try {
        fetched = await fetchPage(site.url, { browser });
        stats.pagesFetched += 1;
      } catch (err) {
        if (err instanceof FetchSkippedError) {
          if (err.reason === 'robots_disallowed') {
            stats.domainsSkippedRobots += 1;
            complianceReport.domainsSkippedRobots.push(site.domain);
          } else if (err.reason === 'blocklisted_domain') {
            stats.domainsSkippedBlocklist += 1;
            complianceReport.domainsSkippedBlocklist.push(site.domain);
          } else if (err.reason === 'hard_blocked_domain') {
            complianceReport.domainsSkippedHardBlocked.push(site.domain);
          }
          continue;
        }
        rejectedPages.push({ site: site.siteKey, reason: 'fetch_error', detail: err.message });
        stats.pagesRejected += 1;
        continue;
      }

      // Structural guarantee, asserted here so it's visible in the report rather than merely
      // implied by code shape: fetchPage/extractFromHtml only ever return image *URLs*, the
      // bytes are never requested — see engine/fetcher/pageFetcher.js.
      complianceReport.imagesDownloaded += 0;

      const hints = siteHints[site.siteKey] || {};
      const extraction = await extractProperty({ pageText: fetched.text, sourceUrl: site.url, hints });

      if (!extraction.ok) {
        stats.pagesRejected += 1;
        rejectedPages.push({ site: site.siteKey, reason: extraction.reason, detail: extraction.errors });
        continue;
      }
      stats.pagesExtracted += 1;

      if (extraction.descriptionRejectedForCopying) {
        complianceReport.descriptionOverlapChecks.push({ site: site.siteKey, result: 'rejected_copied_text' });
      } else if (extraction.data.description) {
        complianceReport.descriptionOverlapChecks.push({
          site: site.siteKey,
          result: hasCopiedPhrase(extraction.data.description, fetched.text) ? 'FAIL' : 'pass',
        });
      }

      const loadResult = await loadProperty(
        extraction.data,
        { sourceUrl: site.url, imageUrls: fetched.imageUrls },
        loadedThisRun
      );
      if (loadResult.action === 'created') stats.propertiesCreated += 1;
      else stats.propertiesUpdated += 1;
      if (loadResult.confidence < 60) stats.propertiesQueuedForReview += 1;
      loadedResults.push({ site: site.siteKey, ...loadResult });
    }

    complianceReport.hardBlockedDomainsVerified = await verifyHardBlockSample();

    const cost = getSessionCost();
    await finishEngineRun(runId, {
      ...stats,
      status: 'completed',
      llmCostUsd: cost.costUsd,
      complianceReport: { ...complianceReport, llmCost: cost },
    });
    return { runId, stats, complianceReport, rejectedPages, loadedResults, llmCost: cost };
  } catch (err) {
    await finishEngineRun(runId, { ...stats, status: 'failed', errorMessage: err.message });
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}
