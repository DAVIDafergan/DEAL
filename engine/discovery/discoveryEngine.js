import { isHardBlockedDomain } from '../../core/compliance/blockedDomains.js';
import { normalizeDomain } from '../../core/compliance/blocklist.js';

// Extra portal/index/blog keyword heuristic beyond the hard-blocked OTA list — real-world
// filtering would be more sophisticated (page structure, listing-count heuristics); this is a
// reasonable-effort classifier documented as a known simplification (see SESSION-REPORT.md).
const PORTAL_KEYWORDS = ['index', 'list', 'compare', 'guide', 'yellowpages', 'zap', 'walla', 'ynet', 'mako'];

function looksLikePortal(domain) {
  if (isHardBlockedDomain(domain)) return true;
  return PORTAL_KEYWORDS.some((kw) => domain.includes(kw));
}

/**
 * `siteKey` = url.host (hostname:port when a non-default port is present), `domain` =
 * normalizeDomain(hostname). They're the same for any real site (no meaningful port), but
 * differ for local dry-run fixtures (each simulated "site" runs on its own localhost port).
 * Discovery groups/dedups by siteKey — see engine/fetcher/pageFetcher.js for the identical
 * reasoning on the fetch side.
 */
function parseSite(url) {
  try {
    const parsed = new URL(url);
    return { siteKey: parsed.host, domain: normalizeDomain(parsed.hostname) };
  } catch {
    return null;
  }
}

/**
 * Discovery (Step 3.1): runs the query matrix through a SearchProvider, extracts+dedups sites,
 * and splits them into candidate single-property sites vs. portals/indexes (kept separately,
 * per spec, as a source of further links rather than crawled directly).
 */
export async function runDiscovery(queries, searchProvider) {
  const sites = new Map(); // siteKey -> { url, domain }
  const portalDomains = new Set();
  let totalResults = 0;

  for (const query of queries) {
    const results = await searchProvider.search(query);
    totalResults += results.length;
    for (const result of results) {
      const parsed = parseSite(result.url);
      if (!parsed) continue;
      if (looksLikePortal(parsed.domain)) portalDomains.add(parsed.domain);
      else if (!sites.has(parsed.siteKey)) sites.set(parsed.siteKey, { url: result.url, domain: parsed.domain });
    }
  }

  return {
    queriesRun: queries.length,
    totalResults,
    sites: [...sites.entries()].map(([siteKey, v]) => ({ siteKey, ...v })),
    portalDomains: [...portalDomains],
  };
}

/**
 * "מכל אתר שנסרק, איסוף קישורים יוצאים לאתרי צימרים נוספים" — called by the pipeline after the
 * Fetcher retrieves a page's HTML, feeding newly-discovered sites back into the crawl queue.
 * Deliberately dumb regex link extraction (no DOM parsing) — the Fetcher already did the real
 * page load via Playwright; this just mines additional candidate sites from what it got back.
 */
export function collectOutboundLinks(html, baseUrl) {
  const found = new Map(); // siteKey -> url
  const base = parseSite(baseUrl);
  const hrefPattern = /href=["']([^"']+)["']/gi;
  let match;
  while ((match = hrefPattern.exec(html))) {
    try {
      const resolvedUrl = new URL(match[1], baseUrl).toString();
      const parsed = parseSite(resolvedUrl);
      if (parsed && parsed.siteKey !== base?.siteKey && !looksLikePortal(parsed.domain) && !found.has(parsed.siteKey)) {
        found.set(parsed.siteKey, resolvedUrl);
      }
    } catch {
      // ignore malformed hrefs (mailto:, javascript:, relative fragments, etc.)
    }
  }
  return [...found.entries()].map(([siteKey, url]) => ({ siteKey, url }));
}
