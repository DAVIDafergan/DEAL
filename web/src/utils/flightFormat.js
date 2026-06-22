import { getAirportTimezone } from '../data/airportTimezones.js';

const LOCALE_MAP = { he: 'he-IL', en: 'en-US', es: 'es-ES' };

function resolveLocale(lang) {
  return LOCALE_MAP[lang] || 'en-US';
}

/** תאריך קריא עם יום בשבוע (לא רק מספרים) — בזמן המקומי של שדה התעופה הרלוונטי */
export function formatFlightDate(isoDateTime, lang, airportCode) {
  if (!isoDateTime) return null;
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(resolveLocale(lang), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: getAirportTimezone(airportCode),
  }).format(date);
}

/** שעה קריאה בזמן המקומי של שדה התעופה הרלוונטי */
export function formatFlightTime(isoDateTime, lang, airportCode) {
  if (!isoDateTime) return null;
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(resolveLocale(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: getAirportTimezone(airportCode),
  }).format(date);
}

/** תאריך קצר (יום+חודש בלבד, בלי שעה/יום בשבוע) — לשורת סיכום הלוך-חזור בכרטיס חבילה */
export function formatShortDate(isoDateOnly, lang) {
  if (!isoDateOnly) return null;
  const date = new Date(`${isoDateOnly}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(resolveLocale(lang), { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date);
}

/** משך טיסה כולל, מתורגם — מחזיר null אם המקור לא דיווח משך (לא ממציאים) */
export function formatDurationMinutes(minutes, t) {
  if (!Number.isFinite(minutes)) return null;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return t.durationLabel(hours, mins);
}
