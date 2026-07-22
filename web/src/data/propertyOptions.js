// Mirrors the ENUMs in core/db/index.js (properties table) — keep in sync if the schema changes.
// 9.8: each entry carries both `label` (Hebrew) and `labelEn` — the label*() getters below take
// an optional `lang` so every call site can render bilingually without duplicating this catalog.

export const REGIONS = [
  { value: 'north', label: 'הצפון', labelEn: 'The North' },
  { value: 'galilee', label: 'הגליל', labelEn: 'The Galilee' },
  { value: 'golan', label: 'הגולן', labelEn: 'The Golan Heights' },
  { value: 'carmel', label: 'הכרמל', labelEn: 'The Carmel' },
  { value: 'center', label: 'המרכז', labelEn: 'Central Israel' },
  { value: 'jerusalem', label: 'ירושלים', labelEn: 'Jerusalem' },
  { value: 'south', label: 'הדרום', labelEn: 'The South' },
  { value: 'dead_sea', label: 'ים המלח', labelEn: 'Dead Sea' },
  { value: 'eilat', label: 'אילת', labelEn: 'Eilat' },
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
  { value: 'zimmer', label: 'צימר', labelEn: 'Cabin' },
  { value: 'villa', label: 'וילה', labelEn: 'Villa' },
  { value: 'cottage', label: 'בקתה', labelEn: 'Cottage' },
  { value: 'suite', label: 'סוויטה', labelEn: 'Suite' },
];

export const KOSHER_LEVELS = [
  { value: 'not_applicable', label: 'לא רלוונטי', labelEn: 'Not applicable' },
  { value: 'kosher', label: 'כשר', labelEn: 'Kosher' },
  { value: 'shomer_shabbat', label: 'שומר שבת', labelEn: 'Shabbat observant' },
  { value: 'kosher_kitchen', label: 'מטבח כשר', labelEn: 'Kosher kitchen' },
];

export const AMENITIES = [
  { value: 'has_private_jacuzzi', label: 'ג׳קוזי פרטי', labelEn: 'Private jacuzzi' },
  { value: 'has_private_pool', label: 'בריכה פרטית', labelEn: 'Private pool' },
  { value: 'has_heated_pool', label: 'בריכה מחוממת', labelEn: 'Heated pool' },
  { value: 'has_sauna', label: 'סאונה', labelEn: 'Sauna' },
  { value: 'has_view', label: 'נוף', labelEn: 'View' },
  { value: 'has_garden', label: 'גינה', labelEn: 'Garden' },
  { value: 'has_bbq', label: 'מנגל', labelEn: 'BBQ' },
  { value: 'has_outdoor_jacuzzi', label: 'ג׳קוזי חיצוני', labelEn: 'Outdoor jacuzzi' },
  { value: 'has_parking', label: 'חניה', labelEn: 'Parking' },
  { value: 'has_air_conditioning', label: 'מיזוג', labelEn: 'Air conditioning' },
  { value: 'has_equipped_kitchen', label: 'מטבח מאובזר', labelEn: 'Equipped kitchen' },
  { value: 'has_wifi', label: 'WiFi', labelEn: 'WiFi' },
  { value: 'is_kid_friendly', label: 'ידידותי לילדים', labelEn: 'Kid-friendly' },
  { value: 'is_pet_friendly', label: 'מתאים לחיות מחמד', labelEn: 'Pet-friendly' },
  { value: 'is_accessible', label: 'נגישות', labelEn: 'Accessible' },
  // 10.7 — detailed Shabbat filter
  { value: 'has_shabbat_plata', label: 'פלטה לשבת', labelEn: 'Shabbat hotplate' },
  { value: 'has_shabbat_urn', label: 'מיחם', labelEn: 'Hot water urn' },
  { value: 'has_shabbat_clock', label: 'שעון שבת', labelEn: 'Shabbat timer' },
  { value: 'has_mechanical_key', label: 'מפתח מכני (לא אלקטרוני)', labelEn: 'Mechanical key (no electronic lock)' },
  { value: 'is_near_eruv', label: 'בתוך עירוב', labelEn: 'Within an eruv' },
  { value: 'is_near_synagogue', label: 'קרוב לבית כנסת', labelEn: 'Near a synagogue' },
  // 10.7 — detailed accessibility filter
  { value: 'has_step_free_entrance', label: 'כניסה ללא מדרגות', labelEn: 'Step-free entrance' },
  { value: 'has_accessible_bathroom', label: 'מקלחת נגישה', labelEn: 'Accessible bathroom' },
  { value: 'has_grab_bars', label: 'ידיות אחיזה', labelEn: 'Grab bars' },
  { value: 'has_accessible_parking', label: 'חניית נכים', labelEn: 'Accessible parking' },
  { value: 'has_wide_doorways', label: 'פתחים רחבים', labelEn: 'Wide doorways' },
];

// Per-unit amenities (7.3: "מתקנים ספציפיים ליחידה: ג'קוזי פרטי, מרפסת, בריכה פרטית") — a small,
// separate catalog from the property-level AMENITIES above, since these describe one unit inside
// a complex rather than something shared by the whole property.
export const UNIT_AMENITIES = [
  { value: 'private_jacuzzi', label: 'ג׳קוזי פרטי', labelEn: 'Private jacuzzi' },
  { value: 'balcony', label: 'מרפסת', labelEn: 'Balcony' },
  { value: 'private_pool', label: 'בריכה פרטית', labelEn: 'Private pool' },
  { value: 'private_view', label: 'נוף פרטי', labelEn: 'Private view' },
  { value: 'kitchenette', label: 'מטבחון', labelEn: 'Kitchenette' },
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

function pick(entry, value, lang) {
  return lang === 'en' ? (entry?.labelEn || value) : (entry?.label || value);
}

export function unitAmenityLabel(value, lang = 'he') {
  return pick(UNIT_AMENITIES.find((a) => a.value === value), value, lang);
}

export function regionLabel(value, lang = 'he') {
  return pick(REGIONS.find((r) => r.value === value), value, lang);
}

export function propertyTypeLabel(value, lang = 'he') {
  return pick(PROPERTY_TYPES.find((p) => p.value === value), value, lang);
}

export function kosherLabel(value, lang = 'he') {
  return pick(KOSHER_LEVELS.find((k) => k.value === value), value, lang);
}

export function amenityLabel(value, lang = 'he') {
  return pick(AMENITIES.find((a) => a.value === value), value, lang);
}
