// Mirrors the ENUMs in core/db/index.js (properties table) — keep in sync if the schema changes.

export const REGIONS = [
  { value: 'north', label: 'הצפון' },
  { value: 'galilee', label: 'הגליל' },
  { value: 'golan', label: 'הגולן' },
  { value: 'carmel', label: 'הכרמל' },
  { value: 'center', label: 'המרכז' },
  { value: 'jerusalem', label: 'ירושלים' },
  { value: 'south', label: 'הדרום' },
  { value: 'dead_sea', label: 'ים המלח' },
  { value: 'eilat', label: 'אילת' },
];

// Approximate centroid per region — used to place pins on the map, not administrative borders.
export const REGION_COORDINATES = {
  north: [35.57, 33.2],
  galilee: [35.3, 32.9],
  golan: [35.75, 33.0],
  carmel: [35.05, 32.75],
  center: [34.78, 32.08],
  jerusalem: [35.22, 31.78],
  south: [34.8, 31.25],
  dead_sea: [35.47, 31.5],
  eilat: [34.95, 29.55],
};

export const PROPERTY_TYPES = [
  { value: 'zimmer', label: 'צימר' },
  { value: 'villa', label: 'וילה' },
  { value: 'cottage', label: 'בקתה' },
  { value: 'suite', label: 'סוויטה' },
];

export const KOSHER_LEVELS = [
  { value: 'not_applicable', label: 'לא רלוונטי' },
  { value: 'kosher', label: 'כשר' },
  { value: 'shomer_shabbat', label: 'שומר שבת' },
  { value: 'kosher_kitchen', label: 'מטבח כשר' },
];

export const AMENITIES = [
  { value: 'has_private_jacuzzi', label: 'ג׳קוזי פרטי' },
  { value: 'has_private_pool', label: 'בריכה פרטית' },
  { value: 'has_heated_pool', label: 'בריכה מחוממת' },
  { value: 'has_sauna', label: 'סאונה' },
  { value: 'has_view', label: 'נוף' },
  { value: 'has_garden', label: 'גינה' },
  { value: 'has_bbq', label: 'מנגל' },
  { value: 'has_outdoor_jacuzzi', label: 'ג׳קוזי חיצוני' },
  { value: 'has_parking', label: 'חניה' },
  { value: 'has_air_conditioning', label: 'מיזוג' },
  { value: 'has_equipped_kitchen', label: 'מטבח מאובזר' },
  { value: 'has_wifi', label: 'WiFi' },
  { value: 'is_kid_friendly', label: 'ידידותי לילדים' },
  { value: 'is_pet_friendly', label: 'מתאים לחיות מחמד' },
  { value: 'is_accessible', label: 'נגישות' },
];

// Per-unit amenities (7.3: "מתקנים ספציפיים ליחידה: ג'קוזי פרטי, מרפסת, בריכה פרטית") — a small,
// separate catalog from the property-level AMENITIES above, since these describe one unit inside
// a complex rather than something shared by the whole property.
export const UNIT_AMENITIES = [
  { value: 'private_jacuzzi', label: 'ג׳קוזי פרטי' },
  { value: 'balcony', label: 'מרפסת' },
  { value: 'private_pool', label: 'בריכה פרטית' },
  { value: 'private_view', label: 'נוף פרטי' },
  { value: 'kitchenette', label: 'מטבחון' },
];

// 9.4: icon per amenity for the property page's amenities bar. Names are lucide-react exports,
// resolved to components where the icon bar renders (data files stay framework-agnostic here).
export const AMENITY_ICON_NAMES = {
  has_private_jacuzzi: 'Sparkles',
  has_private_pool: 'Waves',
  has_heated_pool: 'Waves',
  has_sauna: 'Flame',
  has_view: 'Mountain',
  has_garden: 'Trees',
  has_bbq: 'Utensils',
  has_outdoor_jacuzzi: 'Sparkles',
  has_parking: 'ParkingCircle',
  has_air_conditioning: 'Wind',
  has_equipped_kitchen: 'UtensilsCrossed',
  has_wifi: 'Wifi',
  is_kid_friendly: 'Baby',
  is_pet_friendly: 'Dog',
  is_accessible: 'Accessibility',
};

export function unitAmenityLabel(value) {
  return UNIT_AMENITIES.find((a) => a.value === value)?.label || value;
}

export function regionLabel(value) {
  return REGIONS.find((r) => r.value === value)?.label || value;
}

export function propertyTypeLabel(value) {
  return PROPERTY_TYPES.find((p) => p.value === value)?.label || value;
}

export function kosherLabel(value) {
  return KOSHER_LEVELS.find((k) => k.value === value)?.label || value;
}
