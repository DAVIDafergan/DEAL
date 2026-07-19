import { Router } from 'express';

const router = Router();

/**
 * GET /api/config — ערכי תצורה ציבוריים (לא סודיים) שה-frontend צריך כדי לבנות לינקים.
 * ה-Marker של Travelpayouts הוא ציבורי בכל מקרה (הוא חלק מכל לינק שיוצא), אז אין בעיה
 * לחשוף אותו כאן במקום להטביע ב-build של ה-frontend.
 *
 * Public (non-secret) config values the frontend needs to build package links. The
 * Travelpayouts marker is public anyway (it's in every outbound URL), so exposing it here
 * avoids needing a separate frontend-build-time env var to keep in sync.
 */
router.get('/', (_req, res) => {
  res.json({
    travelpayoutsMarker: process.env.TRAVELPAYOUTS_MARKER || null,
    carRentalUrlTemplate: process.env.TRAVELPAYOUTS_CAR_RENTAL_URL_TEMPLATE || null,
    esimUrlTemplate: process.env.TRAVELPAYOUTS_ESIM_URL_TEMPLATE || null,
  });
});

export default router;
