import axios from 'axios';
import { getDestinationImage } from '../images/destinationImageService.js';

const PEXELS_PHOTO_SEARCH_URL = 'https://api.pexels.com/v1/search';
const REQUEST_TIMEOUT_MS = 10000;

/**
 * תמונת רקע ליעד (להצגה כש-DealSlide אין לו וידאו), בעדיפות:
 *   1. Pexels (PEXELS_API_KEY) — תמונה חדשה, חינמית.
 *   2. Unsplash (UNSPLASH_ACCESS_KEY) — דרך images/destinationImageService.js הקיים, אותו
 *      מקור שמשמש כבר את כרטיסי הטיסה בעמוד הבית (עם ה-cache ב-MySQL שלו) — לא אינטגרציה
 *      כפולה, רק שימוש חוזר.
 *   3. בלי שום מפתח, או אם שניהם נכשלים: null — ה-UI נופל ל-gradient+motion בלבד.
 */
export async function resolvePhotoForDestination(cityNameEn, iataCode, env = process.env) {
  if (env.PEXELS_API_KEY) {
    try {
      const photoUrl = await searchPexelsPhoto(cityNameEn, env.PEXELS_API_KEY);
      if (photoUrl) return photoUrl;
    } catch (err) {
      console.error(`[photoResolver] Pexels photo search failed for "${cityNameEn}":`, err.message);
    }
  }

  if (env.UNSPLASH_ACCESS_KEY) {
    try {
      const image = await getDestinationImage(iataCode, cityNameEn, env.UNSPLASH_ACCESS_KEY);
      if (image?.imageUrl) return image.imageUrl;
    } catch (err) {
      console.error(`[photoResolver] Unsplash fallback failed for "${cityNameEn}":`, err.message);
    }
  }

  return null;
}

async function searchPexelsPhoto(cityNameEn, apiKey) {
  const res = await axios.get(PEXELS_PHOTO_SEARCH_URL, {
    params: { query: `${cityNameEn} travel`, per_page: 1 },
    headers: { Authorization: apiKey },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const photo = res.data?.photos?.[0];
  return photo?.src?.medium || photo?.src?.large || null;
}
