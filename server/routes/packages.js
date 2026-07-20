import { Router } from 'express';

const router = Router();

/**
 * Flight+hotel packages are retired along with the rest of the flight world (see README).
 * core/packages/packageEngine.js is untouched in the repo, just no longer called.
 */
router.all('*', (_req, res) => {
  res.status(410).json({ error: 'Flight packages are no longer available on this platform.' });
});

export default router;
