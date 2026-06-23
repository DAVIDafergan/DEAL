import { Router } from 'express';
import { listDeals, getDealById } from '../store/dealsStore.js';
import { getVibeFeed, VIBES, ALL_VIBES_KEY } from '../../core/vibes/vibeFeedEngine.js';

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
