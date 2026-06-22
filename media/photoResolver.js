import { getDestinationImage } from '../images/destinationImageService.js';

/**
 * תמונת רקע ליעד (להצגה כש-DealSlide אין לו וידאו) — delegating ל-images/destinationImageService.js
 * הקיים, שכבר עושה Pexels-ראשון-Unsplash-fallback עם cache ב-MySQL (אותו מקור שמשמש את
 * כרטיסי הטיסה בעמוד הבית). לא אינטגרציה כפולה — שימוש חוזר באותה לוגיקה בדיוק.
 */
export async function resolvePhotoForDestination(cityNameEn, iataCode, env = process.env) {
  const image = await getDestinationImage(iataCode, cityNameEn, {
    pexelsApiKey: env.PEXELS_API_KEY,
    unsplashAccessKey: env.UNSPLASH_ACCESS_KEY,
  });
  return image?.imageUrl || null;
}
