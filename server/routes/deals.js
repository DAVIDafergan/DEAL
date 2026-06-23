import { Router } from 'express';
import { listDeals, getDealById } from '../store/dealsStore.js';
import { getVibeFeed, VIBES, ALL_VIBES_KEY } from '../../core/vibes/vibeFeedEngine.js';
import { validateDealIsLive } from '../../core/validation/dealValidator.js';
import { buildLiveDeal } from '../../core/validation/liveDealBuilder.js';
import { sourceRegistry } from '../../sources/index.js';
import { buildPackageDeps } from '../../core/packages/packageDeps.js';

const router = Router();
const SUPPORTED_LANGS = ['he', 'en', 'es'];

function resolveLang(query) {
  const lang = query.lang;
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
}

/**
 * GET /api/deals?lang=he|en|es&sorted=true — רשימת הדילים הפעילים (anomaly + live_price).
 * sorted=true: מחיר עולה (הזול ביותר ראשון). בלי הפרמטר: העדכני ביותר ראשון (feed/מפה).
 */
router.get('/', async (req, res) => {
  const lang = resolveLang(req.query);
  const sorted = req.query.sorted === 'true';
  const deals = await listDeals(lang, { sorted });
  res.json({ lang, deals, sorted });
});

/**
 * GET /api/deals/feed?vibe=all|urban|beach|nature|romantic&lang=he|en|es — כרטיסי ה"ווייב פיד".
 * vibe=all (ברירת מחדל בכניסה לפיד): כל הווייבים מאוחדים, ממוין מחיר עולה, deduped לפי יעד.
 * רשום לפני /:id בכוונה — אחרת "/feed" היה נתפס כ-:id ומחזיר 404 "Deal not found".
 */
router.get('/feed', async (req, res) => {
  const lang = resolveLang(req.query);
  const vibe = req.query.vibe;

  if (vibe !== ALL_VIBES_KEY && !VIBES.includes(vibe)) {
    return res.status(400).json({ error: `Invalid vibe. Must be one of: ${ALL_VIBES_KEY}, ${VIBES.join(', ')}` });
  }

  const cards = await getVibeFeed(vibe, lang);
  res.json({ vibe, lang, cards });
});

/**
 * GET /api/deals/validate-live?origin=&destination=&departureDate=&returnDate=&price= — בדיקה
 * חיה (לא מה-DB שלנו) ממש לפני שמשתמש לוחץ "הזמן" — האם המסלול/תאריך עדיין מופיע בתשובה
 * חיה של המקור, ובאיזה מחיר. רשום לפני /:id בכוונה (אחרת "validate-live" יתפס כ-:id).
 * מבוסס route params, לא deal id — כך אפשר לאמת גם דילים מ-packages/vibe_feed_cards, לא רק
 * מטבלת deals. ראו אזהרת המגבלה המבנית ב-core/validation/dealValidator.js.
 */
router.get('/validate-live', async (req, res) => {
  const { origin, destination, departureDate, returnDate, price } = req.query;
  if (!origin || !destination || !departureDate || !price) {
    return res.status(400).json({ error: 'origin, destination, departureDate, and price are required' });
  }

  const result = await validateDealIsLive({
    origin,
    destination,
    departureDate,
    returnDate: returnDate || null,
    price: Number(price),
  });
  res.json(result);
});

/**
 * GET /api/deals/build-live?origin=&destination=&departureDate=&returnDate=&peopleCount= —
 * "Live Deal Engine": בונה דיל מלא (טיסה+מלון+רכב/eSIM) ממש בזמן הקריאה, לא מ-cache. רשום
 * לפני /:id באותה סיבה כמו validate-live. ראו core/validation/liveDealBuilder.js להסבר
 * המגבלה האמיתית (Hotellook מאומת לא פעיל) ולממצא על מחיר-טיסה-לנוסע-בודד.
 */
router.get('/build-live', async (req, res) => {
  const { origin, destination, departureDate, returnDate } = req.query;
  const peopleCount = Math.max(1, Number(req.query.peopleCount) || 2);

  if (!origin || !destination || !departureDate) {
    return res.status(400).json({ error: 'origin, destination, and departureDate are required' });
  }

  const deps = buildPackageDeps(sourceRegistry);
  const result = await buildLiveDeal({
    origin,
    destination,
    departureDate,
    returnDate: returnDate || null,
    peopleCount,
    marker: deps.marker,
    carRentalUrlTemplate: deps.carRentalUrlTemplate,
    esimUrlTemplate: deps.esimUrlTemplate,
    hotellookApiToken: deps.apiToken,
  });
  res.json(result);
});

/** GET /api/deals/:id?lang=he|en|es — פרטי דיל בודד */
router.get('/:id', async (req, res) => {
  const lang = resolveLang(req.query);
  const deal = await getDealById(req.params.id, lang);

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  res.json(deal);
});

export default router;
