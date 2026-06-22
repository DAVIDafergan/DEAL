import axios from 'axios';

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';
const REQUEST_TIMEOUT_MS = 8000;

/**
 * PexelsClient — אינטגרציה רשמית עם Pexels API (חינמי). Pexels לא מחייב ייחוס (attribution)
 * בתנאי השימוש שלו (בניגוד ל-Unsplash), אבל מציינים את הצלם כשיש — נחמד, לא חובה.
 */
export async function searchPexelsPhoto(query, apiKey) {
  if (!apiKey) {
    throw new Error('Pexels is not configured: missing PEXELS_API_KEY');
  }

  const { data } = await axios.get(PEXELS_SEARCH_URL, {
    headers: { Authorization: apiKey },
    params: { query, per_page: 1 },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const photo = data?.photos?.[0];
  if (!photo) return null;

  return {
    imageUrl: photo.src?.large || photo.src?.medium || null,
    thumbUrl: photo.src?.medium || photo.src?.small || null,
    attributionName: photo.photographer || null,
    attributionUrl: photo.photographer_url || null,
  };
}
