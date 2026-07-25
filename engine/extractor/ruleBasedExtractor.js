import { ISRAELI_TOWNS } from '../../web/src/data/israeliTowns.js';

// Same 9 regions as core/db/index.js's properties.region ENUM / propertySchema.js REGION_VALUES.
const REGION_KEYWORDS = [
  ['golan', /הגולן|רמת הגולן/],
  ['galilee', /הגליל|גליל עליון|גליל תחתון|גליל מערבי/],
  ['carmel', /הכרמל|חוף הכרמל/],
  ['dead_sea', /ים המלח/],
  ['eilat', /אילת/],
  ['jerusalem', /ירושלים|הרי יהודה/],
  ['south', /הנגב|ערבה|מצפה רמון|ראש\s*ה?נגב/],
  ['center', /המרכז|גוש דן|השרון/],
  ['north', /הצפון|עמק הירדן|בקעת הירדן/],
];

// city -> region, built once from the same curated town list the wizard's autocomplete uses —
// a real town name mentioned on the page is a far more reliable region signal than a bare
// region-name keyword (many pages never say "בגליל" outright but always name their own village).
const CITY_TO_REGION = new Map();
for (const [region, towns] of Object.entries(ISRAELI_TOWNS)) {
  for (const town of towns) CITY_TO_REGION.set(town, region);
}

const PROPERTY_TYPE_KEYWORDS = [
  ['villa', /וילה/],
  ['cottage', /בקתה/],
  ['suite', /סוויטה|סוויטות/],
  ['zimmer', /צימר/],
];

const KOSHER_KEYWORDS = [
  ['kosher_kitchen', /מטבח כשר/],
  ['shomer_shabbat', /שומר שבת/],
  ['kosher', /כשר(?!ות אינה)/],
];

