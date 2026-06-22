import axios from 'axios';

const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * UnsplashClient — אינטגרציה רשמית עם Unsplash API (חינמי). אין web scraping ואין משיכה
 * מגוגל — רק תמונות עם רישיון Unsplash ועם ייחוס (attribution) כנדרש בתנאי השימוש שלהם.
 *
 * Official Unsplash API integration. Per Unsplash's API guidelines, every displayed photo
 * must credit the photographer with a link back to Unsplash — handled by the caller using
 * the attribution fields this returns.
 */
export async function searchUnsplashPhoto(query, accessKey) {
  if (!accessKey) {
    throw new Error('Unsplash is not configured: missing UNSPLASH_ACCESS_KEY');
  }

  const { data } = await axios.get(UNSPLASH_SEARCH_URL, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    params: { query, per_page: 1, orientation: 'landscape', content_filter: 'high' },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const photo = data?.results?.[0];
  if (!photo) return null;

  return {
    imageUrl: photo.urls?.regular || null,
    thumbUrl: photo.urls?.small || null,
    attributionName: photo.user?.name || null,
    attributionUrl: photo.user?.links?.html ? `${photo.user.links.html}?utm_source=deal_radar_pro&utm_medium=referral` : null,
    downloadLocation: photo.links?.download_location || null,
  };
}

/**
 * Unsplash מחייבים "רישום הורדה" (ping) כשתמונה מוצגת בפועל, לצורך הסטטיסטיקות שלהם.
 * נכשל בעדינות — זה לא קריטי לתפקוד האתר, רק עמידה בתנאי השימוש.
 *
 * Unsplash's API guidelines require pinging the download_location when a photo is actually
 * displayed. Fails silently — not critical to site function, just ToS compliance bookkeeping.
 */
export async function triggerUnsplashDownloadTracking(downloadLocation, accessKey) {
  if (!downloadLocation || !accessKey) return;
  try {
    await axios.get(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      timeout: REQUEST_TIMEOUT_MS,
    });
  } catch {
    // לא קריטי — מתעלמים מכשלון כדי לא להשפיע על שום דבר אחר
  }
}
