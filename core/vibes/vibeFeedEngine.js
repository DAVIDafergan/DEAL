import { getCityName } from '../../web/src/data/cityNames.js';
import { getDestinationTags } from '../../web/src/data/destinationTags.js';
import { buildHotelUrl } from '../../web/src/utils/packageLinks.js';
import { searchCheapestHotel } from '../../sources/hotellookClient.js';
import { resolveVideoForDestination } from '../../media/videoResolver.js';
import { resolvePhotoForDestination } from '../../media/photoResolver.js';
import { resolveMusicForVibe } from '../../media/musicResolver.js';
import { persistMediaUrl } from '../../media/cloudStorage.js';
import { buildVibeFeedNarrative } from '../../ai/vibeFeedNarrative.js';
import { getWatchedDestinations } from '../watchedRoutes.js';
import { upsertVibeFeedCard, listVibeFeedCards } from '../../server/store/vibeFeedStore.js';

const ORIGIN = 'TLV';
const NIGHTS = 4;
const DAYS_AHEAD = 21;
const CANDIDATES_PER_VIBE = 8;
const PEOPLE_COUNT = 2;
// כל 5 כרטיסים בערך מקבל את אפקט ה"glitch" (לא קבוע/חוזר על אותו אינדקס בכל פעם, כדי
// שלא יהיה תמיד "כרטיס מספר 5" באופן צפוי וזהה לכל הווייבים)
const GLITCH_DROP_EVERY = 5;

/**
 * מתאים בין הווייב (4 כפתורי השאלון) לתיוג העורכי הקיים (web/src/data/destinationTags.js)
 * — לא בונים מערכת תיוג נפרדת. urban/beach/nature ממופים ל-types, romantic לאודיינס
 * "couples" (אין type "romantic" קיים, וזה הפרוקסי הסביר ביותר בתיוג הקיים).
 */
const VIBE_MATCHERS = {
  urban: (tags) => tags.types.includes('city'),
  beach: (tags) => tags.types.includes('beach'),
  nature: (tags) => tags.types.includes('nature'),
  romantic: (tags) => tags.audiences.includes('couples'),
};

export const VIBES = Object.keys(VIBE_MATCHERS);

export function pickDestinationsForVibe(vibe, env = process.env, limit = CANDIDATES_PER_VIBE) {
  const matcher = VIBE_MATCHERS[vibe];
  if (!matcher) return [];
  return getWatchedDestinations(env)
    .filter((code) => matcher(getDestinationTags(code)))
    .slice(0, limit);
}

function computeDates() {
  const departureDate = new Date(Date.now() + DAYS_AHEAD * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const returnDate = new Date(new Date(departureDate).getTime() + NIGHTS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  return { departureDate, returnDate };
}

/**
 * בונה כרטיס פיד אחד ליעד: טיסה הלוך-חזור הזולה ביותר (חובה — בלי טיסה אמיתית אין כרטיס)
 * + מלון הזול ביותר (best-effort, יכול להיות null) + media (best-effort, יכול להיות null).
 * אותו עיקרון "לא ממציאים" כמו core/packages/packageEngine.js: total/pricePerPerson כולל
 * רק רכיבים עם מחיר אמיתי שיש לנו.
 */
async function buildFeedCard({ vibe, destination, isGlitchDrop, deps }) {
  const { departureDate, returnDate } = computeDates();

  let flightOffers = [];
  try {
    flightOffers = await deps.travelpayoutsAdapter.searchRoundTripFlights(ORIGIN, destination, departureDate, returnDate);
  } catch (err) {
    console.error(`[vibeFeedEngine] Round-trip search failed for ${destination}:`, err.message);
  }

  const cheapestFlight = [...flightOffers].sort((a, b) => a.price - b.price)[0];
  if (!cheapestFlight) return null;

  const cityNameEn = getCityName(destination, 'en');

  let hotel = null;
  try {
    hotel = await searchCheapestHotel({ cityNameEn, checkIn: departureDate, checkOut: returnDate, apiToken: deps.apiToken });
  } catch (err) {
    console.error(`[vibeFeedEngine] Hotel search failed for ${destination}:`, err.message);
  }

  let videoUrl = null;
  let videoPosterUrl = null;
  try {
    const video = await resolveVideoForDestination(cityNameEn);
    videoUrl = await persistMediaUrl(video.videoUrl);
    videoPosterUrl = video.posterUrl; // תמונת preview, כבר hosted חיצונית — לא צריך להעלות מחדש
  } catch (err) {
    console.error(`[vibeFeedEngine] Video resolution failed for ${destination}:`, err.message);
  }

  let photoUrl = null;
  try {
    photoUrl = await resolvePhotoForDestination(cityNameEn, destination);
  } catch (err) {
    console.error(`[vibeFeedEngine] Photo resolution failed for ${destination}:`, err.message);
  }

  let musicUrl = null;
  try {
    musicUrl = await resolveMusicForVibe(vibe);
    musicUrl = await persistMediaUrl(musicUrl);
  } catch (err) {
    console.error(`[vibeFeedEngine] Music resolution failed for vibe "${vibe}":`, err.message);
  }

  const flightTotal = cheapestFlight.price;
  const hotelTotal = hotel?.totalPriceUsd ?? null;
  const totalPrice = hotelTotal !== null ? flightTotal + hotelTotal : flightTotal;
  const pricePerPerson = totalPrice / PEOPLE_COUNT;

  const card = {
    id: `vibe_${vibe}_${destination}`,
    vibe,
    origin: ORIGIN,
    destination,
    departureDate,
    returnDate,
    nights: NIGHTS,
    peopleCount: PEOPLE_COUNT,
    flightPrice: flightTotal,
    flightBookingUrl: cheapestFlight.bookingUrl || '',
    flightStops: cheapestFlight.stops ?? null,
    flightReturnStops: cheapestFlight.returnStops ?? null,
    hotelName: hotel?.hotelName ?? null,
    hotelStars: hotel?.stars ?? null,
    hotelTotalPrice: hotelTotal,
    hotelBookingUrl: buildHotelUrl({ destination, departureDate, returnDate }, deps.marker) || '',
    totalPrice,
    pricePerPerson,
    currency: 'USD',
    videoUrl,
    videoPosterUrl,
    photoUrl,
    musicUrl,
    isGlitchDrop,
  };

  card.narrative = buildVibeFeedNarrative(card);
  return card;
}

/** רץ כל 4 שעות (ראו server/index.js) — מרענן כרטיסים לכל הווייבים */
export async function refreshVibeFeed(deps) {
  if (!deps?.travelpayoutsAdapter) {
    console.warn('[vibeFeedEngine] No Travelpayouts adapter available — skipping vibe feed refresh.');
    return;
  }

  for (const vibe of VIBES) {
    const destinations = pickDestinationsForVibe(vibe);
    for (let i = 0; i < destinations.length; i += 1) {
      try {
        const card = await buildFeedCard({
          vibe,
          destination: destinations[i],
          isGlitchDrop: (i + 1) % GLITCH_DROP_EVERY === 0,
          deps,
        });
        if (card) await upsertVibeFeedCard(card);
      } catch (err) {
        console.error(`[vibeFeedEngine] Failed to build feed card for ${vibe}/${destinations[i]}:`, err.message);
      }
    }
  }
}

/** משמש את GET /api/deals/feed?vibe=X&lang=Y */
export async function getVibeFeed(vibe, lang) {
  if (!VIBES.includes(vibe)) return [];
  return listVibeFeedCards(vibe, lang);
}
