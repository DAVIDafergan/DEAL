import { AnomalyEngine } from '../anomaly-engine/index.js';

/**
 * DealScanner — מתאם בין שכבת המקורות (sources) למנוע האנומליות (anomaly-engine).
 * סורק רשימת מסלולים, רושם כל מחיר שמתקבל בהיסטוריה, ומפעיל שני סוגי callback:
 *   - onLivePriceFound: המחיר הזול ביותר שנמצא כרגע למסלול (תמיד, גם בלי היסטוריה) —
 *     "Best Live Prices", כדי שיהיו דילים אמיתיים להציג מהשנייה הראשונה.
 *   - onDealDetected: אנומליה אמיתית מול היסטוריה (כזו שעומדת בדרישת המינימום של 5 נקודות
 *     מידע היסטוריות), כפי שהיה קודם.
 *
 * Orchestrates sources -> anomaly-engine. Stays decoupled from AI/distribution/server by
 * accepting callbacks instead of importing those layers directly.
 */
export class DealScanner {
  /**
   * @param {number} requestDelayMs - השהיה בין מסלול למסלול בסריקה, כדי לא לעבור מכסות
   *   rate-limit של מקורות חיצוניים (למשל Travelpayouts) כשסורקים רשימת מסלולים גדולה.
   *   Delay between consecutive route scans to stay under external API rate limits.
   */
  constructor({
    sourceRegistry,
    anomalyEngine = new AnomalyEngine(),
    onDealDetected,
    onLivePriceFound,
    requestDelayMs = 0,
  }) {
    if (!sourceRegistry) {
      throw new Error('DealScanner requires a sourceRegistry');
    }
    this.sourceRegistry = sourceRegistry;
    this.anomalyEngine = anomalyEngine;
    this.onDealDetected = onDealDetected || (() => {});
    this.onLivePriceFound = onLivePriceFound || (() => {});
    this.requestDelayMs = requestDelayMs;
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
        const cheapestOffer = offers.reduce((min, offer) => (offer.price < min.price ? offer : min));
        try {
          await this.onLivePriceFound(cheapestOffer);
        } catch (err) {
          console.error(`[DealScanner] onLivePriceFound failed for ${origin}-${destination}:`, err.message);
        }
      }

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
}
