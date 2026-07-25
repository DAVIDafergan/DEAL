import { isAllowedByRobots, USER_AGENT } from './robotsCheck.js';
import { acquireSlot, releaseSlot } from './rateLimiter.js';
import { getCached, setCached } from './htmlCache.js';
import { isHardBlockedDomain } from '../../core/compliance/blockedDomains.js';
import { isDomainBlocked, normalizeDomain } from '../../core/compliance/blocklist.js';

const FETCH_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

export class FetchSkippedError extends Error {
  constructor(reason) {
    super(`Fetch skipped: ${reason}`);
    this.reason = reason;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Lightweight regex-based extraction (no DOM-parsing dependency) — meta tags, JSON-LD blocks,
 * image *URLs only* (never downloaded — see the caller), and phone/WhatsApp contact links.
 */
function extractFromHtml(html, baseUrl) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Two passes: `name=` (standard meta, e.g. "description") and `property=` (Open Graph, e.g.
  // "og:title") — real pages use both, and og: tags in particular are a strong, structured
  // signal for name/description that the RuleBasedExtractor leans on (see ruleBasedExtractor.js).
  // Each pass also tries content-before-name/property attribute order, since real markup isn't
  // always written in the same order.
  const metaTags = {};
  for (const attr of ['name', 'property']) {
    const forward = new RegExp(`<meta[^>]+${attr}=["']([^"']+)["'][^>]+content=["']([^"']*)["']`, 'gi');
    const backward = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+${attr}=["']([^"']+)["']`, 'gi');
    for (const m of html.matchAll(forward)) metaTags[m[1]] = m[2];
    for (const m of html.matchAll(backward)) if (!(m[2] in metaTags)) metaTags[m[2]] = m[1];
  }

  const imageUrls = [...new Set(
    [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
      .map((m) => { try { return new URL(m[1], baseUrl).toString(); } catch { return null; } })
      .filter(Boolean)
  )];

  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
    .filter(Boolean);

  const phoneMatches = [...new Set([...text.matchAll(/0[23489]-?\d{7}|05\d-?\d{7}/g)].map((m) => m[0]))];
  const whatsappLinks = [...new Set(
    [...html.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=)(\d+)/gi)].map((m) => m[1])
  )];

  return { text, metaTags, imageUrls, jsonLd, phoneMatches, whatsappLinks };
}

/**
 * Fetches and extracts one page, with every Step 3.2 / 5.5 safety rule enforced in code:
 * hard-blocked platform domains refused before any network call, DB blocklist checked,
 * robots.txt honored, per-domain rate limiting, 30s timeout with backoff retry, local cache.
 * Never downloads images/video — only records their URLs (extractFromHtml above).
 *
 * `robotsFetchImpl` lets callers (dry-run tests) redirect the robots.txt check to a local
 * fixture server instead of the real internet.
 */
export async function fetchPage(url, { browser, useCache = true, robotsFetchImpl } = {}) {
  const parsed = new URL(url);
  // `domain` (hostname only) is for compliance matching — blocklist/hard-block rules are about
  // real registrable domains, where a port number is meaningless. `siteKey` (host, i.e.
  // hostname:port when present) is for rate-limiting/cache identity — two different ports really
  // are two different sites for crawl-politeness purposes (this also matters for local dry-run
  // fixtures, which simulate distinct sites as distinct localhost ports).
  const domain = normalizeDomain(parsed.hostname);
  const siteKey = parsed.host;

  if (isHardBlockedDomain(domain)) throw new FetchSkippedError('hard_blocked_domain');
  if (await isDomainBlocked(domain)) throw new FetchSkippedError('blocklisted_domain');

  if (useCache) {
    const cached = getCached(url);
    if (cached) return { url, domain, fromCache: true, html: cached, ...extractFromHtml(cached, url) };
  }

  const allowed = robotsFetchImpl ? await isAllowedByRobots(url, robotsFetchImpl) : await isAllowedByRobots(url);
  if (!allowed) throw new FetchSkippedError('robots_disallowed');

  await acquireSlot(siteKey);
  try {
    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let page;
      try {
        page = await browser.newPage({ userAgent: USER_AGENT });
        // 'networkidle' (500ms with zero in-flight requests) sounds right for "page fully
        // loaded" but real-world sites almost never satisfy it — analytics beacons, chat
        // widgets, and accessibility-tool polling keep the network "busy" indefinitely, so the
        // page never goes idle even though it's fully rendered and scrapeable. Verified against
        // real regional-council sites: curl gets a clean 200 from all of them, but 'networkidle'
        // timed out on 12/13. 'domcontentloaded' plus the scroll-triggered lazy-load pass below
        // is what every other page-scraping tool in this space actually uses.
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: FETCH_TIMEOUT_MS });
        await page.evaluate(() => new Promise((resolve) => {
          let total = 0;
          const step = 400;
          const timer = setInterval(() => {
            window.scrollBy(0, step);
            total += step;
            if (total >= document.body.scrollHeight) { clearInterval(timer); resolve(); }
          }, 80);
        }));
        const html = await page.content();
        setCached(url, html);
        // `html` (raw) is returned alongside `text` (tags stripped) — discovery's
        // collectOutboundLinks/collectSameDomainLinks need real href="..." attributes to match
        // against, which `text` structurally cannot contain (all tags are stripped out of it).
        return { url, domain, fromCache: false, html, ...extractFromHtml(html, url) };
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) await sleep(1000 * 2 ** attempt);
      } finally {
        if (page) await page.close().catch(() => {});
      }
    }
    throw lastError;
  } finally {
    releaseSlot(siteKey);
  }
}
