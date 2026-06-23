import crypto from 'node:crypto';
import { getCityName } from '../../web/src/data/cityNames.js';
import { getDestinationTags, estimateIlsPrice } from '../../web/src/data/destinationTags.js';
import { buildHotelUrl, buildCarRentalUrl, buildEsimUrl } from '../../web/src/utils/packageLinks.js';
import { searchCheapestHotel } from '../../sources/hotellookClient.js';
import { getWatchedDestinations } from '../watchedRoutes.js';
import { upsertPackage, listPopularPackages, findFreshPersonalizedPackages } from '../../server/store/packagesStore.js';

const ORIGIN = 'TLV';
const CANDIDATE_LIMIT = 3;
const PERSONALIZED_CACHE_TTL_MS = 60 * 60 * 1000; // שעה — לא דורש סריקה חיה על כל הגשת שאלון חוזרת

/**
 * "פרסטים" פופולריים שמתעדכנים כל 30 דק' (לא כל הקומבינציות האפשריות — זה היה שובר את
 * מכסת ה-rate-limit של Travelpayouts/Hotellook). מציגים אותם למשתמש שלא ענה שאלון.
 * ברירת מחדל: זוג (2 אנשים) — זה הנפוץ לחופשות, לפי הנחיה מפורשת. אין כאן preset ל-1
 * אדם (זה עדיין זמין דרך השאלון האישי, למי שבאמת בוחר את זה).
 */
const POPULAR_PRESETS = [
  { key: 'couple_city', peopleCount: 2, budgetIls: 5000, days: 5, destinationType: 'city' },
  { key: 'family_beach', peopleCount: 4, budgetIls: 8000, days: 5, destinationType: 'beach' },
  { key: 'couple_beach', peopleCount: 2, budgetIls: 5000, days: 5, destinationType: 'beach' },
  { key: 'friends_beach', peopleCount: 4, budgetIls: 5000, days: 5, destinationType: 'beach' },
  { key: 'couple_culture', peopleCount: 2, budgetIls: 5000, days: 5, destinationType: 'culture' },
  { key: 'anyone_open', peopleCount: 2, budgetIls: 5000, days: 5, destinationType: null },
];

export function buildQuestionnaireHash({ peopleCount, budgetIls, days, destinationType }) {
  return crypto
    .createHash('sha1')
    .update(`${peopleCount}|${budgetIls}|${days}|${destinationType || 'any'}`)
    .digest('hex');
}

/** בוחר תת-קבוצה של יעדים מתאימים לסוג היעד — לא את כל ~40, כדי לא להציף את ה-API החיצוני */
function pickCandidateDestinations(destinationType, limit = CANDIDATE_LIMIT) {
  const watched = getWatchedDestinations();
  const matching = destinationType
    ? watched.filter((code) => getDestinationTags(code).types.includes(destinationType))
    : watched;
  return matching.slice(0, limit);
}

/**
 * 🔴 תוקן באג אמיתי: nights היה מוגבל ל-DEFAULT_NIGHTS=3 (Math.min), אבל returnDate חושב
 * עם (days-1) הלא-מוגבל — אז לכל days>4 (כלומר כל ה-presets הפופולריים חוץ מאחד, וגם
 * תשובות שאלון של 5/7/10 ימים) הוצג "X לילות" שלא תאם בפועל לטווח שהמלון נחפש בו
 * (checkIn/checkOut). nights ו-returnDate חייבים לנבוע מאותו חישוב — אין יותר cap מלאכותי.
 */
