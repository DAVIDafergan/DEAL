import { Router } from 'express';
import { sourceRegistry } from '../../sources/index.js';
import { getPopularPackages, generatePersonalizedPackages } from '../../core/packages/packageEngine.js';
import { buildPackageDeps } from '../../core/packages/packageDeps.js';

const router = Router();

/** GET /api/packages/popular — "דילים פופולריים היום", מתעדכנים כל 30 דק' ברקע */
router.get('/popular', async (_req, res) => {
  const packages = await getPopularPackages();
  res.json({ packages });
});

/** POST /api/packages/personalized — חבילות מותאמות לתשובות השאלון */
router.post('/personalized', async (req, res) => {
  const { peopleCount, budgetIls, days, destinationType } = req.body || {};

  if (!Number.isFinite(peopleCount) || peopleCount <= 0) {
    return res.status(400).json({ error: 'peopleCount must be a positive number' });
  }
  if (!Number.isFinite(days) || days <= 0) {
    return res.status(400).json({ error: 'days must be a positive number' });
  }
  // budgetIls יכול להיות null ("בלי הגבלה")
  if (budgetIls !== null && budgetIls !== undefined && (!Number.isFinite(budgetIls) || budgetIls <= 0)) {
    return res.status(400).json({ error: 'budgetIls must be a positive number or null' });
  }

  const deps = buildPackageDeps(sourceRegistry);

  if (!deps.travelpayoutsAdapter) {
    return res.status(503).json({ error: 'Package generation requires Travelpayouts to be configured' });
  }

  try {
    const packages = await generatePersonalizedPackages(
      { peopleCount, budgetIls: budgetIls ?? null, days, destinationType: destinationType || null },
      deps
    );
    res.json({ packages });
  } catch (err) {
    console.error('[packages route] Failed to generate personalized packages:', err.message);
    res.status(500).json({ error: 'Failed to generate packages' });
  }
});

export default router;
