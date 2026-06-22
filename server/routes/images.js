import { Router } from 'express';
import { getDestinationImage } from '../../images/destinationImageService.js';
import { getCityName } from '../../web/src/data/cityNames.js';

const router = Router();

/** GET /api/images/:iataCode — תמונת יעד אמיתית מ-Unsplash (עם cache), או 404 אם אין */
router.get('/:iataCode', async (req, res) => {
  const iataCode = req.params.iataCode.toUpperCase();
  const cityNameEn = getCityName(iataCode, 'en');

  const image = await getDestinationImage(iataCode, cityNameEn, process.env.UNSPLASH_ACCESS_KEY);

  if (!image) {
    return res.status(404).json({ error: 'No image available' });
  }

  res.json(image);
});

export default router;