function computeDates(daysAheadOffset, days) {
  const departureDate = new Date(Date.now() + daysAheadOffset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const nights = Math.max(1, days - 1);
  const returnDate = new Date(new Date(departureDate).getTime() + nights * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { departureDate, returnDate, nights };
}

/**
 * בונה חבילה אחת ליעד נתון: טיסה הלוך-חזור הזולה ביותר + מלון הזול ביותר באותם תאריכים.
 * מחיר הסה"כ מורכב **רק** מרכיבים שיש להם מחיר אמיתי (טיסה תמיד; מלון אם נמצא) — רכב/SIM
 * הם לינקים בלבד בלי מחיר אמיתי שיש לנו, ולכן לא נכנסים לסכום (לא ממציאים מחיר).
 */
async function buildPackageForDestination({
  destination,
  departureDate,
  returnDate,
  nights,
  peopleCount,
  budgetIls,
  destinationType,
  questionnaireHash,
  isPersonalized,
  travelpayoutsAdapter,
  apiToken,
  marker,
  carRentalUrlTemplate,
  esimUrlTemplate,
}) {
  let flightOffers = [];
  try {
    flightOffers = await travelpayoutsAdapter.searchRoundTripFlights(ORIGIN, destination, departureDate, returnDate);
  } catch (err) {
    console.error(`[packageEngine] Round-trip search failed for ${destination}:`, err.message);
  }

  const cheapestFlight = [...flightOffers].sort((a, b) => a.price - b.price)[0];
  if (!cheapestFlight) return null; // אין טיסה אמיתית למסלול הזה בתאריכים האלה — אין חבילה

  const cityNameEn = getCityName(destination, 'en');
  let hotel = null;
  try {
    hotel = await searchCheapestHotel({ cityNameEn, checkIn: departureDate, checkOut: returnDate, apiToken });
  } catch (err) {
    console.error(`[packageEngine] Hotel search failed for ${destination}:`, err.message);
  }

  const flightTotal = cheapestFlight.price;
  const hotelTotal = hotel?.totalPriceUsd ?? null;
  const totalPrice = hotelTotal !== null ? flightTotal + hotelTotal : flightTotal;
  const pricePerPerson = totalPrice / peopleCount;

  // אם המשתמש נתן תקציב — חבילה שחורגת ממנו לא נחשבת התאמה טובה, מסננים אותה
  if (budgetIls && estimateIlsPrice(totalPrice) > budgetIls) {
    return null;
  }

  const dealLike = { destination, departureDate };
  const id = isPersonalized ? crypto.randomUUID() : `popular_${questionnaireHash}`;

  return {
    id,
    origin: ORIGIN,
    destination,
    departureDate,
    returnDate,
    nights,
    peopleCount,
    destinationType: destinationType || null,
    questionnaireHash: questionnaireHash || null,
    isPersonalized,
    flightPrice: flightTotal,
    flightBookingUrl: cheapestFlight.bookingUrl || '',
    flightStops: cheapestFlight.stops ?? null,
    flightReturnStops: cheapestFlight.returnStops ?? null,
    hotelName: hotel?.hotelName ?? null,
    hotelTotalPrice: hotelTotal,
    hotelBookingUrl: buildHotelUrl({ ...dealLike, departureDate }, marker) || '',
    carRentalUrl: buildCarRentalUrl(dealLike, marker, carRentalUrlTemplate) || '',
    esimUrl: buildEsimUrl(dealLike, marker, esimUrlTemplate) || '',
    totalPrice,
    pricePerPerson,
    currency: 'USD',
  };
}

async function generatePackagesForAnswers({ peopleCount, budgetIls, days, destinationType }, deps) {
  if (!deps?.travelpayoutsAdapter) {
    console.warn('[packageEngine] No Travelpayouts adapter available — skipping package generation.');
    return [];
  }

  const { departureDate, returnDate, nights } = computeDates(30, days);
  const candidates = pickCandidateDestinations(destinationType);
  const questionnaireHash = buildQuestionnaireHash({ peopleCount, budgetIls, days, destinationType });

  const results = [];
  for (const destination of candidates) {
    const pkg = await buildPackageForDestination({
      destination,
      departureDate,
      returnDate,
      nights,
      peopleCount,
      budgetIls,
      destinationType,
      questionnaireHash,
      isPersonalized: true,
      ...deps,
    });
    if (pkg) results.push(pkg);
  }

  return results.sort((a, b) => a.pricePerPerson - b.pricePerPerson);
}

/** משמש את GET /api/packages/popular — מחזיר מה שנוצר ב-refreshPopularPackages האחרון */
export async function getPopularPackages() {
  return listPopularPackages();
}

/**
 * משמש את POST /api/packages/personalized — מחזיר חבילות מה-cache אם טריות (שעה אחרונה),
 * אחרת מייצר בזמן אמת (כמה קריאות בלבד, ל-CANDIDATE_LIMIT יעדים) ושומר ל-DB לפעם הבאה.
 */
export async function generatePersonalizedPackages(answers, deps) {
  const hash = buildQuestionnaireHash(answers);
  const cached = await findFreshPersonalizedPackages(hash, PERSONALIZED_CACHE_TTL_MS);
  if (cached.length > 0) return cached;

  const fresh = await generatePackagesForAnswers(answers, deps);
  for (const pkg of fresh) {
    await upsertPackage(pkg);
  }
  return fresh;
}

/** רץ כל 30 דק' מ-server/index.js — מייצר/מרענן חבילות לפרסטים הפופולריים */
export async function refreshPopularPackages(deps) {
  for (const preset of POPULAR_PRESETS) {
    try {
      const packages = await generatePackagesForAnswers(
        { peopleCount: preset.peopleCount, budgetIls: preset.budgetIls, days: preset.days, destinationType: preset.destinationType },
        deps
      );
      const best = packages[0];
      if (best) {
        await upsertPackage({ ...best, id: `popular_${preset.key}`, questionnaireHash: preset.key, isPersonalized: false });
      }
    } catch (err) {
      console.error(`[packageEngine] Failed to refresh popular preset "${preset.key}":`, err.message);
    }
  }
}
