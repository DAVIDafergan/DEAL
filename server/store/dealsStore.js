import crypto from 'node:crypto';

/**
 * DealsStore — מאגר in-memory של דילים פעילים.
 * In-memory store of active deals. Swappable for a real DB later without touching routes —
 * routes only depend on this module's exported functions.
 */
const deals = new Map();

/**
 * @param {{offer: object, analysis: object, narrative: {he:object,en:object,es:object}}} dealData
 */
export function addDeal(dealData) {
  const id = crypto.randomUUID();
  const deal = {
    id,
    createdAt: new Date().toISOString(),
    ...dealData,
  };
  deals.set(id, deal);
  return deal;
}

/** מחזיר את כל הדילים, עם הנרטיב מתורגם לשפה המבוקשת בלבד */
export function listDeals(lang = 'en') {
  return Array.from(deals.values())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((deal) => projectDeal(deal, lang));
}

export function getDealById(id, lang = 'en') {
  const deal = deals.get(id);
  return deal ? projectDeal(deal, lang) : null;
}

/** ממיר דיל גולמי (עם נרטיב בכל השפות) למבנה ציבורי עם שפה אחת נבחרת */
function projectDeal(deal, lang) {
  const narrative = deal.narrative?.[lang] || deal.narrative?.en;
  return {
    id: deal.id,
    createdAt: deal.createdAt,
    origin: deal.offer.origin,
    destination: deal.offer.destination,
    departureDate: deal.offer.departureDate,
    price: deal.offer.price,
    currency: deal.offer.currency,
    carrier: deal.offer.carrier,
    stops: deal.offer.stops,
    source: deal.offer.source,
    movingAverage: deal.analysis.movingAverage,
    zScore: deal.analysis.zScore,
    enforcementLikelihood: deal.analysis.enforcementLikelihood,
    lang,
    title: narrative?.title,
    description: narrative?.description,
    riskWarning: narrative?.riskWarning,
  };
}

/** לשימוש בטסטים בלבד */
export function _clearDealsStore() {
  deals.clear();
}
