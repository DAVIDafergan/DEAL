import Anthropic from '@anthropic-ai/sdk';
import { PropertyExtractionSchema } from './propertySchema.js';
import { hasCopiedPhrase } from './descriptionCheck.js';
import { recordUsage } from './costLogger.js';

const MAX_TEXT_CHARS = 12000; // cost control — truncate before sending (Step 3.3 "טיפול בדפים ארוכים")
const MODEL = 'claude-haiku-4-5-20251001'; // cheapest current model — extraction is high-volume/repetitive, not reasoning-heavy

const SYSTEM_PROMPT = `את/ה מחלץ מידע מובנה על נכסי אירוח (צימרים/וילות) מטקסט שנאסף מאתר פרסום עצמאי.
כללים מחייבים:
- אם מידע לא ברור באופן חד-משמעי מהטקסט - השדה חייב להיות null. לעולם אל תנחש.
- כתוב תיאור (description) במילים שלך, קצר ועובדתי (עד שני משפטים) - אסור להעתיק משפטים מהטקסט המקורי.
- החזר confidence (0-100) לכל שדה ב-field_confidence, המשקף עד כמה המידע ברור וחד-משמעי בטקסט המקורי.
- החזר אך ורק אובייקט JSON תואם לסכימה שסופקה, בלי טקסט נוסף לפני או אחרי.`;

function truncateRelevant(text) {
  return text.length <= MAX_TEXT_CHARS ? text : text.slice(0, MAX_TEXT_CHARS);
}

function buildUserPrompt(pageText, sourceUrl) {
  return `כתובת המקור: ${sourceUrl}\n\nטקסט הדף:\n${truncateRelevant(pageText)}\n\nהחזר JSON בלבד לפי הסכימה.`;
}

function extractJsonObject(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in model output');
  return JSON.parse(match[0]);
}

async function callClaude(pageText, sourceUrl, apiKey) {
  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt(pageText, sourceUrl) }],
  });
  recordUsage({ inputTokens: response.usage?.input_tokens || 0, outputTokens: response.usage?.output_tokens || 0 });
  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text content in Claude response');
  return extractJsonObject(textBlock.text);
}

/**
 * Deterministic fallback used only when ANTHROPIC_API_KEY isn't configured, so the pipeline is
 * testable end-to-end without a real LLM call or cost. Not a quality substitute for the real
 * extractor — every field it fills gets an honest, modest confidence score, and it never
 * invents a description (the one field where a bad guess would risk copying source text).
 * `hints` carries context the pipeline already has (e.g. the discovery query that found this
 * page) — the same kind of signal a real extraction pass would also lean on.
 */
function mockExtract(pageText, sourceUrl, hints = {}) {
  // Hebrew pricing appears both ways ("₪650" and "650 ₪") — match whichever comes first.
  const priceMatch = pageText.match(/₪\s*(\d{2,4})/) || pageText.match(/(\d{2,4})\s*₪/);
  const guestsMatch = pageText.match(/(\d{1,2})\s*(?:אורחים|נפשות|אנשים)/);
  const bedroomsMatch = pageText.match(/(\d{1,2})\s*חדרי שינה/);
  const has = (re) => (re.test(pageText) ? true : null);

  return {
    name: hints.name || null,
    property_type: hints.property_type || null,
    region: hints.region || null,
    // The mock never *invents* a description on its own (that's the one field worth being
    // extra careful about) — `hints.mockDescription` exists only so dry-run tests can exercise
    // the description-copy rejection path end-to-end without a real LLM. Never set in production
    // use (there are no hints at all once ANTHROPIC_API_KEY is configured — see extractProperty()).
    description: hints.mockDescription || null,
    city: hints.city || null,
    address: null,
    guest_capacity: guestsMatch ? Number(guestsMatch[1]) : null,
    bedrooms: bedroomsMatch ? Number(bedroomsMatch[1]) : null,
    beds: null,
    bathrooms: null,
    has_private_jacuzzi: has(/ג['’]?קוזי פרטי/),
    has_private_pool: has(/בריכה פרטית/),
    has_heated_pool: has(/בריכה מחוממת/),
    has_sauna: has(/סאונה/),
    has_view: has(/נוף/),
    has_garden: has(/גינה/),
    has_bbq: has(/מנגל/),
    has_outdoor_jacuzzi: has(/ג['’]?קוזי חיצוני/),
    has_parking: has(/חניה/),
    has_air_conditioning: has(/מיזוג/),
    has_equipped_kitchen: has(/מטבח מאובזר/),
    has_wifi: has(/wifi|וויפי/i),
    is_kid_friendly: has(/ילדים/),
    is_pet_friendly: has(/חיות מחמד/),
    is_accessible: has(/נגישות/),
    kosher_level: /כשר/.test(pageText) ? 'kosher' : null,
    base_price_night: priceMatch ? Number(priceMatch[1]) : null,
    weekend_price: null,
    holiday_price: null,
    cleaning_fee: null,
    min_nights: null,
    phone: hints.phone || null,
    whatsapp: hints.whatsapp || null,
    email: null,
    website: sourceUrl,
    field_confidence: {
      name: hints.name ? 60 : 0,
      property_type: hints.property_type ? 60 : 0,
      region: hints.region ? 60 : 0,
      description: hints.mockDescription ? 50 : null,
      guest_capacity: guestsMatch ? 55 : null,
      base_price_night: priceMatch ? 55 : null,
      phone: hints.phone ? 70 : null,
    },
  };
}

/**
 * Extractor entry point (Step 3.3). Calls Claude if ANTHROPIC_API_KEY is set, otherwise falls
 * back to the deterministic mock above — same graceful-degradation pattern the rest of this
 * codebase already uses for missing API keys (see README). Validates against the zod schema,
 * retries once on invalid output, then gives up and reports a rejection (never invents data to
 * force a pass). Enforces the description-rewrite rule independently of schema validity.
 */
export async function extractProperty({ pageText, sourceUrl, hints = {} }) {
  const apiKey = process.env.ANTHROPIC_API_KEY || null;
  const attempt = () => (apiKey ? callClaude(pageText, sourceUrl, apiKey) : mockExtract(pageText, sourceUrl, hints));

  let raw;
  let callError = null;
  let validated = null;

  for (let i = 0; i < 2; i++) {
    callError = null;
    try {
      raw = await attempt();
    } catch (err) {
      callError = err;
      continue;
    }
    validated = PropertyExtractionSchema.safeParse(raw);
    if (validated.success) break;
  }

  if (!validated?.success) {
    return {
      ok: false,
      reason: callError ? 'call_failed' : 'schema_invalid',
      errors: validated?.error?.issues?.map((i) => `${i.path.join('.')}: ${i.message}`),
      usedMock: !apiKey,
    };
  }

  const data = validated.data;
  let descriptionRejectedForCopying = false;
  if (data.description && hasCopiedPhrase(data.description, pageText)) {
    data.description = null;
    data.field_confidence.description = null;
    descriptionRejectedForCopying = true;
  }

  return { ok: true, data, usedMock: !apiKey, descriptionRejectedForCopying };
}
