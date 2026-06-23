import { sourceRegistry } from '../../sources/index.js';

// כמה שהמחיר החי יכול לעלות מעל המחיר השמור בלי שזה נחשב "אזל" — מחירים מתנדנדים, לא כל
// עליה קלה אומרת שהדיל הספציפי נחטף. אם המחיר החי קפץ הרבה יותר מזה (או שהמסלול/תאריך כבר
// לא מופיע בתשובה כלל), זה כן סימן אמיתי שמה שהוצג כבר לא רלוונטי.
const PRICE_TOLERANCE_MULTIPLIER = 1.5;

/**
 * DealValidator — בדיקת "האם זה עדיין דיל אמיתי" ממש לפני שמשתמש לוחץ "הזמן/נעל דיל".
 *
 * ⚠️ מגבלה אמיתית, לא מוסתרת: ה-endpoint היחיד שיש לנו מ-Travelpayouts (`prices_for_dates`,
 * דרך sourceRegistry.searchAll/searchAllRoundTrip ב-sources/) הוא חיפוש **מחירים שנצפו
 * ונשמרו ב-cache של Travelpayouts עצמם** — לא מנוע הזמנה חי שמבטיח מקום פנוי בכיסא ספציפי.
 * זו הסיבה המבנית ל"sold out" שהמשתמש דיווח עליה: גם בלי שום caching מהצד שלנו, ה-endpoint
 * הזה עצמו יכול להחזיר מחיר ישן יחסית (Travelpayouts מרעננים את ה-cache שלהם בקצב משלהם,
 * לא תלוי בקצב הסריקה שלנו). מה שכן יש לנו: קריאה **חיה** (HTTP ממש כרגע, לא מה-DB שלנו)
 * לאותו endpoint — אם המסלול/תאריך כבר לא מופיע בו בכלל, או שהמחיר קפץ דרמטית, זה הסימן
 * הכי טוב שיש לנו ש"מה שהוצג כבר לא נכון", ושווה להציע למשתמש משהו אחר במקום לשלוח אותו
 * ללינק שכבר לא רלוונטי.
 *
 * @param {{origin: string, destination: string, departureDate: string, returnDate?: string|null, price: number}} params
 */
export async function validateDealIsLive({ origin, destination, departureDate, returnDate, price }) {
  let liveOffers;
  try {
    liveOffers = returnDate
      ? await sourceRegistry.searchAllRoundTrip(origin, destination, departureDate, returnDate)
      : await sourceRegistry.searchAll(origin, destination, departureDate);
  } catch (err) {
    console.error(`[dealValidator] Live check failed for ${origin}->${destination}:`, err.message);
    // כשל רשת/API שלנו — לא חוסמים את המשתמש בגלל תקלה אצלנו, ממשיכים עם מה שהיה מוצג
    return { isValid: true, livePrice: null, bookingUrl: null, checkedLive: false };
  }

  if (liveOffers.length === 0) {
    return { isValid: false, livePrice: null, bookingUrl: null, checkedLive: true };
  }

  const cheapest = liveOffers.reduce((min, offer) => (offer.price < min.price ? offer : min));
  const isValid = cheapest.price <= price * PRICE_TOLERANCE_MULTIPLIER;

  return {
    isValid,
    livePrice: cheapest.price,
    bookingUrl: cheapest.bookingUrl || null,
    checkedLive: true,
  };
}
