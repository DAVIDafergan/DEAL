const HOTEL_STAY_NIGHTS = 5; // הנחת ברירת מחדל לאורך חופשה — אין לנו תאריך חזרה (חיפוש one-way), לא נתון אמיתי

function addDays(isoDate, days) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Hotellook (Travelpayouts) — פורמט לינק ידוע ויציב, עובד מיד עם ה-Marker, בלי תצורה נוספת */
export function buildHotelUrl(deal, marker) {
  if (!marker || !deal.destination) return null;
  const checkIn = deal.departureDate;
  const checkOut = checkIn ? addDays(checkIn, HOTEL_STAY_NIGHTS) : null;

  const params = new URLSearchParams({ marker, destination: deal.destination, adults: '2' });
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
