import axios from 'axios';

const HOTELLOOK_CACHE_URL = 'https://engine.hotellook.com/api/v2/cache.json';
const REQUEST_TIMEOUT_MS = 10000;

let hasWarnedEndpointDown = false;

/**
 * HotellookClient — אינטגרציה עם Hotellook Hotel Data API (חלק ממוצרי Travelpayouts).
 *
 * 🔴 נבדק בפועל **שוב** ב-2026-06-23 עם curl (לא רק "לא מאומת", ולא הסתפקתי בזיכרון
 * מבדיקה קודמת): `engine.hotellook.com` (כל path, כולל הroot, גם עם `token=` בפרמטרים)
 * עדיין מחזיר 404 מ-CloudFront ("Error from cloudfront" ב-x-cache header) — אותו סימן
 * מדויק כמו בבדיקה הקודמת, כלומר זה לא תקלה חולפת. זה לא עניין של token/auth —
 * `Unauthorized` (לא 404) הוא מה שמתקבל מ-endpoint תקין אבל בלי token, וזה לא מה שקרה כאן.
 *
 * המשמעות בפועל: searchCheapestHotel תמיד מחזיר null היום, אז כל totalPrice בפועל הוא
 * flight-only. זה לא bug בלוגיקת השילוב (vibeFeedEngine.js כבר נכון: totalPrice = flight +
 * hotel רק אם hotel נמצא) — זה מקור-נתונים שבור, ואין לי תחליף אמיתי לו כרגע.
 *
 * ⚠️ **שני הנחות שלא ניתנות לאימות כרגע** (אין תשובת API אמיתית לבדוק נגדה):
 *   1. `priceFrom` — הנחה: מחיר לכל השהייה (לא ללילה). אם זה שגוי בפועל ו-priceFrom הוא
 *      מחיר-ללילה, totalPriceUsd למטה צריך להיות `priceFrom * nights`, לא `priceFrom` כמו
 *      שהוא. **לא משנה את זה בלי ראיה** — שינוי "לבטח נכון" בלי לבדוק יכול להפוך הנחה אחת
 *      (אולי נכונה) להנחה אחרת (אולי שגויה) בלי שום שיפור באמינות.
 *   2. `breakfastIncluded`/דירוג-ציון (לא רק כוכבים) — שדות שלא ידוע אם/איך קיימים בתשובה
 *      האמיתית. מוחזרים כ-null במכוון (לא ממציאים שם שדה) — ה-UI מציג "פרטים באתר" כשזה null.
 * אם יש לכם endpoint/API key חדש של Hotellook או חשבון Booking.com Affiliate אמיתי — זה
 * המקום הראשון לחבר אותו ולתקן את שתי ההנחות האלה מול תשובה אמיתית.
 */
export async function searchCheapestHotel({ cityNameEn, checkIn, checkOut, apiToken }) {
  let response;
  try {
    response = await axios.get(HOTELLOOK_CACHE_URL, {
      params: {
        location: cityNameEn,
        currency: 'usd',
        checkIn,
        checkOut,
        limit: 5,
        token: apiToken || undefined,
      },
      timeout: REQUEST_TIMEOUT_MS,
    });
  } catch (err) {
    if (err.response?.status === 429) return null;
    if (err.response?.status === 404) {
      if (!hasWarnedEndpointDown) {
        hasWarnedEndpointDown = true;
        console.warn(
          '[hotellookClient] engine.hotellook.com returned 404 — this endpoint appears to be ' +
            'discontinued (confirmed via curl, not a token/auth issue). Hotel prices will be ' +
            'unavailable (flight-only totals) until a working hotel-price source is configured.'
        );
      }
      return null;
    }
    throw new Error(`Hotellook request failed: ${err.message}`);
  }

  const hotels = response?.data;
  if (!Array.isArray(hotels) || hotels.length === 0) return null;

  const cheapest = hotels
    .filter((hotel) => hotel && typeof hotel.priceFrom === 'number')
    .sort((a, b) => a.priceFrom - b.priceFrom)[0];

  if (!cheapest) return null;

  return {
    hotelName: cheapest.hotelName || null,
    stars: cheapest.stars ?? null,
    // לא ידוע אם/באיזה שם שדה תשובה אמיתית תחזיר את זה — null במכוון, לא ממציאים. ה-UI
    // מציג "פרטים באתר" כשזה null, ראו web/src/vibe/vibeConstants.js / DealSlide.jsx.
    breakfastIncluded: cheapest.breakfastIncluded ?? null,
    // הנחה: priceFrom הוא מחיר לכל השהייה (לא ללילה) — ראו אזהרה למעלה. לא מכפילים ב-nights.
    totalPriceUsd: cheapest.priceFrom,
    currency: 'usd',
  };
}
