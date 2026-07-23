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
  { value: 'complex', label: 'מתחם צימרים', labelEn: 'Cabin complex' },
];

export const KOSHER_LEVELS = [
  { value: 'not_applicable', label: 'לא רלוונטי', labelEn: 'Not applicable' },
  { value: 'kosher', label: 'כשר', labelEn: 'Kosher' },
  { value: 'shomer_shabbat', label: 'שומר שבת', labelEn: 'Shabbat observant' },
  { value: 'kosher_kitchen', label: 'מטבח כשר', labelEn: 'Kosher kitchen' },
];

// 10.8 — view-type filter: a single-select "what kind of view", separate from the generic
// has_view boolean amenity (which stays as "has a view at all").
export const VIEW_TYPES = [
  { value: 'sea', label: 'ים', labelEn: 'Sea' },
  { value: 'lake', label: 'כנרת/אגם', labelEn: 'Lake' },
  { value: 'mountains', label: 'הרים', labelEn: 'Mountains' },
  { value: 'desert', label: 'מדבר', labelEn: 'Desert' },
  { value: 'green', label: 'ירוק/פסטורלי', labelEn: 'Green/pastoral' },
  { value: 'open', label: 'נוף פתוח', labelEn: 'Open view' },
];

// 11.6 — amenities are grouped into categories so the (now ~65-item) catalog can be shown as
// collapsible sections in the wizard/filter instead of one overwhelming flat list. Order here is
// the display order everywhere (wizard, property page, filter panel).
export const AMENITY_CATEGORIES = [
  { key: 'pool', label: 'בריכה', labelEn: 'Pool' },
  { key: 'jacuzzi', label: 'ג׳קוזי וספא', labelEn: 'Jacuzzi & spa' },
  { key: 'entertainment', label: 'בידור', labelEn: 'Entertainment' },
  { key: 'outdoor', label: 'חוץ', labelEn: 'Outdoor' },
  { key: 'kitchen', label: 'מטבח', labelEn: 'Kitchen' },
  { key: 'general', label: 'כללי', labelEn: 'General' },
  { key: 'shabbat', label: 'שבת וכשרות', labelEn: 'Shabbat & kosher' },
  { key: 'families', label: 'משפחות', labelEn: 'Families' },
  { key: 'accessibility', label: 'נגישות', labelEn: 'Accessibility' },
];

