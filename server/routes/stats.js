import { Router } from 'express';
import { getStats } from '../store/statsStore.js';

const router = Router();

/** GET /api/stats — כמה דילים נשלחו, וחיסכון ממוצע */
router.get('/', (_req, res) => {
  res.json(getStats());
});

export default router;
