import Anthropic from '@anthropic-ai/sdk';
import { isDomainBlocked, normalizeDomain } from '../../core/compliance/blocklist.js';
import { getSourceClassification, saveSourceClassification } from '../../server/store/engineSourceStore.js';

const MODEL = 'claude-haiku-4-5-20251001';

const SYSTEM_PROMPT = `את/ה מסווג/ת תוצאת חיפוש לפני שהיא נכנסת לתור סריקה של אתר איתור צימרים/וילות בישראל.
סווג ל-3 קטגוריות בלבד:
- single_property: אתר עצמאי של בעל נכס בודד אחד (או מתחם יחיד עם כמה יחידות תחת אותה בעלות)
- portal: אינדקס/פורטל/מדריך שמרכז הרבה נכסים של בעלים שונים (גם אם לא OTA מוכר)
- irrelevant: לא קשור לאירוח (בלוג, חדשות, עסק אחר וכו')
החזר אך ורק JSON: {"classification": "single_property"|"portal"|"irrelevant", "reason": "משפט קצר"}`;

function heuristicClassify(domain, title = '', snippet = '') {
  const text = `${title} ${snippet}`.toLowerCase();
  const portalHints = ['index', 'list', 'compare', 'guide', 'כל הנכסים', 'מאות צימרים', 'השוואת מחירים'];
  if (portalHints.some((h) => text.includes(h) || domain.includes(h))) {
    return { classification: 'portal', reason: 'heuristic: portal-like keywords', confidence: 'low' };
  }
  return { classification: 'single_property', reason: 'heuristic: no portal signal found (unverified)', confidence: 'low' };
}

async function llmClassify(apiKey, { domain, title, snippet }) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `דומיין: ${domain}\nכותרת: ${title}\nתקציר: ${snippet}` }],
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
 * Step 8.3 source classification pipeline: blocklist check -> cached classification -> LLM (or
 * heuristic fallback without ANTHROPIC_API_KEY) -> persist. One call per unique domain ever
 * (cache hit skips both the blocklist recheck and the LLM call).
 */
export async function classifySource({ url, title = '', snippet = '' }) {
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

  const apiKey = process.env.ANTHROPIC_API_KEY || null;
  let result;
  try {
    result = apiKey ? await llmClassify(apiKey, { domain, title, snippet }) : heuristicClassify(domain, title, snippet);
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
 * twice inside one discovery pass before the first save lands). */
export async function classifySources(candidates) {
  const seen = new Map();
  const out = [];
  for (const c of candidates) {
    let domain;
    try { domain = normalizeDomain(new URL(c.url).hostname); } catch { domain = null; }
    if (domain && seen.has(domain)) { out.push(seen.get(domain)); continue; }
    const result = await classifySource(c);
    if (domain) seen.set(domain, result);
    out.push(result);
  }
  return out;
}
