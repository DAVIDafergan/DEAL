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
  const perQueryResults = new Map(); // query text -> result count (Step 8.2 query-productivity tracking)

  for (const query of queries) {
    const results = await searchProvider.search(query);
    perQueryResults.set(query, results.length);
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
    perQueryResults,
  };
}

// Matches only <a ...href="...">, not <link href="..."> (stylesheets), not other tags that
// happen to carry an href-like attribute — the original naive `href=` regex here (matching in
// ANY tag) was picking up CSS/font/CDN resource URLs as "candidate sites", which then correctly
// failed extraction for the obvious reason that a .css file isn't a webpage — confirmed on a
// real crawl (cdnjs.cloudflare.com/.../all.min.css got treated as candidate #0). `[^>]*?` allows
// other attributes (class, target, rel, ...) to appear before href within the same <a> tag.
const ANCHOR_HREF_PATTERN = /<a\s[^>]*?href=["']([^"']+)["']/gi;

// Defensive second layer even within <a> tags — some sites do put a direct asset link in an
// anchor (e.g. a "download brochure" PDF link).
const STATIC_ASSET_EXTENSION = /\.(css|js|mjs|json|xml|ico|png|jpe?g|gif|svg|webp|woff2?|ttf|eot|pdf|zip|mp4|mp3)(\?|#|$)/i;

function isNavigablePage(url) {
  if (!/^https?:$/.test(url.protocol)) return false; // excludes mailto:, tel:, javascript:, etc.
  return !STATIC_ASSET_EXTENSION.test(url.pathname);
}

/**
 * "מכל אתר שנסרק, איסוף קישורים יוצאים לאתרי צימרים נוספים" — called by the pipeline after the
 * Fetcher retrieves a page's HTML, feeding newly-discovered sites back into the crawl queue.
 * Deliberately dumb regex link extraction (no DOM parsing) — the Fetcher already did the real
 * page load via Playwright; this just mines additional candidate sites from what it got back.
 * Must be called with raw HTML (href attributes don't survive HTML-tag stripping — see
 * engine/fetcher/pageFetcher.js's `html` field, not its `text` field).
 */
export function collectOutboundLinks(html, baseUrl) {
  const found = new Map(); // siteKey -> url
  const base = parseSite(baseUrl);
  let match;
  while ((match = ANCHOR_HREF_PATTERN.exec(html))) {
    try {
      const resolvedUrl = new URL(match[1], baseUrl);
      if (!isNavigablePage(resolvedUrl)) continue;
      const parsed = parseSite(resolvedUrl.toString());
      if (parsed && parsed.siteKey !== base?.siteKey && !looksLikePortal(parsed.domain) && !found.has(parsed.siteKey)) {
        found.set(parsed.siteKey, resolvedUrl.toString());
      }
    } catch {
      // ignore malformed hrefs (relative fragments that don't resolve, etc.)
    }
  }
  return [...found.entries()].map(([siteKey, url]) => ({ siteKey, url }));
}

/**
 * Companion to collectOutboundLinks, for the very common "business directory" page shape a
 * tourism-cluster/regional-council directory actually uses in practice: a category/listing page
 * that links to same-domain detail pages (one per business), each of which then links out to the
 * business's own external website — never a direct external link from the category page itself.
 * Same-page, same-domain, distinct-path links only (never revisits the page itself). Capped by
 * `limit` — this exists to go one hop deeper into a *seed*, not to crawl an entire directory site.
 */
export function collectSameDomainLinks(html, baseUrl, { limit = 15 } = {}) {
  const base = parseSite(baseUrl);
  const basePathname = new URL(baseUrl).pathname;
  const found = new Map(); // path -> url
  let match;
  while ((match = ANCHOR_HREF_PATTERN.exec(html)) && found.size < limit) {
    try {
      const resolvedUrl = new URL(match[1], baseUrl);
      if (!isNavigablePage(resolvedUrl)) continue;
      const parsed = parseSite(resolvedUrl.toString());
      if (!parsed || parsed.siteKey !== base?.siteKey) continue;
      if (resolvedUrl.pathname === basePathname) continue; // skip self-links/anchors
      if (!found.has(resolvedUrl.pathname)) found.set(resolvedUrl.pathname, resolvedUrl.toString());
    } catch {
      // ignore malformed hrefs
    }
  }
  return [...found.values()];
}
