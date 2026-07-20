import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectWithRetry } from '../core/db/index.js';
import { createAgent, findAgentByEmail } from '../server/store/agentStore.js';
import { createProperty, upsertAutoCollectedProperty } from '../server/store/propertyStore.js';

// Local-dev-only seed data — creates 30 varied demo properties (mix of owner-claimed and
// auto-collected-shaped, published and pending-review) so the site can be browsed fully
// populated locally. Never touches production (uses the same local DB connection as `npm start`).

const REGIONS = ['north', 'galilee', 'golan', 'carmel', 'center', 'jerusalem', 'south', 'dead_sea', 'eilat'];
const PROPERTY_TYPES = ['zimmer', 'villa', 'cottage', 'suite'];
const CITIES = {
  north: ['קריית שמונה', 'מטולה', 'ראש פינה'], galilee: ['צפת', 'כרמיאל', 'עכו'],
  golan: ['קצרין', 'רמת מגשימים'], carmel: ['עין הוד', 'זכרון יעקב', 'חיפה'],
  center: ['הרצליה', 'רעננה'], jerusalem: ['ירושלים', 'מבשרת ציון'],
  south: ['באר שבע', 'מצפה רמון'], dead_sea: ['עין בוקק', 'קליה'], eilat: ['אילת'],
};
const NAME_PREFIXES = { zimmer: 'צימר', villa: 'וילת', cottage: 'בקתת', suite: 'סוויטת' };
const NAME_SUFFIXES = ['האגמים', 'ההרים', 'הכוכבים', 'הזית', 'הגפן', 'הנחל', 'האורנים', 'השקד', 'הרימון', 'הדקל'];
const AMENITY_FIELDS = [
  'has_private_jacuzzi', 'has_private_pool', 'has_heated_pool', 'has_sauna', 'has_view',
  'has_garden', 'has_bbq', 'has_outdoor_jacuzzi', 'has_parking', 'has_air_conditioning',
  'has_equipped_kitchen', 'has_wifi', 'is_kid_friendly', 'is_pet_friendly', 'is_accessible',
];
const KOSHER_LEVELS = ['not_applicable', 'not_applicable', 'not_applicable', 'kosher', 'shomer_shabbat'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

async function ensureDemoOwner(email, businessName, password) {
  const existing = await findAgentByEmail(email);
  if (existing) return existing.id;
  const password_hash = await bcrypt.hash(password, 12);
  const { id } = await createAgent({
    business_name: businessName, contact_name: businessName, email, password_hash,
    phone: `05${randInt(0, 9)}${randInt(1000000, 9999999)}`,
    whatsapp_number: `05${randInt(0, 9)}${randInt(1000000, 9999999)}`,
    account_type: 'property_owner',
  });
  return id;
}

function buildProperty(i) {
  const region = pick(REGIONS);
  const property_type = pick(PROPERTY_TYPES);
  const city = pick(CITIES[region]);
  const amenities = Object.fromEntries(pickN(AMENITY_FIELDS, randInt(3, 8)).map((f) => [f, true]));
  const basePrice = randInt(35, 200) * 10;
  return {
    name: `${NAME_PREFIXES[property_type]} ${pick(NAME_SUFFIXES)} ${i}`,
    description: `${NAME_PREFIXES[property_type]} מרווח ב${city}, מושלם לזוגות ומשפחות המחפשים מנוחה ושקט.`,
    property_type,
    region,
    city,
    address: `רחוב הראשי ${randInt(1, 40)}, ${city}`,
    guest_capacity: randInt(2, 12),
    bedrooms: randInt(1, 5),
    beds: randInt(1, 6),
    bathrooms: randInt(1, 3),
    ...amenities,
    kosher_level: pick(KOSHER_LEVELS),
    base_price_night: basePrice,
    weekend_price: Math.round(basePrice * 1.2),
    holiday_price: Math.round(basePrice * 1.5),
    cleaning_fee: randInt(0, 3) === 0 ? randInt(80, 250) : null,
    min_nights: pick([1, 1, 2, 2, 3]),
    currency: 'ILS',
    phone: `0${pick([2, 3, 4, 8, 9])}${randInt(1000000, 9999999)}`,
    whatsapp: `972${5}${randInt(0, 9)}${randInt(1000000, 9999999)}`,
    website: `https://example-${i}.co.il`,
  };
}

async function main() {
  await connectWithRetry();
  console.log('[seed] Creating demo owners...');
  const owner1 = await ensureDemoOwner('demo-owner-1@example.local', 'צימרי הגליל בע"מ', 'demopass123');
  const owner2 = await ensureDemoOwner('demo-owner-2@example.local', 'וילות הכרמל', 'demopass123');
  const owners = [owner1, owner2];

  console.log('[seed] Creating 30 demo properties...');
  let created = 0;
  for (let i = 1; i <= 30; i++) {
    const data = buildProperty(i);
    if (i <= 12) {
      // Claimed — owned by one of the demo owners, fully manageable in their dashboard.
      await createProperty(pick(owners), { ...data, owner_images: [] });
    } else if (i <= 25) {
      // Auto-collected, published (confidence >= 60) — the bulk of unclaimed public listings.
      await upsertAutoCollectedProperty({ ...data, confidence: randInt(60, 95), source_url: data.website, source_image_urls: [] });
    } else {
      // Auto-collected, pending review (confidence < 60) — populates the admin review queue.
      await upsertAutoCollectedProperty({ ...data, confidence: randInt(20, 59), source_url: data.website, source_image_urls: [] });
    }
    created += 1;
  }
  console.log(`[seed] Done — ${created} properties created across ${owners.length} demo owners.`);
  console.log('[seed] Demo owner logins: demo-owner-1@example.local / demo-owner-2@example.local, password: demopass123');
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] FAILED:', err);
  process.exit(1);
});
