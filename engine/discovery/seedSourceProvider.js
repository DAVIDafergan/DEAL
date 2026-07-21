import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchPage, FetchSkippedError } from '../fetcher/pageFetcher.js';
import { collectOutboundLinks } from './discoveryEngine.js';

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
      skipped.push({ url: seed.url, reason: 'fetch_error' });
      continue;
    }
    const links = collectOutboundLinks(fetched.text, seed.url);
    for (const link of links) {
      if (!discovered.has(link.siteKey)) discovered.set(link.siteKey, { ...link, fromSeed: seed.url });
    }
  }

  return { sites: [...discovered.values()], skipped };
}
