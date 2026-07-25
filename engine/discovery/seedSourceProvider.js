import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, FetchSkippedError } from '../fetcher/pageFetcher.js';
import { collectOutboundLinks, collectSameDomainLinks } from './discoveryEngine.js';

// How many same-domain "detail page" links to follow, per seed, when the seed page itself has no
// direct external links — real-world tourism-directory pages are near-universally structured as
// a listing page (links only to same-domain detail pages) + N detail pages (each linking out to
// the actual business's own site) — see DECISIONS.md for the concrete example that motivated this.
const MAX_DETAIL_PAGES_PER_SEED = 8;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_FILE = path.join(__dirname, 'seedSources.json');

/**
 * SeedSourceProvider (Step 8.1, "מימוש משני — בלי ספק חיצוני"): crawls a human-curated list of
 * public directory pages (regional tourism councils, kibbutz/moshav "accommodation in the
 * settlement" pages) that publish outbound links to independent owner sites of their own accord,
 * and mines those pages for candidate zimmer/villa sites via the same collectOutboundLinks used
 * for "links from an already-scraped site" — same mechanism, different starting point.
 *
 * Reuses the real fetcher (robots.txt, rate limiting, hard-block list, 30-day HTML cache) — a
 * seed page is fetched exactly like any other page in the pipeline, no special-cased bypass.
 *
 * Returns [] and does nothing if engine/discovery/seedSources.json has no entries yet (ships
 * empty on purpose — see that file's _readme).
 */
export function loadSeedSources() {
  try {
    const raw = JSON.parse(fs.readFileSync(SEEDS_FILE, 'utf8'));
    return Array.isArray(raw.seeds) ? raw.seeds : [];
  } catch {
    return [];
  }
}

export async function discoverFromSeeds(browser, { seeds = loadSeedSources() } = {}) {
  const discovered = new Map(); // siteKey -> { url, domain, fromSeed }
  const skipped = [];

  for (const seed of seeds) {
    let fetched;
    try {
      fetched = await fetchPage(seed.url, { browser });
    } catch (err) {
      if (err instanceof FetchSkippedError) {
        skipped.push({ url: seed.url, reason: err.reason });
        continue;
      }
      // Never swallow the real error behind a generic label — the caller needs the actual
      // exception (name/message/stack) to tell a genuine bug apart from a slow/unreachable site.
      skipped.push({ url: seed.url, reason: 'fetch_error', errorName: err.name, errorMessage: err.message });
      continue;
    }
    const links = collectOutboundLinks(fetched.html, seed.url);
    for (const link of links) {
      if (!discovered.has(link.siteKey)) discovered.set(link.siteKey, { ...link, fromSeed: seed.url });
    }

    // Real tourism-directory pages are near-universally a listing page (links only to same-domain
    // detail pages) + N detail pages (each linking out to the business's own site) — a bare
    // regional-council homepage almost never links a business's site directly. Only bother with
    // this second hop when the seed page itself yielded nothing, to keep politeness/rate-limit
    // cost down on seeds that already work in one hop.
    if (links.length === 0) {
      const detailUrls = collectSameDomainLinks(fetched.html, seed.url, { limit: MAX_DETAIL_PAGES_PER_SEED });
      for (const detailUrl of detailUrls) {
        let detailFetched;
        try {
          detailFetched = await fetchPage(detailUrl, { browser });
        } catch (err) {
          if (err instanceof FetchSkippedError) {
            skipped.push({ url: detailUrl, reason: err.reason, viaSeed: seed.url });
          } else {
            skipped.push({ url: detailUrl, reason: 'fetch_error', errorName: err.name, errorMessage: err.message, viaSeed: seed.url });
          }
          continue;
        }
        const detailLinks = collectOutboundLinks(detailFetched.html, detailUrl);
        for (const link of detailLinks) {
          if (!discovered.has(link.siteKey)) discovered.set(link.siteKey, { ...link, fromSeed: seed.url, viaDetailPage: detailUrl });
        }
      }
    }
  }

  return { sites: [...discovered.values()], skipped };
}
