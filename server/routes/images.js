import { Router } from 'express';
import { getDestinationImage } from '../../images/destinationImageService.js';
import { searchPexelsVideo } from '../../images/pexelsClient.js';
import { getCityName } from '../../web/src/data/cityNames.js';

const router = Router();

// In-memory video cache — TTL 24h (avoids hammering Pexels per-request)
const videoCache = new Map();

/** GET /api/images/video?q=<query> — Pexels video for a destination keyword */
router.get('/video', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) return res.status(400).json({ error: 'Missing q parameter' });

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'Video not available' });

  const cacheKey = query.toLowerCase();
  const cached = videoCache.get(cacheKey);
  if (cached && Date.now() - cached.at < 24 * 60 * 60 * 1000) {
    return cached.url ? res.json({ url: cached.url }) : res.status(404).json({ error: 'No video' });
  }

  const url = await searchPexelsVideo(`${query} travel`, apiKey);
  videoCache.set(cacheKey, { url, at: Date.now() });

  if (!url) return res.status(404).json({ error: 'No video found' });
  res.json({ url });
});

/** GET /api/images/:iataCode — תמונת יעד אמיתית מ-Unsplash (עם cache), או 404 אם אין */
router.get('/:iataCode', async (req, res) => {
  const iataCode = req.params.iataCode.toUpperCase();
  const cityNameEn = getCityName(iataCode, 'en');

  const image = await getDestinationImage(iataCode, cityNameEn, {
    pexelsApiKey: process.env.PEXELS_API_KEY,
    unsplashAccessKey: process.env.UNSPLASH_ACCESS_KEY,
  });

  if (!image) {
    return res.status(404).json({ error: 'No image available' });
  }

  res.json(image);
});

export default router;
