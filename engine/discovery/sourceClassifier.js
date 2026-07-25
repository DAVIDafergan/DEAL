import Anthropic from '@anthropic-ai/sdk';
import { isDomainBlocked, normalizeDomain } from '../../core/compliance/blocklist.js';
import { getSourceClassification, saveSourceClassification } from '../../server/store/engineSourceStore.js';
import { fetchPage, FetchSkippedError } from '../fetcher/pageFetcher.js';

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `את/ה מסווג/ת תוצאת חיפוש לפני שהיא נכנסת לתור סריקה של אתר איתור צימרים/וילות בישראל.
סווג ל-3 קטגוריות בלבד:
- single_property: אתר עצמאי של בעל נכס בודד אחד (או מתחם יחיד עם כמה יחידות תחת אותה בעלות)
- portal: אינדקס/פורטל/מדריך שמרכז הרבה נכסים של בעלים שונים (גם אם לא OTA מוכר)
- irrelevant: לא קשור לאירוח (בלוג, חדשות, עסק אחר וכו')
החזר אך ורק JSON: {"classification": "single_property"|"portal"|"irrelevant", "reason": "משפט קצר"}`;

// Real lodging content mentions at least one of these somewhere (name, meta description, JSON-LD,
// or body text) — a bare domain/URL with zero hits here has given us no positive evidence it's a
// zimmer/villa at all, and must NOT be waved through as "unverified but approved" (see 11.7 fix:
// binaa.co.il, a municipal CRM software vendor, was passing the old "no negative signal" heuristic).
const POSITIVE_LODGING_KEYWORDS = [
  'צימר', 'צימרים', 'וילה', 'וילות', 'אירוח', 'לינה', 'סוויטה', 'סוויטות', 'נופש', 'בקתה', 'בקתות',
  "ג'קוזי", 'גקוזי', 'בריכה', 'מרפסת', 'אכסניה', 'בית הארחה', 'יחידת אירוח', 'יחידות אירוח', 'זימר',
];

// Business types that show up constantly among outbound links from tourism-council/regional
// directory pages but are never themselves a lodging listing — matching any of these is an
// immediate hard reject, regardless of any positive keyword also present (e.g. a software
// company's site can still say "נופש" once in an unrelated blurb).
const NEGATIVE_KEYWORDS = [
  'crm', 'תוכנה', 'תוכנות', 'מוצר', 'שירותי מחשוב', 'ייעוץ', 'רואה חשבון', 'עורך דין', 'עורכי דין',
  'ביטוח', 'בנק', 'עירייה', 'מועצה מקומית', 'רשות מקומית', 'משרד ממשלתי', 'מוסך', 'רכב', 'ביטוח בריאות',
];

const PORTAL_KEYWORDS = ['index', 'list', 'compare', 'guide', 'כל הנכסים', 'מאות צימרים', 'השוואת מחירים'];

const LODGING_JSONLD_TYPE = /lodgingbusiness|hotel|bedandbreakfast|vacationrental|resort|campground/i;

function hasLodgingJsonLd(jsonLd = []) {
  return jsonLd.some((doc) => {
    const docs = Array.isArray(doc) ? doc : [doc];
    return docs.some((d) => typeof d?.['@type'] === 'string' && LODGING_JSONLD_TYPE.test(d['@type']));
  });
}

function buildTextSignal({ domain = '', title = '', snippet = '', metaTags = {}, bodyText = '' }) {
  return [
    domain, title, snippet,
    metaTags['og:title'], metaTags['description'], metaTags['og:description'],
    bodyText.slice(0, 2000),
  ].filter(Boolean).join(' ').toLowerCase();
}

/**
 * Reject-by-default heuristic (Step 11.7 fix): a candidate only becomes single_property when real
 * lodging evidence is found (positive keyword hit or a Lodging-family JSON-LD @type). No evidence
 * at all -> irrelevant, never "unverified but approved" — that used to let any random business site
 * (a municipal CRM vendor, an insurance agency, a local council page, ...) through as a "zimmer".
 * Any negative-keyword hit (CRM/software/legal/financial/municipal vocabulary) is an immediate
 * reject and short-circuits the positive check entirely.
 */
