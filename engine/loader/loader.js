import { upsertAutoCollectedProperty, updateAutoCollectedProperty } from '../../server/store/propertyStore.js';
import { findDuplicate, matchAgainstCandidates } from '../dedup/matcher.js';
import { mergeExtractions } from '../dedup/merger.js';

const MIN_CONFIDENCE = 60;
const MIN_DESCRIPTION_LENGTH = 20;

function computeOverallConfidence(fieldConfidence) {
  const scores = Object.values(fieldConfidence || {}).filter((s) => typeof s === 'number');
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function hasRealDescription(description) {
  return Boolean(description && description.trim().length >= MIN_DESCRIPTION_LENGTH);
}

/**
 * Step 3.4 Loader: writes one extracted+validated record to `properties`, deduplicating against
 * existing auto-collected rows first (matcher.js). `loadedThisRun` accumulates rows created in
 * this same pipeline run so the city+name-similarity fallback tier has something to compare
 * against (see matcher.js). Returns { action: 'created'|'updated'|'rejected', id, confidence }.
 *
 * Step 11.15 hard floor (tightened from 11.7's "phone OR location" — a listing like "ספונטני",
 * confidence 65, no phone/whatsapp, contradictory city/region and nothing else, was passing the
 * old OR-gate and reaching the review queue with nothing an admin could actually judge it by):
 * now requires ALL of — a way to contact the owner (phone or whatsapp), an identified location
 * (city or region), AND at least one substantive field (price, bedroom count, or an actual
 * description, not just a name) — before it ever touches `properties` or the review queue
 * (logged, not silently dropped). MIN_CONFIDENCE stays as a separate, additional floor on top.
 */
export async function loadProperty(extraction, meta, loadedThisRun) {
  const { sourceUrl, imageUrls } = meta;
  const overallConfidence = computeOverallConfidence(extraction.field_confidence);

  const hasContact = Boolean(extraction.phone || extraction.whatsapp);
  const hasLocation = Boolean(extraction.city || extraction.region);
  const hasSubstance = Boolean(extraction.base_price_night) || Boolean(extraction.bedrooms) || hasRealDescription(extraction.description);

  if (!hasContact || !hasLocation || !hasSubstance) {
    const reason = !hasContact ? 'no_phone_or_whatsapp' : !hasLocation ? 'no_identified_location' : 'no_price_bedrooms_or_description';
    console.log(`[loader] Rejected — ${reason}: "${extraction.name || 'unnamed'}" (${sourceUrl})`);
    return { action: 'rejected', reason, confidence: overallConfidence, name: extraction.name, city: extraction.city };
  }
  if (overallConfidence < MIN_CONFIDENCE) {
    console.log(`[loader] Rejected — confidence ${overallConfidence} < ${MIN_CONFIDENCE}: "${extraction.name || 'unnamed'}" (${sourceUrl})`);
    return { action: 'rejected', reason: 'confidence_below_threshold', confidence: overallConfidence, name: extraction.name, city: extraction.city };
  }

  const candidate = { ...extraction, source_url: sourceUrl, source_image_urls: imageUrls, confidence: overallConfidence };

  let existing = await findDuplicate({
    phone: extraction.phone,
    whatsapp: extraction.whatsapp,
    sourceUrl,
    city: extraction.city,
    name: extraction.name,
  });
  if (!existing) existing = matchAgainstCandidates(candidate, loadedThisRun);

  if (existing) {
    const merged = mergeExtractions(existing, extraction);
    await updateAutoCollectedProperty(existing.id, {
      ...merged,
      source_image_urls: [...new Set([...(existing.source_image_urls || []), ...(imageUrls || [])])],
      extraction_confidence: merged.field_confidence,
      confidence: merged.confidence,
    });
    const result = { action: 'updated', id: existing.id, confidence: merged.confidence, name: merged.name, city: merged.city };
    loadedThisRun.push({ id: existing.id, name: merged.name, city: merged.city });
    return result;
  }

  const id = await upsertAutoCollectedProperty({
    ...extraction,
    source_url: sourceUrl,
    source_image_urls: imageUrls,
    extraction_confidence: extraction.field_confidence,
    confidence: overallConfidence,
  });
  const result = { action: 'created', id, confidence: overallConfidence, name: extraction.name, city: extraction.city };
  loadedThisRun.push({ id, name: extraction.name, city: extraction.city });
  return result;
}
