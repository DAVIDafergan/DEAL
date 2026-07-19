import { Router } from 'express';

const router = Router();

/** Flight-destination personal radar is retired along with the rest of the flight world. */
router.all('*', (_req, res) => {
  res.status(410).json({ error: 'Personal flight radar is no longer available on this platform.' });
});

export default router;
