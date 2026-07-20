import { AMENITY_FIELDS } from '../extractor/propertySchema.js';

const SCORED_FIELDS = ['name', 'property_type', 'region', 'description', 'guest_capacity', 'base_price_night', 'phone'];
const UNSCORED_FIELDS = [
  'city', 'address', 'bedrooms', 'beds', 'bathrooms', ...AMENITY_FIELDS,
  'kosher_level', 'weekend_price', 'holiday_price', 'cleaning_fee', 'min_nights', 'whatsapp', 'email', 'website',
];

/**
 * Step 3.4: "לכל שדה נבחר הערך עם ה-confidence הגבוה ביותר". `existing` is the property row
 * already in the DB (its extraction_confidence JSON, if any); `incoming` is this run's fresh
 * extraction. Fields without a tracked confidence score (UNSCORED_FIELDS) keep the existing
 * value unless it's null and the incoming one isn't — filling gaps without downgrading data.
 */
export function mergeExtractions(existing, incoming) {
  const existingConfidence = existing.extraction_confidence || {};
  const incomingConfidence = incoming.field_confidence || {};
  const merged = {};
  const mergedConfidence = {};

  for (const field of SCORED_FIELDS) {
    const existingScore = existingConfidence[field] ?? -1;
    const incomingScore = incomingConfidence[field] ?? -1;
    if (incoming[field] != null && incomingScore >= existingScore) {
      merged[field] = incoming[field];
      mergedConfidence[field] = incomingScore;
    } else {
      merged[field] = existing[field] ?? incoming[field] ?? null;
      mergedConfidence[field] = existingScore >= 0 ? existingScore : incomingScore;
    }
  }

  for (const field of UNSCORED_FIELDS) {
    merged[field] = existing[field] ?? incoming[field] ?? null;
  }

  // Overall confidence = average of the scored fields that actually have a score — matches the
  // publish-gate column (properties.confidence), not the per-field breakdown.
  const scores = Object.values(mergedConfidence).filter((s) => s >= 0);
  merged.confidence = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  merged.field_confidence = mergedConfidence;

  return merged;
}
