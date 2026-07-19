import { Router } from 'express';
import { createPersonalRadar, listPersonalRadars } from '../store/personalRadarStore.js';

const router = Router();

/** POST /api/personal-radar — יצירת רדאר אישי למשתמש */
router.post('/', (req, res) => {
  const { destination, budget, dateFrom, dateTo, contact } = req.body || {};

  if (!destination || typeof destination !== 'string') {
    return res.status(400).json({ error: 'destination is required' });
  }
  if (budget === undefined || typeof budget !== 'number' || budget <= 0) {
    return res.status(400).json({ error: 'budget must be a positive number' });
  }
  if (!dateFrom || !dateTo) {
    return res.status(400).json({ error: 'dateFrom and dateTo are required' });
  }

  const radar = createPersonalRadar({ destination, budget, dateFrom, dateTo, contact });
  res.status(201).json(radar);
});

/** GET /api/personal-radar — רשימת הרדארים הקיימים (שימושי ל-debug/admin) */
router.get('/', (_req, res) => {
  res.json({ radars: listPersonalRadars() });
});

export default router;
