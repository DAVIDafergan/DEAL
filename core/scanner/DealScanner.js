import { AnomalyEngine } from '../anomaly-engine/index.js';

/**
 * DealScanner — מתאם בין שכבת המקורות (sources) למנוע האנומליות (anomaly-engine).
 * סורק רשימת מסלולים, רושם כל מחיר שמתקבל בהיסטוריה, ומפעיל callback בכל פעם שמתגלה אנומליה
 * אמיתית (כזו שעומדת בדרישת המינימום של 5 נקודות מידע היסטוריות).
 *
 * Orchestrates sources -> anomaly-engine. Stays decoupled from AI/distribution/server by
 * accepting an `onDealDetected` callback instead of importing those layers directly.
 */
export class DealScanner {
  constructor({ sourceRegistry, anomalyEngine = new AnomalyEngine(), onDealDetected }) {
    if (!sourceRegistry) {
      throw new Error('DealScanner requires a sourceRegistry');
    }
    this.sourceRegistry = sourceRegistry;
    this.anomalyEngine = anomalyEngine;
    this.onDealDetected = onDealDetected || (() => {});
  }

  /**
   * @param {Array<{origin:string, destination:string, date:string}>} routes
   * @returns {Promise<Array>} כל הדילים (אנומליות) שזוהו בסריקה הזו
   */
  async scanRoutes(routes) {
    const detectedDeals = [];

    for (const { origin, destination, date } of routes) {
      let offers = [];
      try {
        offers = await this.sourceRegistry.searchAll(origin, destination, date);
      } catch (err) {
        // מקור שנכשל לא צריך לעצור את כל הסריקה
        continue;
      }

      for (const offer of offers) {
        const analysis = this.anomalyEngine.recordAndAnalyze({
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
    }

    return detectedDeals;
  }
}
