import axios from 'axios';

const HOTELLOOK_CACHE_URL = 'https://engine.hotellook.com/api/v2/cache.json';
const REQUEST_TIMEOUT_MS = 10000;

let hasWarnedEndpointDown = false;

/**
 * HotellookClient — אינטגרציה עם Hotellook Hotel Data API (חלק ממוצרי Travelpayouts).
 *
 * 🔴 נבדק בפועל ב-2026-06-22 עם curl, לא רק "לא מאומת": `engine.hotellook.com` (כל path,
 * כולל הroot) מחזיר 404 מ-CloudFront ("Error from cloudfront" ב-x-cache header) — סימן
 * ל-distribution שאין לו backend מוגדר מאחוריו, כלומר ה-endpoint הזה כבר לא פעיל. זה לא
 * עניין של token/auth — `Unauthorized` (לא 404) הוא מה שמתקבל מ-endpoint תקין אבל בלי
 * token, וזה לא מה שקרה כאן. בדקתי גם locations.json וכמה paths נוספים — כולם 404.
 *
 * המשמעות בפועל: searchCheapestHotel תמיד מחזיר null היום (לא "אם אין token" — תמיד),
 * אז כל totalPrice בפועל הוא flight-only. זה לא bug בלוגיקת השילוב (vibeFeedEngine.js כבר
 * נכון: totalPrice = flight + hotel רק אם hotel נמצא) — זה מקור-נתונים שבור, ואין לי
 * תחליף אמיתי לו כרגע (לא ממציאים מחיר מלון). אם יש לכם endpoint/API key חדש של Hotellook
 * או חשבון Booking.com Affiliate אמיתי — זה המקום הראשון לחבר אותו.
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
    // הנחה: priceFrom הוא מחיר לכל השהייה (לא ללילה) — ראו אזהרה למעלה
    totalPriceUsd: cheapest.priceFrom,
    currency: 'usd',
  };
}
