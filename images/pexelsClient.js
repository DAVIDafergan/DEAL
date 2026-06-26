import axios from 'axios';

const PEXELS_SEARCH_URL = 'https://api.pexels.com/v1/search';
const PEXELS_VIDEO_URL = 'https://api.pexels.com/videos/search';
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

export async function searchPexelsVideo(query, apiKey) {
  if (!apiKey) return null;
  try {
    const { data } = await axios.get(PEXELS_VIDEO_URL, {
      headers: { Authorization: apiKey },
      params: { query, per_page: 5, orientation: 'portrait' },
      timeout: REQUEST_TIMEOUT_MS,
    });
    const video = data?.videos?.[0];
    if (!video) return null;
    // Prefer HD portrait file ≤720p for fast mobile loading
    const file = video.video_files?.find(f => f.quality === 'hd' && f.height <= 1280 && f.width <= 720)
      || video.video_files?.find(f => f.quality === 'sd')
      || video.video_files?.[0];
    return file?.link || null;
  } catch {
    return null;
  }
}
