import { getPool } from '../../core/db/index.js';

/**
 * StatsStore — סטטיסטיקות תפעוליות (כמה דילים נשלחו, חיסכון ממוצע), נשמרות בטבלת deals_sent
 * ב-MySQL כך שלא מתאפסות ב-restart. Derived only from real recorded sends — never fabricated.
 */

/** נקרא בכל פעם שדיל מופץ בהצלחה לפחות לערוץ אחד */
export async function recordDealSent({ savingsPercent }) {
  try {
    const pool = getPool();
    await pool.query('INSERT INTO deals_sent (savings_percent, sent_at) VALUES (?, ?)', [savingsPercent, new Date()]);
  } catch (err) {
    console.error('[statsStore] Failed to record sent deal:', err.message);
  }
}

export async function getStats() {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT COUNT(*) AS dealsSent, AVG(savings_percent) AS avgSavings FROM deals_sent');
    const { dealsSent, avgSavings } = rows[0];
    return {
      dealsSent: Number(dealsSent) || 0,
      averageSavingsPercent: avgSavings === null ? 0 : Math.round(Number(avgSavings)),
    };
  } catch (err) {
    console.error('[statsStore] Failed to read stats:', err.message);
    return { dealsSent: 0, averageSavingsPercent: 0 };
  }
}
