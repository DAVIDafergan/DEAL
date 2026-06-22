import axios from 'axios';

const HOTELLOOK_CACHE_URL = 'https://engine.hotellook.com/api/v2/cache.json';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * HotellookClient — אינטגרציה עם Hotellook Hotel Data API (חלק ממוצרי Travelpayouts).
 *
 * ⚠️ לא מאומת מול תשובת API אמיתית — אין מפתח Production לבדוק. ההנחות הבאות מבוססות על
 * תיעוד/ידע כללי על ה-endpoint הזה, לא על קריאה אמיתית שנבדקה בפועל:
 *   1. `location` מקבל שם עיר באנגלית (resolve מקורב בצד Hotellook), לא דורש location-id נפרד.
 *   2. `priceFrom` בתשובה מייצג מחיר עבור כל השהייה (checkIn->checkOut) שצוינה, לא מחיר ללילה.
 *   3. `token` (אותו Travelpayouts API token של הטיסות) אופציונלי אך מועיל למעקב/quota.
 * אם הפורמט בפועל שונה — זה המקום הראשון לתקן.
 *
 * Official Hotellook (Travelpayouts) Hotel Data API. NOT verified against a real response —
 * no production key available to test. See assumptions above; fix here first if wrong.
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
