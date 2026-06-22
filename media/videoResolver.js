import axios from 'axios';
import { buildVibeAwareQuery } from './vibeQueryTerms.js';

const PEXELS_SEARCH_URL = 'https://api.pexels.com/videos/search';
const REQUEST_TIMEOUT_MS = 10000;
const RUNWAY_POLL_ATTEMPTS = 20;
const RUNWAY_POLL_DELAY_MS = 5000;

const EMPTY_RESULT = { videoUrl: null, posterUrl: null };

/**
 * שרשרת fallback לוידאו רקע של הפיד, בעדיפות מהיקר/איכותי לזול/חינמי:
 *   1. Runway ML (RUNWAY_API_KEY) — וידאו AI-generated. ⚠️ לא מאומת מול תשובת API אמיתית
 *      (אין מפתח Production לבדוק) — ה-endpoint/שדות מבוססים על תיעוד כללי. אם משהו שונה
 *      בפועל, זה המקום הראשון לתקן. אין poster frame מ-Runway (לא חלק מהתשובה).
 *   2. Pexels (PEXELS_API_KEY) — וידאו אמיתי וקיים של היעד, חינמי, כולל poster frame
 *      (תמונת preview שמוצגת לפני שהוידאו עצמו נטען — `<video poster>`).
 *   3. בלי שום מפתח: מחזיר { videoUrl: null, posterUrl: null } במכוון — לא ממציאים URL
 *      לוידאו שאין לנו. ה-UI (DealSlide) נופל ל-photo/gradient+motion CSS.
 *
 * cityNameEn + vibe נשלחים יחד ל-query (לא שם העיר בלבד) — שם עיר לבדו יכול להחזיר תוצאה
 * לא קשורה (למשל מבנה תעשייתי במקום נוף חוף ליעד-חוף). ראו media/vibeQueryTerms.js.
 *
 * @returns {Promise<{videoUrl: string|null, posterUrl: string|null}>}
 */
export async function resolveVideoForDestination(cityNameEn, vibe, env = process.env) {
  if (env.RUNWAY_API_KEY) {
    try {
      const videoUrl = await generateRunwayVideo(cityNameEn, vibe, env.RUNWAY_API_KEY);
      if (videoUrl) return { videoUrl, posterUrl: null };
    } catch (err) {
      console.error(`[videoResolver] Runway generation failed for "${cityNameEn}":`, err.message);
    }
  }

  if (env.PEXELS_API_KEY) {
    try {
      const result = await searchPexelsVideo(cityNameEn, vibe, env.PEXELS_API_KEY);
      if (result) return result;
    } catch (err) {
      console.error(`[videoResolver] Pexels search failed for "${cityNameEn}":`, err.message);
    }
  }

  return EMPTY_RESULT;
}

async function generateRunwayVideo(cityNameEn, vibe, apiKey) {
  const createRes = await axios.post(
    'https://api.dev.runwayml.com/v1/image_to_video',
    {
      promptText: `Cinematic vertical 8-second travel video of ${buildVibeAwareQuery(cityNameEn, vibe)}, sunny, vibrant`,
      ratio: '768:1280',
    },
    { headers: { Authorization: `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' }, timeout: REQUEST_TIMEOUT_MS }
  );

  const taskId = createRes.data?.id;
  if (!taskId) return null;

  // Runway זה אסינכרוני (יצירה + polling) — מתאים לריענון ברקע (כל כמה שעות), לא לבקשת
  // HTTP בזמן אמת של משתמש שמחכה לתשובה.
  for (let attempt = 0; attempt < RUNWAY_POLL_ATTEMPTS; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, RUNWAY_POLL_DELAY_MS));
    const statusRes = await axios.get(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' },
      timeout: REQUEST_TIMEOUT_MS,
    });
    if (statusRes.data?.status === 'SUCCEEDED') return statusRes.data.output?.[0] || null;
    if (statusRes.data?.status === 'FAILED') return null;
  }

  return null; // timed out — הקורא יפול ל-Pexels/gradient
}

async function searchPexelsVideo(cityNameEn, vibe, apiKey) {
  const res = await axios.get(PEXELS_SEARCH_URL, {
    params: { query: buildVibeAwareQuery(cityNameEn, vibe), orientation: 'portrait', per_page: 1 },
    headers: { Authorization: apiKey },
    timeout: REQUEST_TIMEOUT_MS,
  });

  const video = res.data?.videos?.[0];
  if (!video) return null;

  // 'sd' שמרני יותר על bandwidth מה-quality המלא, אבל עדיין ברור על מסך נייד — אם אין sd,
  // נופלים לכל קובץ ראשון שיש (עדיף וידאו כלשהו מאשר שום וידאו).
  const file = video.video_files?.find((f) => f.quality === 'sd') || video.video_files?.[0];
  if (!file?.link) return null;

  return { videoUrl: file.link, posterUrl: video.image || null };
}
