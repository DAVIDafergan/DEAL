import { Router } from 'express';
import { getStats } from '../store/statsStore.js';

const router = Router();

/** GET /api/stats — כמה דילים נשלחו, וחיסכון ממוצע */
router.get('/', async (_req, res) => {
  const stats = await getStats();
  res.json(stats);
});

export default router;