export function heuristicClassify(domain, content = {}) {
  const signal = buildTextSignal({ domain, ...content });

  const negativeHit = NEGATIVE_KEYWORDS.find((kw) => signal.includes(kw));
  if (negativeHit) {
    return { classification: 'irrelevant', reason: `heuristic: negative keyword match "${negativeHit}"`, confidence: 'low' };
  }

  if (PORTAL_KEYWORDS.some((kw) => signal.includes(kw))) {
    return { classification: 'portal', reason: 'heuristic: portal-like keywords', confidence: 'low' };
  }

  if (hasLodgingJsonLd(content.jsonLd)) {
    return { classification: 'single_property', reason: 'heuristic: JSON-LD lodging type found', confidence: 'medium' };
  }

  const positiveHit = POSITIVE_LODGING_KEYWORDS.find((kw) => signal.includes(kw));
  if (positiveHit) {
    return { classification: 'single_property', reason: `heuristic: positive lodging keyword "${positiveHit}"`, confidence: 'low' };
  }

  return { classification: 'irrelevant', reason: 'heuristic: no positive lodging signal found', confidence: 'low' };
}

async function llmClassify(apiKey, { domain, title, snippet, metaTags = {}, jsonLd = [], bodyText = '' }) {
  const client = new Anthropic({ apiKey });
  const extra = bodyText
    ? `\nתיאור/מטא: ${metaTags['og:description'] || metaTags['description'] || ''}\nJSON-LD @type: ${jsonLd.map((d) => (Array.isArray(d) ? d : [d]).map((x) => x?.['@type']).join(',')).join(' | ')}\nקטע מגוף הדף: ${bodyText.slice(0, 1000)}`
    : '';
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `דומיין: ${domain}\nכותרת: ${title}\nתקציר: ${snippet}${extra}` }],
  });
  const textBlock = response.content.find((b) => b.type === 'text');
  const match = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in classifier response');
  const parsed = JSON.parse(match[0]);
  if (!['single_property', 'portal', 'irrelevant'].includes(parsed.classification)) {
    throw new Error(`Invalid classification: ${parsed.classification}`);
  }
  return parsed;
}

/**
 * Step 8.3 source classification pipeline: blocklist check -> cached classification -> fetch the
 * candidate's own page for real content (meta tags/JSON-LD/body text) -> LLM (or heuristic
 * fallback without ANTHROPIC_API_KEY) -> persist. One call per unique domain ever (cache hit skips
 * the blocklist recheck, the fetch, and the LLM call).
 *
 * `browser` is required to get real page content for classification — without it (e.g. a caller
 * that hasn't launched Playwright yet) classification falls back to whatever bare title/snippet it
 * was given, which in practice is usually nothing, and a candidate with zero signal is rejected by
 * design (see heuristicClassify) rather than waved through as "unverified but approved".
 */
export async function classifySource({ url, title = '', snippet = '', browser = null }) {
  let domain;
  try {
    domain = normalizeDomain(new URL(url).hostname);
  } catch {
    return { classification: 'irrelevant', reason: 'invalid_url', cached: false };
  }

  // isDomainBlocked covers both the hard-coded OTA/platform list and the DB blocklist table.
  if (await isDomainBlocked(domain)) return { classification: 'irrelevant', reason: 'blocked_domain', domain, cached: false };

  const existing = await getSourceClassification(domain);
  if (existing) return { classification: existing.classification, reason: existing.reason, domain, cached: true };

  let content = { title, snippet };
  if (browser) {
    try {
      const fetched = await fetchPage(url, { browser });
      content = { title, snippet, metaTags: fetched.metaTags, jsonLd: fetched.jsonLd, bodyText: fetched.text };
    } catch (err) {
      const reason = err instanceof FetchSkippedError ? `fetch_skipped: ${err.reason}` : `fetch_error: ${err.message}`;
      return { classification: 'irrelevant', reason, domain, cached: false };
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY || null;
  let result;
  try {
    result = apiKey ? await llmClassify(apiKey, { domain, ...content }) : heuristicClassify(domain, content);
  } catch (err) {
    result = { classification: 'portal', reason: `classification_failed_defaulted_safe: ${err.message}` };
  }

  await saveSourceClassification(domain, {
    classification: result.classification,
    classifiedVia: apiKey ? 'llm' : 'heuristic',
    reason: result.reason,
  });

  return { classification: result.classification, reason: result.reason, domain, cached: false };
}

/** Batch helper with de-dup by domain within the same call (avoids classifying the same domain
 * twice inside one discovery pass before the first save lands). Pass `{ browser }` so each
 * uncached candidate can be fetched for real content before classification. */
export async function classifySources(candidates, { browser = null } = {}) {
  const seen = new Map();
  const out = [];
  for (const c of candidates) {
    let domain;
    try { domain = normalizeDomain(new URL(c.url).hostname); } catch { domain = null; }
    if (domain && seen.has(domain)) { out.push(seen.get(domain)); continue; }
    const result = await classifySource({ ...c, browser });
    if (domain) seen.set(domain, result);
    out.push(result);
  }
  return out;
}
