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

  const metaTags = {};
  for (const m of html.matchAll(/<meta[^>]+name=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi)) {
    metaTags[m[1]] = m[2];
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
    if (cached) return { url, domain, fromCache: true, ...extractFromHtml(cached, url) };
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
        await page.goto(url, { waitUntil: 'networkidle', timeout: FETCH_TIMEOUT_MS });
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
        return { url, domain, fromCache: false, ...extractFromHtml(html, url) };
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
