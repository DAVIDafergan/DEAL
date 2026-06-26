import { Router } from 'express';
import axios from 'axios';

const router = Router();

let cachedTracks = null;
let cacheAt = 0;
const CACHE_TTL = 3600 * 1000; // 1 hour

/**
 * GET /api/music/playlist — upbeat tracks from Pixabay Music API.
 * Returns { tracks: [] } silently if PIXABAY_API_KEY is not set.
 */
router.get('/playlist', async (_req, res) => {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return res.json({ tracks: [] });

  if (cachedTracks && Date.now() - cacheAt < CACHE_TTL) {
    return res.json({ tracks: cachedTracks });
  }

  try {
    const { data } = await axios.get('https://pixabay.com/api/music/', {
      params: {
        key,
        q: 'upbeat travel',
        per_page: 15,
        page: 1,
      },
      timeout: 8000,
    });

    const tracks = (data.hits || [])
      .map(t => ({
        id: t.id,
        url: t.previewURL,
        title: (t.tags || '').split(',')[0].trim(),
        bpm: t.bpm,
        duration: t.duration,
      }))
      .filter(t => t.url);

    cachedTracks = tracks;
    cacheAt = Date.now();
    res.json({ tracks });
  } catch (err) {
    console.error('[music] Pixabay fetch failed:', err.message);
    res.json({ tracks: [] });
  }
});

export default router;
