import { Router } from 'express';
import { getDestinationImage } from '../../images/destinationImageService.js';
import { searchPexelsVideo } from '../../images/pexelsClient.js';
import { getCityName } from '../../web/src/data/cityNames.js';
import { getImageRow } from '../../media/imageStorage/dbStorage.js';

const router = Router();

/** GET /api/images/:id?size=thumb — 11.5 "db" ImageStorage backend: serves the raw bytes
 * straight out of MySQL. Registered before the /:iataCode route below and constrained to
 * digits only, since IATA codes are always 3 letters — the two can never collide, but the
 * numeric route must come first or Express would never reach it (both are single-segment
 * patterns at the same level). Long-cache + ETag: property_images rows are immutable (a new
 * upload is a new row, never an edit-in-place), so this is safe to cache hard. */
router.get('/:id(\\d+)', async (req, res) => {
  try {
    const wantThumb = req.query.size === 'thumb';
    const row = await getImageRow(req.params.id, { thumb: wantThumb });
    if (!row || !row.bytes) return res.status(404).json({ error: 'התמונה לא נמצאה' });
    const etag = `"img-${req.params.id}-${wantThumb ? 't' : 'f'}"`;
    if (req.headers['if-none-match'] === etag) return res.status(304).end();
    res.set({
      'Content-Type': row.mime_type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: etag,
    });
    res.send(row.bytes);
  } catch (err) {
    console.error('[images] serve error:', err.message);
    res.status(500).json({ error: 'שגיאה בטעינת התמונה' });
  }
});

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
