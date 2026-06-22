import { getPool } from '../core/db/index.js';
import { searchUnsplashPhoto, triggerUnsplashDownloadTracking } from './unsplashClient.js';
import { searchPexelsPhoto } from './pexelsClient.js';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 יום — תמונות לא משתנות, אין סיבה לרענן לעיתים קרובות

let hasWarnedMissingKeys = false;

/** מזהיר פעם אחת בלבד (לא spam בלוג) שאין שום מפתח תמונה מוגדר */
function warnMissingKeysOnce() {
  if (hasWarnedMissingKeys) return;
  hasWarnedMissingKeys = true;
  console.warn(
    '[destinationImages] Neither PEXELS_API_KEY nor UNSPLASH_ACCESS_KEY is set — destination cards ' +
      'will show the gradient placeholder instead of a real photo. If you set one in Railway Variables ' +
      "and still see this, the env var isn't reaching this service (check the variable name/typos and redeploy)."
  );
}

/**
 * DestinationImageService — תמונת יעד אמיתית, עם cache ב-MySQL כדי:
 *   1. לא לעבור את מכסת ה-rate-limit של Pexels/Unsplash.
 *   2. לא להמתין ל-API חיצוני בכל טעינת עמוד — ברוב המקרים זו שאילתת DB מהירה.
 * סדר עדיפות: Pexels (PEXELS_API_KEY) ראשון — חינמי, בלי דרישת attribution קשיחה — ואז
 * Unsplash (UNSPLASH_ACCESS_KEY) כ-fallback. בלי שום מפתח, או אם שניהם נכשלים/לא מצאו
 * תוצאה, מחזירים null בעדינות — לא ממציאים תמונה.
 *
 * @param {string} iataCode
 * @param {string} cityNameEn
 * @param {{pexelsApiKey?: string, unsplashAccessKey?: string}} keys
 */
export async function getDestinationImage(iataCode, cityNameEn, keys = {}) {
  const { pexelsApiKey, unsplashAccessKey } = keys;
  const pool = getPool();

  try {
    const [rows] = await pool.query('SELECT * FROM destination_images WHERE iata_code = ?', [iataCode]);
    if (rows.length > 0) {
      const row = rows[0];
      const age = Date.now() - new Date(row.fetched_at).getTime();
      if (age < CACHE_TTL_MS) {
        return projectImageRow(row);
      }
    }
  } catch (err) {
    console.error(`[destinationImages] Cache read failed for ${iataCode}:`, err.message);
  }

  if (pexelsApiKey) {
    try {
      const photo = await searchPexelsPhoto(`${cityNameEn} travel`, pexelsApiKey);
      if (photo) return cacheAndReturn(pool, iataCode, photo, 'pexels');
      console.warn(`[destinationImages] Pexels returned no results for "${cityNameEn} travel" (${iataCode}) — trying Unsplash next.`);
    } catch (err) {
      console.error(`[destinationImages] Pexels request failed for ${iataCode} — key IS configured, so this is a real error:`, err.message);
    }
  }

  if (unsplashAccessKey) {
    let photo;
    try {
      photo = await searchUnsplashPhoto(`${cityNameEn} city`, unsplashAccessKey);
    } catch (err) {
      console.error(`[destinationImages] Unsplash request failed for ${iataCode} — key IS configured, so this is a real error (bad key, rate limit, network):`, err.message);
      return null;
    }

    if (!photo) {
      console.warn(`[destinationImages] Unsplash returned no results for "${cityNameEn} city" (${iataCode}) — key is configured and the request succeeded, just no matching photo.`);
      return null;
    }

    // לא ממתינים לזה — רישום ה"הורדה" ל-Unsplash הוא בקיורקרסי תנאי שימוש, לא חלק מהתשובה למשתמש
    triggerUnsplashDownloadTracking(photo.downloadLocation, unsplashAccessKey).catch(() => {});

    return cacheAndReturn(pool, iataCode, photo, 'unsplash');
  }

  if (!pexelsApiKey && !unsplashAccessKey) {
    warnMissingKeysOnce();
  }

  return null;
}

async function cacheAndReturn(pool, iataCode, photo, source) {
  try {
    await pool.query(
      `INSERT INTO destination_images (iata_code, image_url, thumb_url, attribution_name, attribution_url, source, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         image_url = VALUES(image_url), thumb_url = VALUES(thumb_url),
         attribution_name = VALUES(attribution_name), attribution_url = VALUES(attribution_url),
         source = VALUES(source), fetched_at = VALUES(fetched_at)`,
      [iataCode, photo.imageUrl, photo.thumbUrl, photo.attributionName, photo.attributionUrl, source, new Date()]
    );
  } catch (err) {
    console.error(`[destinationImages] Cache write failed for ${iataCode}:`, err.message);
  }

  return {
    imageUrl: photo.imageUrl,
    thumbUrl: photo.thumbUrl,
    attributionName: photo.attributionName,
    attributionUrl: photo.attributionUrl,
    source,
  };
}

function projectImageRow(row) {
  return {
    imageUrl: row.image_url,
    thumbUrl: row.thumb_url,
    attributionName: row.attribution_name,
    attributionUrl: row.attribution_url,
    source: row.source || 'unsplash', // שורות ישנות (לפני המיגרציה) הגיעו רק מ-Unsplash
  };
}
