import axios from 'axios';

const REQUEST_TIMEOUT_MS = 10000;

const VIBE_MUBERT_PROMPTS = {
  urban: 'upbeat electronic urban, modern energy',
  beach: 'chill tropical ambient, relaxing waves',
  nature: 'organic peaceful ambient, natural sounds',
  romantic: 'romantic acoustic warm, intimate',
};

/**
 * מוזיקת רקע מתאימה לווייב, מ-Mubert (MUBERT_API_KEY). ⚠️ לא מאומת מול תשובת API אמיתית —
 * אין מפתח Production לבדוק; ה-endpoint/שדות מבוססים על תיעוד כללי, לא קריאה שנבדקה בפועל.
 * בלי מפתח, או אם הבקשה נכשלת: מחזיר null במכוון — לא ממציאים URL לרצועה שאין לנו.
 * ה-UI (DealSlide) פשוט מנגן בלי רקע מוזיקלי במקרה הזה.
 */
export async function resolveMusicForVibe(vibe, env = process.env) {
  if (!env.MUBERT_API_KEY) return null;

  const prompt = VIBE_MUBERT_PROMPTS[vibe];
  if (!prompt) return null;

  try {
    const res = await axios.post(
      'https://music-api.mubert.com/api/v3/public/tracks',
      { prompt, duration: 60, format: 'mp3' },
      { headers: { Authorization: `Bearer ${env.MUBERT_API_KEY}` }, timeout: REQUEST_TIMEOUT_MS }
    );
    return res.data?.data?.tracks?.[0]?.url || null;
  } catch (err) {
    console.error(`[musicResolver] Mubert request failed for vibe "${vibe}":`, err.message);
    return null;
  }
}
