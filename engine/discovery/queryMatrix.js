// Step 8.2 query matrix generator. Search-phrasing variants deliberately differ from the DB
// property_type ENUM / propertyOptions.js REGIONS — those are canonical values for stored data,
// these are how a person actually types a search query ("אירוח כפרי", "נופש" aren't property
// types but they're real search phrasing), per the spec's explicit examples.

const PROPERTY_TYPE_TERMS = ['צימר', 'צימרים', 'וילה', 'בקתה', 'אירוח כפרי', 'סוויטה', 'אירוח', 'נופש'];

// Regions + sub-regions + specific settlements, exactly the list from the spec.
const REGION_TERMS = [
  'גליל עליון', 'גליל תחתון', 'גליל מערבי', 'רמת הגולן', 'מטולה', 'ראש פינה', 'צפת',
  'כרמל', 'עמק יזרעאל', 'גלבוע', 'השרון', 'ירושלים והרי יהודה', 'שפלה',
  'נגב', 'מצפה רמון', 'ערבה', 'ים המלח', 'אילת',
];

const FACILITY_TERMS = ['עם ג\'קוזי', 'עם בריכה', 'בריכה מחוממת', 'עם נוף', 'כשר', 'למשפחות', 'רומנטי', 'עם סאונה'];

/**
 * Three query shapes, matching the spec's own phrasing style:
 *  - "{type} ב{region}" — plain, one per type×region (8 × 17 = 136)
 *  - "{type} {facility} ב{region}" — the spec's own example shape, one per type×region×facility
 *    but capped per region to keep the matrix from exploding past what's useful (8 × 17 × 8 = 1088
 *    is overkill; sampling every facility for every type×region already covers the space, so no
 *    cap needed — 1088 + 136 = 1224 total, comfortably over the ">=400" minimum)
 *  - a handful of settlement-only queries ("צימר במטולה") already covered by the region list
 *    above since specific settlements are included in REGION_TERMS itself.
 */
export function buildQueryMatrixDetailed() {
  const queries = [];
  for (const type of PROPERTY_TYPE_TERMS) {
    for (const region of REGION_TERMS) {
      queries.push({ text: `${type} ב${region}`, propertyType: type, region, amenity: null });
      for (const facility of FACILITY_TERMS) {
        queries.push({ text: `${type} ${facility} ב${region}`, propertyType: type, region, amenity: facility });
      }
    }
  }
  return queries;
}

/** Plain string array — the shape engine/discovery/discoveryEngine.js's runDiscovery() and the
 * existing dry-run admin route already expect. Kept as the stable, backward-compatible entry
 * point; buildQueryMatrixDetailed() above is the same data with the metadata Step 8.2's
 * query-tracking table wants (see server/store/engineQueryStore.js). */
export function buildQueryMatrix() {
  return buildQueryMatrixDetailed().map((q) => q.text);
}

export function queryMatrixSize() {
  return PROPERTY_TYPE_TERMS.length * REGION_TERMS.length * (1 + FACILITY_TERMS.length);
}

export const _internal = { PROPERTY_TYPE_TERMS, REGION_TERMS, FACILITY_TERMS };
