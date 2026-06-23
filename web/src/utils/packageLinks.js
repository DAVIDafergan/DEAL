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
 * Hotellook (Travelpayouts) — search.hotellook.com (לא hotellook.com/search — ראו אזהרה).
 * ✅ נבדק בפועל (curl -L) ב-2026-06-22: `search.hotellook.com/?marker=X&destination=Y&...`
 * עושה 302 ל-hots-api.aviasales.ru -> 302 ל-sp.booking.com (עם ה-marker שלנו) -> 302 סופי
 * ל-www.booking.com/searchresults.html. שרשרת redirect אמיתית שעובדת, לא ניחוש.
 * ⚠️ `hotellook.com/search?...` (הפורמט שהיה כאן קודם, לפי הנחיה מפורשת) **לא reachable
 * בכלל** — נבדק עם curl ולא קיבל שום תגובה. זה domain שגוי, לא רק פורמט פרמטרים שונה.
 *
 * currency=USD בכוונה, לא ILS: Travelpayouts ו-Hotellook (sources/travelpayouts.js,
 * sources/hotellookClient.js) נשאלים ב-USD בלבד, וכל המחירים שאנחנו מציגים בעצמנו
 * (DealBreakdown, DealCard וכו') הם USD — זה ה-source of truth היחיד שיש לנו. אישרתי
 * ב-curl שה-currency=USD שורד את כל שרשרת ה-redirect ומגיע כ-selected_currency=USD גם
 * בעמוד הסופי של Booking.com. אם הלינק היה מבקש ILS, המשתמש היה רואה "Total: 540 USD"
 * אצלנו ו-"540 ₪" אחרי שלוחץ — אותו מספר, מטבע שונה, נראה כמו דיל אחר. זה ה-bug שגרם
 * ל"מחירים לא תואמים בכל מקום" — לא שלוש מקורות אמת חולקים, לינק יחיד עם פרמטר לא תואם.
 */
export function buildHotelUrl(deal, marker, adults = 2) {
  if (!marker || !deal.destination) return null;
  const { checkIn, checkOut } = getHotelStayDates(deal);

  const params = new URLSearchParams({ marker, destination: deal.destination, adults: String(adults || 2), currency: 'USD' });
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);

  return `https://search.hotellook.com/?${params.toString()}`;
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
