/**
 * חלון מעקב מומלץ לפעולה על דיל — הערכה בלבד, לא זמן תפוגה רשמי של חברת התעופה.
 * אין במערכת נתון אמיתי על מועד ביטול/תפוגה, אז אנחנו לא ממציאים כזה — רק מציגים, בשקיפות,
 * חלון זמן הגיוני שמתחיל מרגע גילוי האנומליה (createdAt / scanned_at).
 *
 * Recommended action-window heuristic, NOT a real airline expiry time. We don't have real
 * expiry data, so this is transparently labeled as an estimate based on when the deal was
 * first scanned/detected.
 */
export const DEAL_TRACKING_WINDOW_HOURS = 6;

export function computeCountdown(createdAtIso, now = Date.now()) {
  const createdAtMs = new Date(createdAtIso).getTime();
  const deadlineMs = createdAtMs + DEAL_TRACKING_WINDOW_HOURS * 60 * 60 * 1000;
  const remainingMs = deadlineMs - now;

  if (!Number.isFinite(remainingMs) || remainingMs <= 0) {
    return { isExpired: true, hours: 0, minutes: 0 };
  }

  const totalMinutes = Math.floor(remainingMs / 60000);
  return {
    isExpired: false,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export function isRecentlyAdded(createdAtIso, now = Date.now(), windowMs = 10 * 60 * 1000) {
  const createdAtMs = new Date(createdAtIso).getTime();
  return Number.isFinite(createdAtMs) && now - createdAtMs <= windowMs;
}

/** "עודכן לפני X" עבור דילי live_price — מתעדכן בכל רענון סריקה, אין כאן חלון תפוגה */
export function computeElapsed(updatedAtIso, now = Date.now()) {
  const updatedAtMs = new Date(updatedAtIso).getTime();
  const elapsedMs = Math.max(0, now - updatedAtMs);
  const totalMinutes = Math.floor(elapsedMs / 60000);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}