export const AMENITIES = [
  // בריכה
  { value: 'has_private_pool', label: 'בריכה פרטית', labelEn: 'Private pool', category: 'pool' },
  { value: 'has_shared_pool', label: 'בריכה משותפת', labelEn: 'Shared pool', category: 'pool' },
  { value: 'has_heated_pool', label: 'בריכה מחוממת', labelEn: 'Heated pool', category: 'pool' },
  { value: 'has_indoor_pool', label: 'בריכה מקורה', labelEn: 'Indoor pool', category: 'pool' },
  { value: 'has_kids_pool', label: 'בריכת ילדים', labelEn: "Kids' pool", category: 'pool' },
  { value: 'has_secluded_pool', label: 'בריכה מוצנעת', labelEn: 'Secluded pool', category: 'pool' },
  // ג'קוזי וספא — has_sauna (generic) split into dry/wet below; kept in the DB unused in the UI.
  { value: 'has_private_jacuzzi', label: 'ג׳קוזי פרטי בחדר', labelEn: 'In-room private jacuzzi', category: 'jacuzzi' },
  { value: 'has_outdoor_jacuzzi', label: 'ג׳קוזי חיצוני', labelEn: 'Outdoor jacuzzi', category: 'jacuzzi' },
  { value: 'has_spa', label: 'ספא', labelEn: 'Spa', category: 'jacuzzi' },
  { value: 'has_dry_sauna', label: 'סאונה יבשה', labelEn: 'Dry sauna', category: 'jacuzzi' },
  { value: 'has_wet_sauna', label: 'סאונה רטובה', labelEn: 'Wet sauna', category: 'jacuzzi' },
  // בידור
  { value: 'has_snooker_table', label: 'שולחן סנוקר', labelEn: 'Snooker table', category: 'entertainment' },
  { value: 'has_ping_pong', label: 'פינג פונג', labelEn: 'Ping pong', category: 'entertainment' },
  { value: 'has_foosball', label: 'כדורגל שולחן', labelEn: 'Foosball', category: 'entertainment' },
  { value: 'has_game_console', label: 'קונסולת משחקים', labelEn: 'Game console', category: 'entertainment' },
  { value: 'has_projector', label: 'מקרן', labelEn: 'Projector', category: 'entertainment' },
  { value: 'has_home_cinema', label: 'מערכת קולנוע ביתי', labelEn: 'Home cinema system', category: 'entertainment' },
  { value: 'has_library', label: 'ספרייה', labelEn: 'Library', category: 'entertainment' },
  { value: 'has_board_games', label: 'משחקי קופסה', labelEn: 'Board games', category: 'entertainment' },
  // חוץ
  { value: 'has_bbq', label: 'מנגל', labelEn: 'BBQ', category: 'outdoor' },
  { value: 'has_outdoor_seating', label: 'פינת ישיבה', labelEn: 'Outdoor seating area', category: 'outdoor' },
  { value: 'has_hammocks', label: 'ערסלים', labelEn: 'Hammocks', category: 'outdoor' },
  { value: 'has_garden', label: 'גינה', labelEn: 'Garden', category: 'outdoor' },
  { value: 'has_lawn', label: 'דשא', labelEn: 'Lawn', category: 'outdoor' },
  { value: 'has_balcony', label: 'מרפסת', labelEn: 'Balcony', category: 'outdoor' },
  { value: 'has_view', label: 'נוף', labelEn: 'View', category: 'outdoor' },
  { value: 'has_pergola', label: 'פרגולה', labelEn: 'Pergola', category: 'outdoor' },
  { value: 'has_fire_pit', label: 'מדורה', labelEn: 'Fire pit', category: 'outdoor' },
  { value: 'has_trampoline', label: 'טרמפולינה', labelEn: 'Trampoline', category: 'outdoor' },
  { value: 'has_swings', label: 'נדנדות', labelEn: 'Swings', category: 'outdoor' },
  // מטבח
  { value: 'has_equipped_kitchen', label: 'מטבח מאובזר', labelEn: 'Equipped kitchen', category: 'kitchen' },
  { value: 'has_dishwasher', label: 'מדיח', labelEn: 'Dishwasher', category: 'kitchen' },
  { value: 'has_microwave', label: 'מיקרוגל', labelEn: 'Microwave', category: 'kitchen' },
  { value: 'has_coffee_machine', label: 'מכונת קפה', labelEn: 'Coffee machine', category: 'kitchen' },
  { value: 'has_toaster_oven', label: 'טוסטר אובן', labelEn: 'Toaster oven', category: 'kitchen' },
  { value: 'has_stovetop', label: 'כיריים', labelEn: 'Stovetop', category: 'kitchen' },
  { value: 'has_oven', label: 'תנור', labelEn: 'Oven', category: 'kitchen' },
  { value: 'has_large_fridge', label: 'מקרר גדול', labelEn: 'Large fridge', category: 'kitchen' },
  // כללי
  { value: 'has_air_conditioning', label: 'מזגן', labelEn: 'Air conditioning', category: 'general' },
  { value: 'has_heating', label: 'חימום', labelEn: 'Heating', category: 'general' },
  { value: 'has_wifi', label: 'WiFi', labelEn: 'WiFi', category: 'general' },
  { value: 'has_tv', label: 'טלוויזיה', labelEn: 'TV', category: 'general' },
  { value: 'has_washing_machine', label: 'מכונת כביסה', labelEn: 'Washing machine', category: 'general' },
  { value: 'has_dryer', label: 'מייבש', labelEn: 'Dryer', category: 'general' },
  { value: 'has_parking', label: 'חניה פרטית', labelEn: 'Private parking', category: 'general' },
  { value: 'has_private_entrance', label: 'כניסה פרטית', labelEn: 'Private entrance', category: 'general' },
  { value: 'is_pet_friendly', label: 'מתאים לחיות מחמד', labelEn: 'Pet-friendly', category: 'general' },
  // שבת וכשרות — 10.7
  { value: 'has_shabbat_plata', label: 'פלטה לשבת', labelEn: 'Shabbat hotplate', category: 'shabbat' },
  { value: 'has_shabbat_urn', label: 'מיחם', labelEn: 'Hot water urn', category: 'shabbat' },
  { value: 'has_shabbat_clock', label: 'שעון שבת', labelEn: 'Shabbat timer', category: 'shabbat' },
  { value: 'has_mechanical_key', label: 'מפתח מכני (לא אלקטרוני)', labelEn: 'Mechanical key (no electronic lock)', category: 'shabbat' },
  { value: 'is_near_eruv', label: 'בתוך עירוב', labelEn: 'Within an eruv', category: 'shabbat' },
  { value: 'is_near_synagogue', label: 'קרוב לבית כנסת', labelEn: 'Near a synagogue', category: 'shabbat' },
  // משפחות — is_kid_friendly (general flag) + 10.8 detailed family filter
  { value: 'is_kid_friendly', label: 'ידידותי לילדים', labelEn: 'Kid-friendly', category: 'families' },
  { value: 'has_crib', label: 'מיטת תינוק', labelEn: 'Crib available', category: 'families' },
  { value: 'has_high_chair', label: 'כיסא אוכל', labelEn: 'High chair', category: 'families' },
  { value: 'has_pool_fence', label: 'גדר בטיחות לבריכה', labelEn: 'Pool safety fence', category: 'families' },
  { value: 'has_kids_toys', label: 'משחקי ילדים', labelEn: "Kids' toys", category: 'families' },
  { value: 'has_playground_equipment', label: 'מתקני חצר', labelEn: 'Yard play equipment', category: 'families' },
  // נגישות — 10.7, is_accessible stays as the general flag alongside the specifics
  { value: 'is_accessible', label: 'נגישות', labelEn: 'Accessible', category: 'accessibility' },
  { value: 'has_step_free_entrance', label: 'כניסה ללא מדרגות', labelEn: 'Step-free entrance', category: 'accessibility' },
  { value: 'has_accessible_bathroom', label: 'מקלחת נגישה', labelEn: 'Accessible bathroom', category: 'accessibility' },
  { value: 'has_grab_bars', label: 'ידיות אחיזה', labelEn: 'Grab bars', category: 'accessibility' },
  { value: 'has_accessible_parking', label: 'חניית נכים', labelEn: 'Accessible parking', category: 'accessibility' },
  { value: 'has_wide_doorways', label: 'פתחים רחבים', labelEn: 'Wide doorways', category: 'accessibility' },
];

