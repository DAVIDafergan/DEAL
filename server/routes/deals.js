import { Router } from 'express';
import { listDeals, getDealById } from '../store/dealsStore.js';

const router = Router();
const SUPPORTED_LANGS = ['he', 'en', 'es'];

function resolveLang(query) {
  const lang = query.lang;
  return SUPPORTED_LANGS.includes(lang) ? lang : 'en';
}

/** GET /api/deals?lang=he|en|es — רשימת הדילים הפעילים */
router.get('/', (req, res) => {
  const lang = resolveLang(req.query);
  res.json({ lang, deals: listDeals(lang) });
});

/** GET /api/deals/:id?lang=he|en|es — פרטי דיל בודד */
router.get('/:id', (req, res) => {
  const lang = resolveLang(req.query);
  const deal = getDealById(req.params.id, lang);

  if (!deal) {
    return res.status(404).json({ error: 'Deal not found' });
  }

  res.json(deal);
});

export default router;
