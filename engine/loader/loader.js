import { upsertAutoCollectedProperty, updateAutoCollectedProperty } from '../../server/store/propertyStore.js';
import { findDuplicate, matchAgainstCandidates } from '../dedup/matcher.js';
import { mergeExtractions } from '../dedup/merger.js';

function computeOverallConfidence(fieldConfidence) {
  const scores = Object.values(fieldConfidence || {}).filter((s) => typeof s === 'number');
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/**
 * Step 3.4 Loader: writes one extracted+validated record to `properties`, deduplicating against
 * existing auto-collected rows first (matcher.js). `loadedThisRun` accumulates rows created in
 * this same pipeline run so the city+name-similarity fallback tier has something to compare
 * against (see matcher.js). Returns { action: 'created'|'updated', id, confidence }.
 */
export async function loadProperty(extraction, meta, loadedThisRun) {
  const { sourceUrl, imageUrls } = meta;
  const overallConfidence = computeOverallConfidence(extraction.field_confidence);

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
