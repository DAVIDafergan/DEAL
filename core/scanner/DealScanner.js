import { AnomalyEngine } from '../anomaly-engine/index.js';

/** מוסיף ימים לתאריך ISO (YYYY-MM-DD) ומחזיר תאריך ISO חדש */
function addDaysToDate(isoDate, days) {
  const date = new Date(isoDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * DealScanner — מתאם בין שכבת המקורות (sources) למנוע האנומליות (anomaly-engine).
 * סורק רשימת מסלולים, רושם כל מחיר שמתקבל בהיסטוריה, ומפעיל שני סוגי callback:
 *   - onLivePriceFound: המחיר הזול ביותר שנמצא כרגע למסלול (תמיד, גם בלי היסטוריה) —
 *     "Best Live Prices". מנסה להעשיר עם מחיר הלוך-חזור אמיתי (לא רק one-way) — אם המקור
 *     תומך בכך, המחיר המוצג הוא מחיר ה-round-trip האמיתי, לא רק כיוון אחד.
 *   - onDealDetected: אנומליה אמיתית מול היסטוריה (כזו שעומדת בדרישת המינימום של 5 נקודות
 *     מידע היסטוריות). נשאר one-way במכוון — שינוי הבסיס לround-trip היה משבש את ממוצע
 *     ההיסטוריה הקיים (price_history). ראו README לפירוט ההחלטה הזו.
 *
 * Orchestrates sources -> anomaly-engine. Stays decoupled from AI/distribution/server by
 * accepting callbacks instead of importing those layers directly.
 */
export class DealScanner {
  /**
   * @param {number} requestDelayMs - השהיה בין מסלול למסלול בסריקה, כדי לא לעבור מכסות
   *   rate-limit של מקורות חיצוניים (למשל Travelpayouts) כשסורקים רשימת מסלולים גדולה.
   * @param {number} returnTripDays - הנחת אורך חופשה לצורך חיפוש הלוך-חזור (תצוגה בלבד,
   *   לא נתון אמיתי מהמשתמש — אין לנו תאריך חזרה אמיתי בסריקה האוטומטית).
   */
  constructor({
    sourceRegistry,
    anomalyEngine = new AnomalyEngine(),
    onDealDetected,
    onLivePriceFound,
    requestDelayMs = 0,
    returnTripDays = 7,
  }) {
    if (!sourceRegistry) {
      throw new Error('DealScanner requires a sourceRegistry');
    }
    this.sourceRegistry = sourceRegistry;
    this.anomalyEngine = anomalyEngine;
    this.onDealDetected = onDealDetected || (() => {});
    this.onLivePriceFound = onLivePriceFound || (() => {});
    this.requestDelayMs = requestDelayMs;
    this.returnTripDays = returnTripDays;
  }

  /**
   * @param {Array<{origin:string, destination:string, date:string}>} routes
   * @returns {Promise<Array>} כל הדילים (אנומליות) שזוהו בסריקה הזו
   */
  async scanRoutes(routes) {
    const detectedDeals = [];

    for (let i = 0; i < routes.length; i += 1) {
      const { origin, destination, date } = routes[i];

      let offers = [];
      try {
        offers = await this.sourceRegistry.searchAll(origin, destination, date);
      } catch (err) {
        // מקור שנכשל לא צריך לעצור את כל הסריקה
        offers = [];
      }

      // "Best Live Prices": המחיר הזול ביותר שנמצא כרגע למסלול הזה, ללא תלות בהיסטוריה
      if (offers.length > 0) {
        const cheapestOneWay = offers.reduce((min, offer) => (offer.price < min.price ? offer : min));
        const livePriceOffer = await this._enrichWithRoundTrip(origin, destination, date, cheapestOneWay);

        try {
          await this.onLivePriceFound(livePriceOffer);
        } catch (err) {
          console.error(`[DealScanner] onLivePriceFound failed for ${origin}-${destination}:`, err.message);
        }
      }

      // אנומליות: נשאר one-way תמיד, כדי לא לשבש את ממוצע ההיסטוריה הקיים
      for (const offer of offers) {
        const analysis = await this.anomalyEngine.recordAndAnalyze({
          origin,
          destination,
          date,
          price: offer.price,
          scannedAt: new Date().toISOString(),
        });

        if (analysis.isAnomaly) {
          const deal = { offer, analysis };
          detectedDeals.push(deal);
          await this.onDealDetected(deal);
        }
      }

      const isLastRoute = i === routes.length - 1;
      if (this.requestDelayMs > 0 && !isLastRoute) {
        await new Promise((resolve) => setTimeout(resolve, this.requestDelayMs));
      }
    }

    return detectedDeals;
  }

  /**
   * מנסה למצוא מחיר הלוך-חזור אמיתי למסלול (best-effort) — אם נמצא, המחיר המוצג כ-"live price"
   * הוא מחיר ה-round-trip האמיתי (לא ה-one-way), כדי שתצוגת "TLV → BCN ← TLV" תמיד תשקף את
   * המחיר שבאמת מוצג. אם נכשל/לא נמצא, נשארים עם ה-one-way הקיים — לא ממציאים round-trip.
   */
  async _enrichWithRoundTrip(origin, destination, date, fallbackOneWayOffer) {
    try {
      const returnDate = addDaysToDate(date, this.returnTripDays);
      const roundTripOffers = await this.sourceRegistry.searchAllRoundTrip(origin, destination, date, returnDate);

      if (roundTripOffers.length === 0) return fallbackOneWayOffer;

      return roundTripOffers.reduce((min, offer) => (offer.price < min.price ? offer : min));
    } catch (err) {
      console.error(`[DealScanner] Round-trip enrichment failed for ${origin}-${destination}:`, err.message);
      return fallbackOneWayOffer;
    }
  }
}
