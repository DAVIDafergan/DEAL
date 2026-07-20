import { Router } from 'express';

const router = Router();

/**
 * Flights are retired — the platform now covers zimmer/villa rentals only (see README).
 * The scanning/live-deal/vibe-feed logic this router used to expose (dealsStore, the anomaly
 * engine, the live-deal builder, the vibe feed engine) is untouched in the repo, just no longer
 * called from here. 410, not 404: this endpoint existed and is permanently gone, not a typo.
 */
router.all('*', (_req, res) => {
  res.status(410).json({ error: 'Flight deals are no longer available on this platform.' });
});

export default router;
