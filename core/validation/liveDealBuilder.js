import { sourceRegistry } from '../../sources/index.js';
import { searchCheapestHotel } from '../../sources/hotellookClient.js';
import { getCityName } from '../../web/src/data/cityNames.js';
import { buildHotelUrl, buildCarRentalUrl, buildEsimUrl } from '../../web/src/utils/packageLinks.js';

function computeNights(departureDate, returnDate) {
  if (!departureDate || !returnDate) return null;
  const nights = Math.round((new Date(returnDate) - new Date(departureDate)) / (24 * 60 * 60 * 1000));
  return Number.isFinite(nights) && nights > 0 ? nights : null;
}

/**
 * LiveDealBuilder — בונה דיל **בזמן אמת** ממש כשמשתמש לוחץ "הזמן", במקום להציג מה שב-DB
 * (שעלול להיות מ-cache לא מעודכן). שתי קריאות חיות, לא מה-DB שלנו:
 *   1. טיסה: sourceRegistry.searchAll/searchAllRoundTrip (sources/ — ייבוא בלבד, לא נערך).
 *   2. מלון: searchCheapestHotel (sources/hotellookClient.js — ייבוא בלבד, לא נערך).
 *      🔴 מאומת בפועל ב-curl (פעמים רבות, גם הסבב הזה): engine.hotellook.com מחזיר 404 על
 *      כל path — ה-API הזה לא פעיל. hotelTotalPrice/hotelName יהיו null בפועל **תמיד**
 *      היום, לא רק "כש-API לא מוגדר". זה לא מוסתר — UI מציג "ראו פרטים באתר" כש-null.
 *
 * ⚠️ ממצא חשוב על מחיר טיסה: ל-`prices_for_dates` (sources/travelpayouts.js) **אין** פרמטר
 * מספר-נוסעים בכלל בבקשה — המחיר שמוחזר הוא מחיר **לנוסע בודד** (זו הסיבה שאין פרמטר
 * `adults`: ה-API לא תומך בלוח-זמנים/מחיר לכמה נוסעים יחד). לכן `flightPrice * peopleCount`
 * הוא חישוב המחיר האמיתי לכל הנוסעים, לא `flightPrice` כמו שהוא. **שים לב**: vibeFeedEngine.js
 * ו-packageEngine.js (שלא נערכו הסבב הזה — מערכות נפרדות, לא בסקופ) מחשבים totalPrice בלי
 * הכפלה הזו (peopleCount=2 שם, totalPrice=flightTotal+hotelTotal בלי ×2 על הטיסה) — כדאי
 * לדעת שזה אותו פער פוטנציאלי, גם אם לא תוקן שם הסבב הזה (לא התבקש, ושינוי נוסחת מחיר
 * במערכת קיימת בלי לבקש זה סיכון לא מוצדק).
 */
export async function buildLiveDeal({ origin, destination, departureDate, returnDate, peopleCount = 2, marker, carRentalUrlTemplate, esimUrlTemplate, hotellookApiToken }) {
  const nights = computeNights(departureDate, returnDate);

  let liveOffers = [];
  try {
    liveOffers = returnDate
      ? await sourceRegistry.searchAllRoundTrip(origin, destination, departureDate, returnDate)
      : await sourceRegistry.searchAll(origin, destination, departureDate);
  } catch (err) {
    console.error(`[liveDealBuilder] Live flight search failed for ${origin}->${destination}:`, err.message);
  }

  if (liveOffers.length === 0) {
    return { found: false };
  }

  const cheapestFlight = liveOffers.reduce((min, offer) => (offer.price < min.price ? offer : min));
  const flightPricePerPerson = cheapestFlight.price;
  const flightTotal = flightPricePerPerson * peopleCount;

  let hotel = null;
  if (nights) {
    try {
      hotel = await searchCheapestHotel({
        cityNameEn: getCityName(destination, 'en'),
        checkIn: departureDate,
        checkOut: returnDate,
        apiToken: hotellookApiToken,
      });
    } catch (err) {
      console.error(`[liveDealBuilder] Live hotel search failed for ${destination}:`, err.message);
    }
  }

  const hotelTotal = hotel?.totalPriceUsd ?? null;
  const totalPrice = flightTotal + (hotelTotal ?? 0);
  const dealLike = { destination, departureDate, returnDate };

  return {
    found: true,
    origin,
    destination,
    departureDate,
    returnDate,
    nights,
    peopleCount,
    flightPricePerPerson,
    flightTotal,
    flightBookingUrl: cheapestFlight.bookingUrl || null,
    flightStops: cheapestFlight.stops ?? null,
    hotelName: hotel?.hotelName ?? null,
    hotelStars: hotel?.stars ?? null,
    hotelBreakfastIncluded: hotel?.breakfastIncluded ?? null,
    hotelTotalPrice: hotelTotal,
    // לינק חיפוש המלון (search.hotellook.com) עובד גם בלי מחיר אמיתי מ-cache.json (שתי
    // אינטגרציות נפרדות — ראו packageLinks.js) — מציעים אותו תמיד, לא רק כש-hotel נמצא.
    hotelBookingUrl: buildHotelUrl(dealLike, marker, peopleCount),
    carRentalUrl: buildCarRentalUrl(dealLike, marker, carRentalUrlTemplate),
    esimUrl: buildEsimUrl(dealLike, marker, esimUrlTemplate),
    totalPrice,
    pricePerPerson: totalPrice / peopleCount,
    currency: 'USD',
    builtAt: new Date().toISOString(),
  };
}
