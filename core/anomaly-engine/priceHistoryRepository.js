import { getDb } from './database.js';

/** בונה מזהה מסלול אחיד מ-origin/destination, כדי שהיסטוריית המחירים תהיה ניתנת להשוואה */
export function buildRouteKey(origin, destination) {
  return `${origin}-${destination}`.toUpperCase();
}

/**
 * PriceHistoryRepository — שכבת גישה לטבלת price_history.
 * Pure data-access layer; no statistics here, that lives in anomalyDetector.js.
 */
export class PriceHistoryRepository {
  constructor(db = getDb()) {
    this.db = db;
  }

  /** רושם תצפית מחיר בודדת עבור מסלול ותאריך טיסה נתונים */
  recordPrice({ route, date, price, scannedAt }) {
    const stmt = this.db.prepare(
      'INSERT INTO price_history (route, date, price, scanned_at) VALUES (?, ?, ?, ?)'
    );
    stmt.run(route, date, price, scannedAt);
  }

  /** מחזיר את N נקודות ההיסטוריה האחרונות למסלול, מהישנה לחדשה */
  getRecentHistory(route, limit = 90) {
    const stmt = this.db.prepare(
      'SELECT route, date, price, scanned_at as scannedAt FROM price_history WHERE route = ? ORDER BY scanned_at DESC LIMIT ?'
    );
    return stmt.all(route, limit).reverse();
  }

  countHistory(route) {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM price_history WHERE route = ?');
    return stmt.get(route).count;
  }
}
