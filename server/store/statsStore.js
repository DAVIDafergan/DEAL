/**
 * StatsStore — מצרף סטטיסטיקות תפעוליות בזיכרון (כמה דילים נשלחו, חיסכון ממוצע).
 * In-memory aggregate stats. Derived only from real recorded deals — never fabricated.
 */
const state = {
  dealsSent: 0,
  totalSavingsPercent: 0, // running sum, used to compute the average
};

/** נקרא בכל פעם שדיל מופץ בהצלחה לפחות לערוץ אחד */
export function recordDealSent({ savingsPercent }) {
  state.dealsSent += 1;
  state.totalSavingsPercent += savingsPercent;
}

export function getStats() {
  const averageSavingsPercent = state.dealsSent === 0 ? 0 : Math.round(state.totalSavingsPercent / state.dealsSent);
  return {
    dealsSent: state.dealsSent,
    averageSavingsPercent,
  };
}

/** לשימוש בטסטים בלבד */
export function _resetStatsStore() {
  state.dealsSent = 0;
  state.totalSavingsPercent = 0;
}
