import { getPool } from '../core/db/index.js';
import { searchUnsplashPhoto, triggerUnsplashDownloadTracking } from './unsplashClient.js';

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 יום — תמונות Unsplash לא משתנות, אין סיבה לרענן לעיתים קרובות

let hasWarnedMissingKey = false;

/** מזהיר פעם אחת בלבד (לא spam בלוג) שאין UNSPLASH_ACCESS_KEY — בדקו ב-Railway Variables */
function warnMissingKeyOnce() {
  if (hasWarnedMissingKey) return;
  hasWarnedMissingKey = true;
  console.warn(
    '[destinationImages] UNSPLASH_ACCESS_KEY is not set — destination cards will show the gradient ' +
      'placeholder instead of a real photo. If you set it in Railway Variables and still see this, ' +
      'the env var isn\'t reaching this service (check the variable name/typos and redeploy).'
  );
}

/**
 * DestinationImageService — תמונת יעד אמיתית מ-Unsplash, עם cache ב-MySQL כדי:
 *   1. לא לעבור את מכסת ה-rate-limit של Unsplash (50 בקשות/שעה ב-tier החינמי).
 *   2. לא להמתין ל-Unsplash בכל טעינת עמוד — ברוב המקרים זו שאילתת DB מהירה.
 * אם אין מפתח Unsplash מוגדר, או שהבקשה נכשלת, מחזירים null בעדינות — לא ממציאים תמונה.
 */
export async function getDestinationImage(iataCode, cityNameEn, accessKey) {
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

  if (!accessKey) {
    warnMissingKeyOnce();
    return null;
  }

  let photo;
  try {
    photo = await searchUnsplashPhoto(`${cityNameEn} city`, accessKey);
  } catch (err) {
    console.error(`[destinationImages] Unsplash request failed for ${iataCode} — key IS configured, so this is a real error (bad key, rate limit, network):`, err.message);
    return null;
  }

  if (!photo) {
    console.warn(`[destinationImages] Unsplash returned no results for "${cityNameEn} city" (${iataCode}) — key is configured and the request succeeded, just no matching photo.`);
    return null;
  }

  try {
    await pool.query(
      `INSERT INTO destination_images (iata_code, image_url, thumb_url, attribution_name, attribution_url, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         image_url = VALUES(image_url), thumb_url = VALUES(thumb_url),
         attribution_name = VALUES(attribution_name), attribution_url = VALUES(attribution_url),
         fetched_at = VALUES(fetched_at)`,
      [iataCode, photo.imageUrl, photo.thumbUrl, photo.attributionName, photo.attributionUrl, new Date()]
    );
  } catch (err) {
    console.error(`[destinationImages] Cache write failed for ${iataCode}:`, err.message);
  }

  // לא ממתינים לזה — רישום ה"הורדה" ל-Unsplash הוא בקיורקרסי תנאי שימוש, לא חלק מהתשובה למשתמש
  triggerUnsplashDownloadTracking(photo.downloadLocation, accessKey).catch(() => {});

  return {
    imageUrl: photo.imageUrl,
    thumbUrl: photo.thumbUrl,
    attributionName: photo.attributionName,
    attributionUrl: photo.attributionUrl,
  };
}

function projectImageRow(row) {
  return {
    imageUrl: row.image_url,
    thumbUrl: row.thumb_url,
    attributionName: row.attribution_name,
    attributionUrl: row.attribution_url,
  };
}
