const MIN_HISTORY_POINTS = 5;
const MOVING_AVERAGE_WINDOW_DAYS = 90;
const ANOMALY_Z_SCORE_THRESHOLD = -2; // מחיר ש"חורג" סטטיסטית מטה — דיל פוטנציאלי

/**
 * AnomalyDetector — סטטיסטיקה טהורה על היסטוריית מחירים. אין כאן I/O.
 * Pure statistics over price history. No I/O here — the repository handles persistence.
 */
export class AnomalyDetector {
  /**
   * @param {Array<{price:number, scannedAt:string}>} history - עד 90 הימים האחרונים, מהישן לחדש
   * @param {number} currentPrice
   * @returns {AnomalyResult}
   */
  analyze(history, currentPrice) {
    const windowed = this._withinWindow(history, MOVING_AVERAGE_WINDOW_DAYS);

    // אל תסמן אנומליה בלי לפחות 5 נקודות מידע היסטוריות למסלול — דרישה קריטית מהמפרט
    if (windowed.length < MIN_HISTORY_POINTS) {
      return {
        isAnomaly: false,
        reason: 'insufficient_history',
        historyCount: windowed.length,
        requiredHistoryCount: MIN_HISTORY_POINTS,
        movingAverage: null,
        stdDev: null,
        zScore: null,
        enforcementLikelihood: null,
        explanation: `אין מספיק נתוני היסטוריה למסלול (${windowed.length}/${MIN_HISTORY_POINTS} נקודות נדרשות). לא ניתן לחשב אנומליה באופן אמין.`,
      };
    }

    const prices = windowed.map((h) => h.price);
    const { mean, stdDev } = this._calculateStats(prices);

    // סטיית תקן אפס (כל המחירים זהים) — אין שונות, אין אנומליה אפשרית
    if (stdDev === 0) {
      return {
        isAnomaly: false,
        reason: 'no_price_variance',
        historyCount: windowed.length,
        movingAverage: mean,
        stdDev: 0,
        zScore: 0,
        enforcementLikelihood: null,
        explanation: 'המחיר ההיסטורי של המסלול קבוע ללא שינוי, כך שלא ניתן לחשב חריגה סטטיסטית.',
      };
    }

    const zScore = (currentPrice - mean) / stdDev;
    const isAnomaly = zScore <= ANOMALY_Z_SCORE_THRESHOLD;
    const enforcementLikelihood = isAnomaly ? this._calculateEnforcementLikelihood(zScore) : null;

    return {
      isAnomaly,
      reason: isAnomaly ? 'price_anomaly' : 'within_normal_range',
      historyCount: windowed.length,
      movingAverage: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
      enforcementLikelihood,
      explanation: this._buildExplanation({ isAnomaly, zScore, mean, currentPrice, enforcementLikelihood, historyCount: windowed.length }),
    };
  }

  _withinWindow(history, days) {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return history.filter((h) => new Date(h.scannedAt).getTime() >= cutoff);
  }

  _calculateStats(prices) {
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
    return { mean, stdDev: Math.sqrt(variance) };
  }

  /**
   * דירוג "סבירות אכיפה" (0-100): הסבירות שמדובר במחיר אמיתי שהחברה תכבד אותו (יאושר בפועל),
   * לעומת "פאדיחת תמחור" (fare error) שצפויה להתבטל. ככל שהחריגה קיצונית יותר —
   * כך גדל הסיכוי שזו טעות תמחור שלא תיכבד, ולכן הציון נמוך יותר.
   * Enforcement-likelihood score: how likely the airline will honor this fare rather than
   * cancel it as a pricing mistake. More extreme anomalies score lower (more suspicious).
   */
  _calculateEnforcementLikelihood(zScore) {
    const magnitude = Math.abs(zScore); // 2 = borderline anomaly, 8+ = extreme
    const clamped = Math.min(Math.max(magnitude, 2), 8);
    const normalized = (clamped - 2) / 6; // 0 at z=-2, 1 at z=-8
    const score = 90 - normalized * 75; // 90 at borderline, ~15 at extreme
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  _buildExplanation({ isAnomaly, zScore, mean, currentPrice, enforcementLikelihood, historyCount }) {
    if (!isAnomaly) {
      return `המחיר הנוכחי (${currentPrice}) קרוב לממוצע ההיסטורי (${Math.round(mean)}) על סמך ${historyCount} נקודות מידע — לא זוהתה חריגה.`;
    }

    const percentBelowAverage = Math.round(((mean - currentPrice) / mean) * 100);
    let confidenceNote;
    if (enforcementLikelihood >= 70) {
      confidenceNote = 'סבירות גבוהה שהמחיר ייכבד ככזה לכל דבר.';
    } else if (enforcementLikelihood >= 40) {
      confidenceNote = 'קיים סיכון מתון שזו טעות תמחור שתתבטל — מומלץ להזמין במהירות ובזהירות.';
    } else {
      confidenceNote = 'החריגה קיצונית מאוד — קיים סיכוי משמעותי שזו טעות תמחור (fare error) שתתבטל. הזמינו בזהירות.';
    }

    return `נמצאה חריגת מחיר של כ-${percentBelowAverage}% מתחת לממוצע של ${historyCount} הנקודות האחרונות (Z-score: ${zScore.toFixed(2)}). ${confidenceNote}`;
  }
}

/**
 * @typedef {Object} AnomalyResult
 * @property {boolean} isAnomaly
 * @property {string} reason
 * @property {number} historyCount
 * @property {number|null} movingAverage
 * @property {number|null} stdDev
 * @property {number|null} zScore
 * @property {number|null} enforcementLikelihood - 0-100
 * @property {string} explanation
 */
