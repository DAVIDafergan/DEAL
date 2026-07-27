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

// 11.15 — a blind "every <img src> on the page" collector also picks up flag icons, social
// share/logo icons, and tracking pixels (facebook.com/tr) that aren't property photos at all —
// discovered when the admin review queue started showing an owner's own site logo and language-
// switcher flags instead of the actual property. Keyword/domain denylist, not a whitelist: a
// real photo URL can look like almost anything, but junk assets reliably share these markers.
const NON_PROPERTY_IMAGE_PATTERNS = [
  /\/flags?\//i, /\/icons?\//i, /logo/i, /favicon/i, /sprite/i,
  /like_icon|share_icon|social/i,
  /logo-facebook|logo-instagram|logo-youtube|logo-twitter/i,
  /\.svg(\?|$)/i,
  /facebook\.com\/tr\b/i, // Meta Pixel tracking beacon, not an image
  /fatfish\.co\.il/i, // third-party widget branding seen on several scraped directory sites
  /button/i, /banner[-_]?ad/i,
];

// 11.16 — the filename denylist above still let through UI chrome that isn't named like an
// icon at all: tiny thumbnails (nav arrows, star ratings) and header/footer images that repeat
// identically on every page of a site. Two more signals, neither requiring a download (fetcher
// never downloads images — see fetchPage below): the <img> tag's own declared width/height
// attributes, and whether the exact same URL has already turned up on another page of the same
// domain during this run (real property photos are page-specific; template chrome isn't).
const MIN_IMAGE_DIMENSION = 400;
const GALLERY_CLASS_PATTERN = /\b(gallery|slider|carousel|swiper|lightbox|photos?|property-image|listing-image)\b/i;

function isLikelyNonPropertyImage(url) {
  return NON_PROPERTY_IMAGE_PATTERNS.some((pattern) => pattern.test(url));
}

function getAttr(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'));
  return m ? m[1] : null;
}

function isTooSmall(attrs) {
  const w = getAttr(attrs, 'width');
  const h = getAttr(attrs, 'height');
  const wNum = w && /^\d+$/.test(w) ? Number(w) : null;
  const hNum = h && /^\d+$/.test(h) ? Number(h) : null;
  return (wNum !== null && wNum < MIN_IMAGE_DIMENSION) || (hNum !== null && hNum < MIN_IMAGE_DIMENSION);
}

// domain -> (image URL -> Set of distinct page URLs it has appeared on). Module-level so it
// accumulates across every page fetched in a crawl run, not just the current page.
const domainImageOccurrences = new Map();

function isRepeatedTemplateImage(domain, url, pageUrl) {
  let occ = domainImageOccurrences.get(domain);
  if (!occ) { occ = new Map(); domainImageOccurrences.set(domain, occ); }
  let pages = occ.get(url);
  if (!pages) { pages = new Set(); occ.set(url, pages); }
  pages.add(pageUrl);
  return pages.size > 1;
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

  const ogImageRaw = metaTags['og:image'] || metaTags['og:image:url'] || null;
  let ogImageAbs = null;
  if (ogImageRaw) { try { ogImageAbs = new URL(ogImageRaw, baseUrl).toString(); } catch { ogImageAbs = null; } }

  let domain;
  try { domain = normalizeDomain(new URL(baseUrl).hostname); } catch { domain = baseUrl; }

  const seenImages = new Set();
  const imageUrls = [];
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1];
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) continue;
    let abs;
    try { abs = new URL(srcMatch[1], baseUrl).toString(); } catch { continue; }
    if (seenImages.has(abs)) continue;
    seenImages.add(abs);

    // og:image and gallery-marked images are strong positive signals of a real property photo —
    // they skip the size/repeat vetoes below, but never the filename denylist (a site's logo can
    // just as easily be its og:image or sit inside a "gallery" div as a real photo can).
    if (isLikelyNonPropertyImage(abs)) continue;
    const isOg = abs === ogImageAbs;
    const looksLikeGallery = GALLERY_CLASS_PATTERN.test(getAttr(attrs, 'class') || '');
    const isLikelyReal = isOg || looksLikeGallery;
    if (!isLikelyReal && isTooSmall(attrs)) continue; // declared width/height under the min — thumbnail/icon, not a photo
    if (!isLikelyReal && isRepeatedTemplateImage(domain, abs, baseUrl)) continue; // seen on another page of this site — template chrome

    imageUrls.push(abs);
  }
  if (ogImageAbs && !isLikelyNonPropertyImage(ogImageAbs) && !imageUrls.includes(ogImageAbs)) {
    imageUrls.unshift(ogImageAbs);
  }

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
