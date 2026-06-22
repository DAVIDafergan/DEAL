import { getDestinationTags, estimateIlsPrice } from '../data/destinationTags.js';

/** מסנן את רשימת הדילים לפי קהל/סוג יעד (תיוג עורכי) ותקציב (מחושב על המחיר האמיתי של הדיל) */
export function filterDeals(deals, { audience, type, budget }) {
  if (!audience && !type && !budget) return deals;

  return deals.filter((deal) => {
    const tags = getDestinationTags(deal.destination);
    if (audience && !tags.audiences.includes(audience)) return false;
    if (type && !tags.types.includes(type)) return false;
    if (budget && estimateIlsPrice(deal.price) > Number(budget)) return false;
    return true;
  });
}
