const HOTEL_STAY_NIGHTS = 5; // הנחת ברירת מחדל לאורך חופשה — רק כשאין תאריך חזרה אמיתי

function addDays(isoDate, days) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * תאריכי צ'ק-אין/אאוט למלון. אם יש לדיל returnDate אמיתי (live_price הלוך-חזור — ראו
 * DealScanner) משתמשים בו כ-checkOut, כי זה תאריך החזרה האמיתי של המשתמש. אחרת (anomaly,
 * one-way במכוון) נופלים להערכה של 5 לילות, ומסמנים isEstimate=true כדי שה-UI יבהיר שזו
 * הערכה ולא תאריך חזרה אמיתי.
 */
export function getHotelStayDates(deal) {
  const checkIn = deal.departureDate || null;

  if (deal.returnDate) {
    return { checkIn, checkOut: deal.returnDate, isEstimate: false };
  }

  const checkOut = checkIn ? addDays(checkIn, HOTEL_STAY_NIGHTS) : null;
  return { checkIn, checkOut, isEstimate: true };
}

/**
 * Hotellook (Travelpayouts) — פורמט לינק לפי הנחיה מפורשת: hotellook.com/search עם
 * destination/checkIn/checkOut/currency=ILS/ref={marker}. ⚠️ עדיין לא מאומת מול תשובת API
 * אמיתית של Hotellook (אין production key לבדוק) — זה הפורמט שסיפקתם, לא ניחוש שלי.
 */
export function buildHotelUrl(deal, marker) {
  if (!marker || !deal.destination) return null;
  const { checkIn, checkOut } = getHotelStayDates(deal);

  const params = new URLSearchParams({ destination: deal.destination, currency: 'ILS', ref: marker });
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);

  return `https://hotellook.com/search?${params.toString()}`;
}

/**
 * רכב/eSIM: הפורמט המדויק משתנה בין חשבונות Travelpayouts, אז זה תבנית מוגדרת ב-env
 * (TRAVELPAYOUTS_CAR_RENTAL_URL_TEMPLATE / TRAVELPAYOUTS_ESIM_URL_TEMPLATE) ולא לינק קבוע
 * בקוד — כדי לא לסכן לינק שגוי/בלי מארקר. בלי תבנית מוגדרת, הכפתור פשוט לא מוצג.
 */
function fillTemplate(template, deal, marker) {
  if (!template || !marker) return null;
  return template
    .replaceAll('{marker}', marker)
    .replaceAll('{destination}', deal.destination || '')
    .replaceAll('{checkin}', deal.departureDate || '');
}

export function buildCarRentalUrl(deal, marker, template) {
  return fillTemplate(template, deal, marker);
}

export function buildEsimUrl(deal, marker, template) {
  return fillTemplate(template, deal, marker);
}
