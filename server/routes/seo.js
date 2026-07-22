import { Router } from 'express';
import { buildSeoLandingData } from '../seo/landingData.js';

const router = Router();

/** GET /api/seo/landing?region=&city=&category= — same data the server-side SSR injector uses
 * (server/seo/landingData.js), exposed so the React SeoLandingPage can render the identical
 * content client-side after hydration (not just for crawlers). */
router.get('/landing', async (req, res) => {
  try {
    const { region, city, category } = req.query;
    const data = await buildSeoLandingData({ regionSlug: region, citySlug: city, categorySlug: category });
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    console.error('[seo] landing error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
