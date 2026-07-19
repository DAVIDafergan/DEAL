import { Router } from 'express';

const router = Router();

/** "Deals sent" distribution stats were flight-scan-specific — retired with the rest of the flight world. */
router.all('*', (_req, res) => {
  res.status(410).json({ error: 'Flight stats are no longer available on this platform.' });
});

export default router;