export function amenitiesByCategory() {
  return AMENITY_CATEGORIES.map((cat) => ({
    ...cat,
    items: AMENITIES.filter((a) => a.category === cat.key),
  }));
}

// 11.6 — bed-type breakdown per unit (property_units.bed_config), replacing the old plain
// "number of beds" input. `sleeps` is how many guests one unit of this bed type accommodates —
// used to auto-suggest a unit's capacity (owners can still override max_guests manually).
export const BED_TYPES = [
  { value: 'double', label: 'מיטה זוגית', labelEn: 'Double bed', sleeps: 2, icon: 'BedDouble' },
  { value: 'king', label: 'מיטה זוגית רחבה (קינג)', labelEn: 'King bed', sleeps: 2, icon: 'BedDouble' },
  { value: 'twin', label: 'שתי מיטות יחיד', labelEn: 'Twin beds', sleeps: 2, icon: 'BedSingle' },
  { value: 'single', label: 'מיטת יחיד', labelEn: 'Single bed', sleeps: 1, icon: 'BedSingle' },
  { value: 'sofa_bed', label: 'ספה נפתחת', labelEn: 'Sofa bed', sleeps: 2, icon: 'Sofa' },
  { value: 'bunk_bed', label: 'מיטת קומותיים', labelEn: 'Bunk bed', sleeps: 2, icon: 'Layers' },
  { value: 'extra_mattress', label: 'מזרן נוסף', labelEn: 'Extra mattress', sleeps: 1, icon: 'SquareStack' },
  { value: 'crib', label: 'מיטת תינוק', labelEn: 'Crib', sleeps: 0, icon: 'Baby' },
];

export function bedTypeLabel(value, lang = 'he') {
  return pick(BED_TYPES.find((b) => b.value === value), value, lang);
}

/** suggestCapacity — sums `sleeps` across a bed_config array; used as the auto-calculated
 * recommendation the owner can still override by typing a different max_guests. */
