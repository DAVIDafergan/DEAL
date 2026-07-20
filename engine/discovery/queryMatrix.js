// Reuses the same region/type label lists the frontend search UI shows — single source of
// truth for "what a region/type is called in Hebrew" instead of a second hard-coded copy here.
import { REGIONS, PROPERTY_TYPES } from '../../web/src/data/propertyOptions.js';

const REGION_LABELS = REGIONS.map((r) => r.label);
const TYPE_LABELS = PROPERTY_TYPES.map((t) => t.label);

// A subset of amenities worth their own search query (people search "צימר עם ג'קוזי", nobody
// searches "צימר עם WiFi") — mirrors web/src/data/propertyOptions.js AMENITIES but only the
// ones that are actually distinctive search terms.
const SEARCHABLE_AMENITIES = [
  'ג\'קוזי פרטי', 'בריכה פרטית', 'בריכה מחוממת', 'נוף', 'גינה', 'מנגל', 'ידידותי לילדים', 'מתאים לחיות מחמד',
];

/**
 * Generates the [property type] × [region] × [amenity] query matrix described in Step 3.1.
 * Two shapes: "{type} עם {amenity} ב{region}" (the example in the spec) for every
 * type×region×amenity combo, plus a plainer "{type} ב{region}" per type×region as a fallback
 * for regions/types with no amenity match. 4 types × 9 regions × 8 amenities = 288, plus
 * 4×9 = 36 plain ones = 324 total — comfortably over the 300 minimum.
 */
export function buildQueryMatrix() {
  const queries = [];
  for (const type of TYPE_LABELS) {
    for (const region of REGION_LABELS) {
      queries.push(`${type} ב${region}`);
      for (const amenity of SEARCHABLE_AMENITIES) {
        queries.push(`${type} עם ${amenity} ב${region}`);
      }
    }
  }
  return queries;
}
