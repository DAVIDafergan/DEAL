import { getPool } from '../db/index.js';

/** בונה מזהה מסלול אחיד מ-origin/destination, כדי שהיסטוריית המחירים תהיה ניתנת להשוואה */
export function buildRouteKey(origin, destination) {
  return `${origin}-${destination}`.toUpperCase();
}

/**
 * PriceHistoryRepository — שכבת גישה לטבלת price_history (MySQL).
 * כל שאילתה עטופה ב-try/catch ומחזירה ברירת מחדל בטוחה בכשלון — כדי שכשל זמני בחיבור
 * ל-DB (למשל בעלייה הראשונה, לפני שה-pool התחבר) לא יפיל סריקה שלמה.
 * Pure data-access layer; no statistics here, that lives in anomalyDetector.js.
 */
export class PriceHistoryRepository {
  constructor(pool = getPool()) {
    this.pool = pool;
  }

  /** רושם תצפית מחיר בודדת עבור מסלול ותאריך טיסה נתונים */
  async recordPrice({ route, date, price, scannedAt }) {
    try {
      await this.pool.query('INSERT INTO price_history (route, date, price, scanned_at) VALUES (?, ?, ?, ?)', [
        route,
        date,
        price,
        new Date(scannedAt),
      ]);
    } catch (err) {
      console.error(`[PriceHistoryRepository] Failed to record price for ${route}:`, err.message);
    }
  }

  /** מחזיר את N נקודות ההיסטוריה האחרונות למסלול, מהישנה לחדשה */
  async getRecentHistory(route, limit = 90) {
    try {
      const [rows] = await this.pool.query(
        'SELECT route, date, price, scanned_at AS scannedAt FROM price_history WHERE route = ? ORDER BY scanned_at DESC LIMIT ?',
        [route, limit]
      );
      return rows
        .map((row) => ({ ...row, scannedAt: row.scannedAt instanceof Date ? row.scannedAt.toISOString() : row.scannedAt }))
        .reverse();
    } catch (err) {
      console.error(`[PriceHistoryRepository] Failed to read history for ${route}:`, err.message);
      return [];
    }
  }

  async countHistory(route) {
    try {
      const [rows] = await this.pool.query('SELECT COUNT(*) AS count FROM price_history WHERE route = ?', [route]);
      return Number(rows[0].count);
    } catch (err) {
      console.error(`[PriceHistoryRepository] Failed to count history for ${route}:`, err.message);
      return 0;
    }
  }
}
