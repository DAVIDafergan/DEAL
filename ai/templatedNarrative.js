/**
 * נרטיב תלת-לשוני לדילי "Best Live Prices" — בלי קריאה ל-Claude.
 * דילים מסוג live_price מתעדכנים בכל סריקה (עד פעם בשעה, לכל אחד מ-~40 המסלולים), כך שקריאת
 * AI על כל עדכון תהיה יקרה ולא נחוצה — אלו הצגת מחיר עכשווי, לא ניתוח/שיווק יצירתי.
 *
 * Templated tri-lingual narrative for "live_price" deals — deliberately skips Claude to avoid
 * an AI call on every scan refresh for ~40 routes; this is a plain price snapshot, not creative
 * copy, so a deterministic template is the right tool here.
 */
export function buildLivePriceNarrative(offer) {
  const route = `${offer.origin} → ${offer.destination}`;
  const price = Math.round(offer.price);

  return {
    he: {
      title: `המחיר הזול ביותר כרגע: ${route}`,
      description: `${price} ${offer.currency} לטיסה ב-${offer.departureDate}${
        offer.stops === 0 ? ', ללא חניות' : `, ${offer.stops} חניות`
      }.`,
      riskWarning: 'זהו המחיר הזול ביותר שנמצא כרגע על ידי Travelpayouts — לא בוצעה השוואה להיסטוריית מחירים.',
    },
    en: {
      title: `Best current price: ${route}`,
      description: `${price} ${offer.currency} on ${offer.departureDate}${
        offer.stops === 0 ? ', nonstop' : `, ${offer.stops} stop(s)`
      }.`,
      riskWarning: 'This is the cheapest price currently found by Travelpayouts — not compared against price history.',
    },
    es: {
      title: `Mejor precio actual: ${route}`,
      description: `${price} ${offer.currency} el ${offer.departureDate}${
        offer.stops === 0 ? ', directo' : `, ${offer.stops} escala(s)`
      }.`,
      riskWarning: 'Este es el precio más barato encontrado actualmente por Travelpayouts — no comparado con el historial.',
    },
  };
}
