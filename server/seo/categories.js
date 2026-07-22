// 9.7 programmatic SEO — category dimension for /קטגוריה/:slug and the /:region/:slug,
// /:city/:slug combo pages. Kept deliberately bounded (not every amenity × every combination)
// — a real, honestly-filterable set covering the spec's own examples (jacuzzi, pool, kosher,
// families/large-groups/romantic by capacity, property type). See DECISIONS.md 9.7 for the
// couples/romantic proxy rationale (no exact "max capacity" filter exists in the schema).
export const SEO_CATEGORIES = [
  { slug: 'ג\'קוזי', label: 'עם ג\'קוזי', amenity: 'has_private_jacuzzi' },
  { slug: 'בריכה', label: 'עם בריכה', amenity: 'has_private_pool' },
  { slug: 'בריכה-מחוממת', label: 'עם בריכה מחוממת', amenity: 'has_heated_pool' },
  { slug: 'סאונה', label: 'עם סאונה', amenity: 'has_sauna' },
  { slug: 'נוף', label: 'עם נוף', amenity: 'has_view' },
  { slug: 'כשר', label: 'כשרים', kosherLevel: 'kosher' },
  { slug: 'למשפחות', label: 'למשפחות', amenity: 'is_kid_friendly' },
  { slug: 'לזוגות', label: 'רומנטיים לזוגות', amenity: 'has_private_jacuzzi' },
  { slug: 'לקבוצות-גדולות', label: 'לקבוצות גדולות', minGuests: 10 },
  { slug: 'עם-חיות-מחמד', label: 'ידידותיים לחיות מחמד', amenity: 'is_pet_friendly' },
  { slug: 'נגישים', label: 'נגישים', amenity: 'is_accessible' },
  { slug: 'וילות', label: 'וילות', propertyType: 'villa' },
  { slug: 'בקתות', label: 'בקתות', propertyType: 'cottage' },
  { slug: 'סוויטות', label: 'סוויטות', propertyType: 'suite' },
];

export function findCategoryBySlug(slug) {
  return SEO_CATEGORIES.find((c) => c.slug === decodeURIComponent(slug || '')) || null;
}

export function categoryToSearchFilters(category) {
  if (!category) return {};
  const filters = {};
  if (category.amenity) filters.amenities = [category.amenity];
  if (category.kosherLevel) filters.kosherLevel = category.kosherLevel;
  if (category.propertyType) filters.propertyType = category.propertyType;
  if (category.minGuests) filters.minGuests = category.minGuests;
  return filters;
}
