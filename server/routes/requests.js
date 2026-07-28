import { Router } from 'express';
import jwt from 'jsonwebtoken';
import {
  createGuestRequest, findMatchingProperties, matchOwnersForRequest, recordMatchesAndNotify,
  setMatchedPropertiesCount, getGuestRequestById, listRequestsForUser, closeGuestRequest,
  closeExpiredRequests, listOffersForRequest, listOpenMatchesForAgent, isAgentMatchedToRequest,
  createOffer, verifyMatchUnsubToken,
} from '../store/guestRequestStore.js';
import { updateAgentProfile } from '../store/agentStore.js';
import { requireUserAuth } from '../middleware/userAuth.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'deal-radar-jwt-secret-change-me';
const REGIONS = ['north', 'galilee', 'golan', 'carmel', 'center', 'jerusalem', 'south', 'dead_sea', 'eilat'];
const KOSHER_LEVELS = ['kosher', 'shomer_shabbat', 'kosher_kitchen'];

/** A guest can post a request logged in or anonymously (11.23 §1) — this only ever *reads* a
 * token if one was sent, never requires one. Distinct from requireUserAuth on purpose. */
function optionalUserId(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, JWT_SECRET).userId || null; } catch { return null; }
}

// POST /api/requests — 11.23 §1/§2/§3: create the request, count real matches, notify
// consenting owners. All in one request/response — matching happens once, at creation, not on
// a periodic sweep (the property pool already exists in full).
router.post('/', async (req, res) => {
  try {
    const { region, city, checkIn, checkOut, adults, children, budgetMin, budgetMax, amenities, kosherLevel, notes, contactName, contactEmail, contactPhone } = req.body || {};
    if (!region || !REGIONS.includes(region)) return res.status(400).json({ error: 'יש לבחור אזור' });
    if (!contactEmail || !/\S+@\S+\.\S+/.test(contactEmail)) return res.status(400).json({ error: 'כתובת אימייל תקינה היא שדה חובה' });
    if (kosherLevel && !KOSHER_LEVELS.includes(kosherLevel)) return res.status(400).json({ error: 'רמת כשרות לא תקינה' });

    const requestData = {
      userId: optionalUserId(req), region, city, checkIn, checkOut, adults, children,
      budgetMin, budgetMax, amenities: Array.isArray(amenities) ? amenities : [],
      kosherLevel, notes, contactName, contactEmail, contactPhone,
    };

    const requestId = await createGuestRequest(requestData);
    const matchedProperties = await findMatchingProperties(requestData);
    const ownerMatches = await matchOwnersForRequest(requestData, matchedProperties);

    // notified_owner_count is written inside recordMatchesAndNotify; matched_properties_count
    // (the honest "X" the guest sees) is the real search-result count computed just above.
    await setMatchedPropertiesCount(requestId, matchedProperties.length);
    await recordMatchesAndNotify(requestId, { ...requestData, region, city, check_in: checkIn, check_out: checkOut, budget_min: budgetMin, budget_max: budgetMax }, ownerMatches);

    res.status(201).json({
      requestId,
      matchedPropertiesCount: matchedProperties.length,
      notifiedOwnerCount: ownerMatches.length,
      properties: matchedProperties.slice(0, 12),
    });
  } catch (err) {
    console.error('[requests] create error:', err.message);
    res.status(500).json({ error: 'שגיאה בפרסום הבקשה, נסה שנית' });
  }
});

router.get('/mine', requireUserAuth, async (req, res) => {
  try {
    await closeExpiredRequests();
    res.json({ requests: await listRequestsForUser(req.user.userId) });
  } catch (err) {
    console.error('[requests] get mine error:', err.message);
    res.status(500).json({ error: 'שגיאה בטעינת הבקשות' });
  }
});

// 11.23: every fixed-string route (owner/matches, unsubscribe) MUST be registered before the
// generic /:id below — Express matches route patterns in registration order, and a single-
// segment GET/POST here (e.g. "GET /unsubscribe") matches /:id just as readily as a real id
// would, silently swallowing it behind requireUserAuth (same class of bug documented in
// DECISIONS.md 7.5 for /booking-requests/mine). Caught this exact thing while testing below.
router.get('/owner/matches', requireAgentAuth, async (req, res) => {
  try {
    res.json({ matches: await listOpenMatchesForAgent(req.agentId) });
  } catch (err) {
    console.error('[requests] get owner matches error:', err.message);
    res.status(500).json({ error: 'שגיאה בטעינת הבקשות המתאימות' });
  }
});

// One-click, no-login unsubscribe from match-notification emails (11.23 §3) — every email
// includes this link with a signed, purpose-scoped token (guestRequestStore.signMatchUnsubToken).
router.get('/unsubscribe', async (req, res) => {
  try {
    const agentId = verifyMatchUnsubToken(req.query.token || '');
    await updateAgentProfile(agentId, { match_notifications_enabled: 0 });
    res.type('html').send('<p style="font-family:sans-serif;padding:40px;text-align:center">הוסרת בהצלחה מרשימת התראות ההתאמה. תמיד אפשר להפעיל מחדש מהגדרות החשבון.</p>');
  } catch (err) {
    res.status(400).type('html').send('<p style="font-family:sans-serif;padding:40px;text-align:center">קישור לא תקין או שפג תוקפו.</p>');
  }
});

router.get('/:id', requireUserAuth, async (req, res) => {
  try {
    const request = await getGuestRequestById(req.params.id);
    if (!request || request.user_id !== req.user.userId) return res.status(404).json({ error: 'Not found' });
    res.json({ request });
  } catch (err) {
    console.error('[requests] get one error:', err.message);
    res.status(500).json({ error: 'שגיאה בטעינת הבקשה' });
  }
});

router.get('/:id/offers', requireUserAuth, async (req, res) => {
  try {
    const request = await getGuestRequestById(req.params.id);
    if (!request || request.user_id !== req.user.userId) return res.status(404).json({ error: 'Not found' });
    res.json({ offers: await listOffersForRequest(req.params.id) });
  } catch (err) {
    console.error('[requests] get offers error:', err.message);
    res.status(500).json({ error: 'שגיאה בטעינת ההצעות' });
  }
});

router.patch('/:id/close', requireUserAuth, async (req, res) => {
  try {
    const ok = await closeGuestRequest(req.params.id, req.user.userId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[requests] close error:', err.message);
    res.status(500).json({ error: 'שגיאה בסגירת הבקשה' });
  }
});

router.post('/:id/offers', requireAgentAuth, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const matched = await isAgentMatchedToRequest(req.agentId, requestId);
    if (!matched) return res.status(403).json({ error: 'הבקשה הזו לא הותאמה לנכס שלך' });
    const { propertyId, price, message } = req.body || {};
    if (!propertyId) return res.status(400).json({ error: 'יש לבחור נכס להצעה' });
    await createOffer({ requestId, agentId: req.agentId, propertyId, price, message });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[requests] create offer error:', err.message);
    res.status(500).json({ error: 'שגיאה בשליחת ההצעה' });
  }
});

export default router;
