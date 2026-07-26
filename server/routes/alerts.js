import { Router } from 'express';
import { contactRateLimiter } from '../middleware/rateLimiter.js';
import { createAlert, unsubscribeAlert, listAlertsForEmail, unsubscribeAlertForEmail } from '../store/alertStore.js';
import { requireUserAuth } from '../middleware/userAuth.js';
import { findUserById } from '../store/userStore.js';

const router = Router();

/** GET /api/alerts/mine — the logged-in customer's own alerts, looked up by their account
 * email (alerts themselves are intentionally account-free — see createAlert above). */
router.get('/mine', requireUserAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ alerts: await listAlertsForEmail(user.email) });
  } catch (err) {
    console.error('[alerts] list mine error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

router.delete('/mine/:id', requireUserAuth, async (req, res) => {
  try {
    const user = await findUserById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await unsubscribeAlertForEmail(req.params.id, user.email);
    res.json({ ok: true });
  } catch (err) {
    console.error('[alerts] delete mine error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

const REGION_VALUES = ['north', 'galilee', 'golan', 'carmel', 'center', 'jerusalem', 'south', 'dead_sea', 'eilat'];

/** POST /api/alerts — 11.14: no account. body: { email, region?, maxPrice?, checkIn?, checkOut?, guestCapacity? }. */
router.post('/', contactRateLimiter, async (req, res) => {
  try {
    const { email, region, maxPrice, checkIn, checkOut, guestCapacity } = req.body || {};
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'כתובת אימייל תקינה נדרשת' });
    if (region && !REGION_VALUES.includes(region)) return res.status(400).json({ error: 'Invalid region' });
    const { token } = await createAlert({
      email,
      region: region || null,
      maxPrice: maxPrice ? Number(maxPrice) : null,
      checkIn: checkIn || null,
      checkOut: checkOut || null,
      guestCapacity: guestCapacity ? Number(guestCapacity) : null,
    });
    res.status(201).json({ ok: true, token });
  } catch (err) {
    console.error('[alerts] create error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** GET /api/alerts/:token/unsubscribe — this is the link clicked directly from the email
 * itself, so it's a plain HTML confirmation, not a JSON API response. */
router.get('/:token/unsubscribe', async (req, res) => {
  try {
    const ok = await unsubscribeAlert(req.params.token);
    res.set('Content-Type', 'text/html; charset=utf-8').send(
      `<!DOCTYPE html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>הוסרת מהתראות</title></head>
       <body style="font-family:sans-serif;text-align:center;padding:60px 20px">
         <p style="font-size:18px">${ok ? 'הוסרת בהצלחה מרשימת התפוצה של ההתראה.' : 'קישור לא תקין או שכבר בוטל.'}</p>
       </body></html>`
    );
  } catch (err) {
    console.error('[alerts] unsubscribe error:', err.message);
    res.status(500).send('Internal error');
  }
});

export default router;
