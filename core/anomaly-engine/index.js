import { PriceHistoryRepository, buildRouteKey } from './priceHistoryRepository.js';
import { AnomalyDetector } from './anomalyDetector.js';

/**
 * AnomalyEngine — חוט מקשר בין persistence (MySQL) לבין הסטטיסטיקה הטהורה.
 * Facade combining persistence (repository) and pure statistics (detector).
 */
export class AnomalyEngine {
  constructor({ repository = new PriceHistoryRepository(), detector = new AnomalyDetector() } = {}) {
    this.repository = repository;
    this.detector = detector;
  }

  /**
   * רושם תצפית מחיר חדשה, ובודק האם היא אנומליה לעומת ההיסטוריה הקיימת (לפני שנרשמה).
   * Records a new price observation and checks it against history recorded *before* this point.
   */
  async recordAndAnalyze({ origin, destination, date, price, scannedAt }) {
    const route = buildRouteKey(origin, destination);
    const history = await this.repository.getRecentHistory(route);

    const analysis = this.detector.analyze(history, price);

    await this.repository.recordPrice({ route, date, price, scannedAt });

    return { route, ...analysis };
  }
}

export { PriceHistoryRepository, buildRouteKey } from './priceHistoryRepository.js';
export { AnomalyDetector } from './anomalyDetector.js';
