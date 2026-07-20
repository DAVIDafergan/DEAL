import { Router } from 'express';

const router = Router();

/** Travelpayouts marker + car-rental/eSIM URL templates were flight-package-specific — retired. */
router.all('*', (_req, res) => {
  res.status(410).json({ error: 'This config endpoint is no longer available on this platform.' });
});

export default router;
