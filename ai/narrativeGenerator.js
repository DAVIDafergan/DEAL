import { askClaude } from './claudeClient.js';

/**
 * בונה prompt יחיד שמבקש מ-Claude לכתוב נרטיב לדיל בשלוש שפות בקריאה אחת,
 * במקום שלוש קריאות נפרדות — חוסך עלות וזמן תגובה.
 * Builds a single prompt asking Claude to write the deal narrative in all three
 * languages in one call, instead of three separate round-trips.
 */
function buildPrompt(deal) {
  const { offer, analysis } = deal;

  return `You are a travel-deals copywriter. Given the flight deal data below, write a short marketing
narrative in three languages: Hebrew (he), English (en), and Spanish (es).

Deal data:
- Route: ${offer.origin} -> ${offer.destination}
- Departure date: ${offer.departureDate}
- Price: ${offer.price} ${offer.currency}
- Stops: ${offer.stops}
- Carrier: ${offer.carrier}
- Average historical price: ${analysis.movingAverage} ${offer.currency}
- Discount vs average: roughly ${Math.round(((analysis.movingAverage - offer.price) / analysis.movingAverage) * 100)}%
- Enforcement likelihood (chance the fare will be honored, not cancelled as a pricing error): ${analysis.enforcementLikelihood}/100

For EACH language, produce:
- "title": a short, punchy headline (max ~60 chars)
- "description": a short 2-3 sentence description of the deal
- "riskWarning": a gently-worded warning about the risk that this could be a pricing error that
  might get cancelled, phrased proportionally to the enforcement likelihood score (lower score =
  more cautious wording). Never tell the user this is guaranteed to be honored.

Respond with ONLY valid JSON, no markdown code fences, no extra commentary, in exactly this shape:
{
  "he": { "title": "...", "description": "...", "riskWarning": "..." },
  "en": { "title": "...", "description": "...", "riskWarning": "..." },
  "es": { "title": "...", "description": "...", "riskWarning": "..." }
}`;
}

/** מסיר markdown code fences אם Claude בכל זאת עטף את ה-JSON בהם */
function stripCodeFences(text) {
  return text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
}

/**
 * מייצר נרטיב תלת-לשוני לדיל נתון, בקריאה אחת ל-Claude.
 * Generates a tri-lingual narrative for a deal in a single Claude call.
 * @param {{offer: object, analysis: object}} deal
 * @returns {Promise<{he: object, en: object, es: object}>}
 */
export async function generateDealNarrative(deal, options = {}) {
  const prompt = buildPrompt(deal);
  const rawText = await askClaude(prompt, options);

  let parsed;
  try {
    parsed = JSON.parse(stripCodeFences(rawText));
  } catch (err) {
    throw new Error(`Failed to parse Claude narrative response as JSON: ${err.message}`);
  }

  for (const lang of ['he', 'en', 'es']) {
    if (!parsed[lang]?.title || !parsed[lang]?.description || !parsed[lang]?.riskWarning) {
      throw new Error(`Claude narrative response is missing required fields for language "${lang}"`);
    }
  }

  return parsed;
}
