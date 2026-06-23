import { sourceRegistry } from '../../sources/index.js';
import { buildHotelUrl, buildCarRentalUrl, buildEsimUrl } from '../../web/src/utils/packageLinks.js';

function computeNights(departureDate, returnDate) {
  if (!departureDate || !returnDate) return null;
  const nights = Math.round((new Date(returnDate) - new Date(departureDate)) / (24 * 60 * 60 * 1000));
  return Number.isFinite(nights) && nights > 0 ? nights : null;
}

/**
 * LiveDealBuilder — בונה דיל **בזמן אמת**, לא מ-cache. **flight-only במכוון**: הוסר השלב
 * שניסה לקרוא ל-searchCheapestHotel (sources/hotellookClient.js) — לא רק "ככה יצא", החלטה
 * מפורשת אחרי שאומת **שוב** ב-curl (4 endpoint-ים שונים, כולם 404 מ-CloudFront, אותו pattern
 * בדיוק) שכל ה-API הזה לא קיים יותר, לא תקלה זמנית/per-destination. דיל שמחיר המלון שלו תמיד
 * null נראה כמו דיל לא שלם ("פרטים באתר" בלי מחיר) — פחות מבלבל להפסיק להתחזות שיש לנו
 * מחיר מלון בכלל, ולהציג מחיר טיסה בלבד שבאמת אמין. הלינק לחיפוש מלון (buildHotelUrl,
 * search.hotellook.com — אינטגרציה נפרדת, אישרה ב-curl שעובדת) **נשאר** מוצע, רק לא חלק
 * מהמחיר/מה-breakdown המספרי. אם אי-פעם יתחבר מקור מחיר מלון אמיתי, זה המקום להחזיר את זה.
 *
 * ⚠️ ממצא על מחיר טיסה: ל-`prices_for_dates` (sources/travelpayouts.js) **אין** פרמטר
 * מספר-נוסעים בכלל בבקשה — המחיר שמוחזר הוא מחיר **לנוסע בודד**. לכן `flightPrice *
 * peopleCount` הוא חישוב המחיר האמיתי לכל הנוסעים. vibeFeedEngine.js/packageEngine.js
 * (לא נערכו) לא עושים את ההכפלה הזו — ראו README לפירוט.
 */
export async function buildLiveDeal({ origin, destination, departureDate, returnDate, peopleCount = 2, marker, carRentalUrlTemplate, esimUrlTemplate }) {
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
    // לינק חיפוש מלון בלבד — לא מחיר. ראו ההערה למעלה למה הוסר ניסיון מחיר מלון בכלל.
    hotelBookingUrl: buildHotelUrl(dealLike, marker, peopleCount),
    carRentalUrl: buildCarRentalUrl(dealLike, marker, carRentalUrlTemplate),
    esimUrl: buildEsimUrl(dealLike, marker, esimUrlTemplate),
    totalPrice: flightTotal,
    pricePerPerson: flightTotal / peopleCount,
    currency: 'USD',
    builtAt: new Date().toISOString(),
  };
}