export function suggestCapacity(bedConfig) {
  if (!Array.isArray(bedConfig)) return 0;
  return bedConfig.reduce((sum, row) => {
    const def = BED_TYPES.find((b) => b.value === row.type);
    return sum + (def ? def.sleeps * (Number(row.qty) || 0) : 0);
  }, 0);
}

/** bedConfigSummary — "2 מיטות זוגיות + ספה נפתחת" style summary for cards/unit lists. */
export function bedConfigSummary(bedConfig, lang = 'he') {
  if (!Array.isArray(bedConfig) || bedConfig.length === 0) return '';
  const parts = bedConfig.filter((row) => Number(row.qty) > 0).map((row) => {
    const label = bedTypeLabel(row.type, lang);
    const qty = Number(row.qty);
    return qty > 1 ? `${qty} ${label}` : label;
  });
  return parts.join(lang === 'en' ? ' + ' : ' + ');
}

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
  // בריכה
  has_private_pool: 'Waves',
  has_shared_pool: 'Waves',
  has_heated_pool: 'Waves',
  has_indoor_pool: 'Waves',
  has_kids_pool: 'Waves',
  has_secluded_pool: 'Waves',
  // ג'קוזי וספא
  has_private_jacuzzi: 'Sparkles',
  has_outdoor_jacuzzi: 'Sparkles',
  has_spa: 'Flower2',
  has_dry_sauna: 'Flame',
  has_wet_sauna: 'Flame',
  // בידור
  has_snooker_table: 'CircleDot',
  has_ping_pong: 'CircleDot',
  has_foosball: 'Gamepad2',
  has_game_console: 'Gamepad2',
  has_projector: 'Projector',
  has_home_cinema: 'Clapperboard',
  has_library: 'BookOpen',
  has_board_games: 'Dices',
  // חוץ
  has_bbq: 'Utensils',
  has_outdoor_seating: 'Armchair',
  has_hammocks: 'Palmtree',
  has_garden: 'Trees',
  has_lawn: 'Sprout',
  has_balcony: 'DoorOpen',
  has_view: 'Mountain',
  has_pergola: 'Trees',
  has_fire_pit: 'Flame',
  has_trampoline: 'CircleDot',
  has_swings: 'Palmtree',
  // מטבח
  has_equipped_kitchen: 'UtensilsCrossed',
  has_dishwasher: 'UtensilsCrossed',
  has_microwave: 'Microwave',
  has_coffee_machine: 'Coffee',
  has_toaster_oven: 'CookingPot',
  has_stovetop: 'Flame',
  has_oven: 'CookingPot',
  has_large_fridge: 'Refrigerator',
  // כללי
  has_air_conditioning: 'Wind',
  has_heating: 'Thermometer',
  has_wifi: 'Wifi',
  has_tv: 'Tv',
  has_washing_machine: 'WashingMachine',
  has_dryer: 'WashingMachine',
  has_parking: 'ParkingCircle',
  has_private_entrance: 'DoorOpen',
  is_pet_friendly: 'Dog',
  // שבת וכשרות
  has_shabbat_plata: 'Flame',
  has_shabbat_urn: 'Coffee',
  has_shabbat_clock: 'Clock',
  has_mechanical_key: 'KeyRound',
  is_near_eruv: 'MapPin',
  is_near_synagogue: 'MapPin',
  // משפחות
  is_kid_friendly: 'Baby',
  has_crib: 'Baby',
  has_high_chair: 'Armchair',
  has_pool_fence: 'Fence',
  has_kids_toys: 'Baby',
  has_playground_equipment: 'Baby',
  // נגישות
  is_accessible: 'Accessibility',
  has_step_free_entrance: 'DoorOpen',
  has_accessible_bathroom: 'Bath',
  has_grab_bars: 'Accessibility',
  has_accessible_parking: 'ParkingCircle',
  has_wide_doorways: 'DoorOpen',
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

export function viewTypeLabel(value, lang = 'he') {
  return pick(VIEW_TYPES.find((v) => v.value === value), value, lang);
}

export function amenityLabel(value, lang = 'he') {
  return pick(AMENITIES.find((a) => a.value === value), value, lang);
}

export function amenityCategoryLabel(key, lang = 'he') {
  const entry = AMENITY_CATEGORIES.find((c) => c.key === key);
  return lang === 'en' ? (entry?.labelEn || key) : (entry?.label || key);
}
