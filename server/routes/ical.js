import { Router } from 'express';
import { getPool } from '../../core/db/index.js';
import { buildIcsFeed } from '../services/icalService.js';

const router = Router();

/** GET /api/ical/:token.ics — public, no auth (this is exactly the URL an owner pastes into
 * Airbnb/Booking/Google Calendar as an external calendar subscription — those services can't
 * send an Authorization header). The token itself is the only access control, same reasoning as
 * booking_requests.tracking_token. */
router.get('/:tokenWithExt', async (req, res) => {
  try {
    const token = req.params.tokenWithExt.replace(/\.ics$/i, '');
    const pool = getPool();
    const [[unit]] = await pool.query('SELECT id, name, property_id FROM property_units WHERE ical_export_token = ? LIMIT 1', [token]);
    if (!unit) return res.status(404).send('Not found');
    const [dates] = await pool.query(
      'SELECT date FROM availability WHERE unit_id = ? AND is_available = 0 ORDER BY date ASC',
      [unit.id]
    );
    const ics = buildIcsFeed(unit.name, dates.map((d) => d.date.toISOString ? d.date.toISOString().slice(0, 10) : String(d.date).slice(0, 10)));
    res.set('Content-Type', 'text/calendar; charset=utf-8').send(ics);
  } catch (err) {
    console.error('[ical] export error:', err.message);
    res.status(500).send('Internal error');
  }
});

export default router;