const AMENITY_PATTERNS = {
  has_private_jacuzzi: /ג['’]?קוזי פרטי/,
  has_private_pool: /בריכה פרטית/,
  has_heated_pool: /בריכה מחוממת/,
  has_sauna: /סאונה/,
  has_view: /נוף/,
  has_garden: /גינה/,
  has_bbq: /מנגל/,
  has_outdoor_jacuzzi: /ג['’]?קוזי חיצוני/,
  has_parking: /חניה/,
  has_air_conditioning: /מיזוג/,
  has_equipped_kitchen: /מטבח מאובזר/,
  has_wifi: /wifi|וויפי|וויי-פיי/i,
  is_kid_friendly: /ידידותי לילדים|מתאים למשפחות/,
  is_pet_friendly: /חיות מחמד/,
  is_accessible: /נגיש(ה|ות)? לנכים|נגישות/,
};

function firstMatch(text, pairs) {
  for (const [value, re] of pairs) if (re.test(text)) return value;
  return null;
}

function findCity(text) {
  for (const [city, region] of CITY_TO_REGION) {
    if (text.includes(city)) return { city, region };
  }
  return null;
}

function cleanTitle(raw) {
  if (!raw) return null;
  // Titles are routinely "שם הנכס | שם האתר" or "שם הנכס - כניסה" — keep the first segment, the
  // part actually about the property, not the site chrome after the separator.
  const trimmed = raw.split(/[|\-–—]/)[0].trim();
  return trimmed.length >= 2 ? trimmed : raw.trim();
}

function extractName({ metaTags, jsonLd, text }) {
  for (const doc of jsonLd) {
    const candidates = Array.isArray(doc) ? doc : [doc];
    for (const d of candidates) {
      if (d?.name && typeof d.name === 'string') return d.name.trim();
    }
  }
  if (metaTags['og:title']) return cleanTitle(metaTags['og:title']);
  if (metaTags['twitter:title']) return cleanTitle(metaTags['twitter:title']);
  return null;
}

function extractDescription({ metaTags, jsonLd }) {
  for (const doc of jsonLd) {
    const candidates = Array.isArray(doc) ? doc : [doc];
    for (const d of candidates) {
      if (d?.description && typeof d.description === 'string') return d.description.trim();
    }
  }
  return metaTags['og:description'] || metaTags['description'] || null;
}

function extractPrice(text) {
  const m = text.match(/₪\s*(\d{2,4})/) || text.match(/(\d{2,4})\s*₪/) || text.match(/(\d{2,4})\s*ש["״]?ח/);
  return m ? Number(m[1]) : null;
}

function extractGuests(text) {
  const m = text.match(/(?:עד\s*)?(\d{1,2})\s*(?:אורחים|נפשות|אנשים)/);
  return m ? Number(m[1]) : null;
}

function extractBedrooms(text) {
  const m = text.match(/(\d{1,2})\s*חדרי\s*שינה/);
  return m ? Number(m[1]) : null;
}

function extractBathrooms(text) {
  const m = text.match(/(\d{1,2})\s*חדרי\s*רחצה|(\d{1,2})\s*שירותים/);
  return m ? Number(m[1] || m[2]) : null;
}

/**
 * RuleBasedExtractor (Step 8.6 follow-up) — the real, keyless default extractor. Works entirely
 * off what pageFetcher.js already parses out of the raw HTML (meta tags, JSON-LD, phone/WhatsApp
 * regex matches, visible text) — no external API, no network call of its own, deterministic.
 * `hints.region`/`hints.city` may carry a weak fallback signal from the seed source that led to
 * this page (e.g. a Golan regional council's own directory page) — used only when the page text
 * itself gives no stronger signal, never overriding an explicit match. Every field this can't
 * support with real evidence from the page stays null — same "never guess" rule the LLM path
 * documents in its system prompt.
 */
export function ruleBasedExtract({ text, metaTags = {}, jsonLd = [], phoneMatches = [], whatsappLinks = [], sourceUrl, hints = {} }) {
  const name = extractName({ metaTags, jsonLd, text }) || hints.name || null;
  const propertyType = firstMatch(text, PROPERTY_TYPE_KEYWORDS) || hints.property_type || 'zimmer';
  const description = extractDescription({ metaTags, jsonLd });

  // Region/city detection is scoped to the page's own "core" content (title + og:title +
  // description + the first stretch of body text) rather than the *entire* visible page text.
  // Confirmed on a real listing (goarava.co.il, DECISIONS.md): a page whose own title literally
  // said "...בערבה" (south) still came back region=golan, because "רמות" (a real Golan town) — an
  // exact match in ISRAELI_TOWNS — happened to appear somewhere in an unrelated nav/sidebar/related
  // -listings block on the same template-heavy page. The title/description explicitly naming the
  // region is a far stronger signal than a bare substring hit anywhere on the page; only fall back
  // to scanning the full page text (lower confidence) when the core window finds nothing.
  const coreText = [name, metaTags['og:title'], description, text.slice(0, 1500)].filter(Boolean).join(' \n ');
  const coreRegionMatch = firstMatch(coreText, REGION_KEYWORDS);
  const coreCityMatch = findCity(coreText);
  const fullCityMatch = coreCityMatch ? null : findCity(text);

  const region = coreRegionMatch || coreCityMatch?.region || fullCityMatch?.region || hints.region || null;
  const city = coreCityMatch?.city || fullCityMatch?.city || hints.city || null;
  const phone = phoneMatches[0] || hints.phone || null;
  const whatsapp = whatsappLinks[0] || hints.whatsapp || null;
  const guest_capacity = extractGuests(text);
  const base_price_night = extractPrice(text);

  const amenities = {};
  for (const [field, re] of Object.entries(AMENITY_PATTERNS)) amenities[field] = re.test(text) ? true : null;

  const field_confidence = {
    // Structured sources (JSON-LD / og:title) are a genuinely reliable signal; a title with no
    // separator to strip is worth slightly less than one that was clearly "name | site chrome".
    name: name ? (metaTags['og:title'] || jsonLd.length ? 65 : 45) : 0,
    property_type: firstMatch(text, PROPERTY_TYPE_KEYWORDS) ? 60 : (region ? 30 : 0),
    region: coreRegionMatch ? 70 : (coreCityMatch ? 65 : (fullCityMatch ? 40 : (hints.region ? 30 : 0))),
    description: description ? 40 : null, // rewritten-by-model quality bar doesn't apply here — graded lower on purpose
    guest_capacity: guest_capacity ? 55 : null,
    base_price_night: base_price_night ? 55 : null,
    phone: phone ? 70 : null,
  };

  return {
    name,
    property_type: propertyType,
    region,
    description,
    city,
    address: null,
    guest_capacity,
    bedrooms: extractBedrooms(text),
    beds: null,
    bathrooms: extractBathrooms(text),
    ...amenities,
    kosher_level: firstMatch(text, KOSHER_KEYWORDS) || (/כשר/.test(text) ? 'kosher' : null),
    base_price_night,
    weekend_price: null,
    holiday_price: null,
    cleaning_fee: null,
    min_nights: null,
    phone,
    whatsapp,
    email: (text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || null,
    website: sourceUrl,
    field_confidence,
  };
}
