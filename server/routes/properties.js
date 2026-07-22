import { Router } from 'express';
import {
  searchProperties, getPropertyById, getPropertiesByIds, getPropertyByIdForOwner, getPropertyByIdRaw, listPropertiesByOwner,
  createProperty, updateProperty,
  getAvailability, setAvailability,
  createBookingRequest, getBookingRequestById, getBookingRequestByTrackingToken, listBookingRequestsForOwner,
  listBookingRequestsAcrossOwner, updateBookingRequestStatus, getUnitById,
  listPublicPropertiesByOwner, listCitiesForRegion, getFacetCounts,
  listDeletedPropertiesByOwner, softDeleteProperty, restoreProperty,
  createClaimCode, verifyClaimCode,
  createUnit, updateUnit, deactivateUnit, duplicateUnit, reorderUnits,
  getPublishChecklist, publishProperty,
} from '../store/propertyStore.js';
import { findAgentBySlug, findAgentById } from '../store/agentStore.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';
import { sendVerificationCode, notifyOwnerOfBookingRequest } from '../services/complianceMessaging.js';
import { notifyCustomerBookingReceived, notifyOwnerNewBooking, notifyCustomerStatusChanged, estimateBookingPrice } from '../services/bookingNotifications.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { geocodePropertyInBackground } from '../services/geocode.js';
import { ttlCached } from '../utils/ttlCache.js';

const cachedSearch = ttlCached('search', 30_000);
const cachedFacetCounts = ttlCached('facet-counts', 30_000);

function publicOwner(a) {
  const { password_hash, email, phone, stripe_customer_id, stripe_subscription_id, rejection_reason, account_type, ...rest } = a;
  return rest;
}

const router = Router();

const REGIONS = ['north', 'galilee', 'golan', 'carmel', 'center', 'jerusalem', 'south', 'dead_sea', 'eilat'];
const PROPERTY_TYPES = ['zimmer', 'villa', 'cottage', 'suite'];
const KOSHER_LEVELS = ['kosher', 'shomer_shabbat', 'kosher_kitchen', 'not_applicable'];

// ── Search ──────────────────────────────────────────────────────────────────────

/** GET /api/properties?region=&property_type=&min_guests=&max_price=&kosher_level=&amenities=a,b — public search */
router.get('/', async (req, res) => {
  try {
    const { region, city, property_type, min_guests, bedrooms, min_price, max_price, kosher_level, amenities, check_in, check_out, limit, sort } = req.query;
    const filters = {
      region: REGIONS.includes(region) ? region : undefined,
      city: city || undefined,
      propertyType: PROPERTY_TYPES.includes(property_type) ? property_type : undefined,
      minGuests: min_guests,
      bedrooms,
      minPrice: min_price,
      maxPrice: max_price,
      kosherLevel: KOSHER_LEVELS.includes(kosher_level) ? kosher_level : undefined,
      amenities: amenities ? String(amenities).split(',') : [],
      checkIn: check_in && check_out ? check_in : undefined,
      checkOut: check_in && check_out ? check_out : undefined,
      sort: ['price_asc', 'price_desc', 'new'].includes(sort) ? sort : undefined,
      limit,
    };
    // 10.1: 30s TTL cache — identical query string (the overwhelmingly common case: the
    // homepage's default no-filter search) is served from memory instead of hitting MySQL again.
    const properties = await cachedSearch(JSON.stringify(filters), () => searchProperties(filters));
    res.json({ properties });
  } catch (err) {
    console.error('[properties] search error:', err.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

/** GET /api/properties/cities?region= — distinct cities with listings in that region, for the
 * staged filter's "where" step. */
router.get('/cities', async (req, res) => {
  try {
    const { region } = req.query;
    if (!REGIONS.includes(region)) return res.json({ cities: [] });
    const cities = await listCitiesForRegion(region);
    res.json({ cities });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** GET /api/properties/facet-counts — 9.3: live per-option result counts for the filter panel,
 * same query shape as GET / (search). */
router.get('/facet-counts', async (req, res) => {
  try {
    const { region, city, property_type, min_guests, bedrooms, min_price, max_price, kosher_level, amenities, check_in, check_out } = req.query;
    const filters = {
      region: REGIONS.includes(region) ? region : undefined,
      city: city || undefined,
      propertyType: PROPERTY_TYPES.includes(property_type) ? property_type : undefined,
      minGuests: min_guests,
      bedrooms,
      minPrice: min_price,
      maxPrice: max_price,
      kosherLevel: KOSHER_LEVELS.includes(kosher_level) ? kosher_level : undefined,
      amenities: amenities ? String(amenities).split(',') : [],
      checkIn: check_in && check_out ? check_in : undefined,
      checkOut: check_in && check_out ? check_out : undefined,
    };
    const counts = await cachedFacetCounts(JSON.stringify(filters), () => getFacetCounts(filters));
    res.json(counts);
  } catch (err) {
    console.error('[properties] facet-counts error:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
});

/** GET /api/properties/batch?ids=1,2,3 — 10.1: one request for many properties (favorites,
 * compare) instead of N parallel GET /:id calls. Registered before /:id so "batch" isn't
 * captured as an id. Caps at 40 ids — same shape as a search page, no real caller needs more. */
router.get('/batch', async (req, res) => {
  try {
    const ids = String(req.query.ids || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, 40);
    const properties = await getPropertiesByIds(ids);
    res.json({ properties });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Public: owner profile (registered before /:id so "by-owner" isn't captured as an id) ──

/** GET /api/properties/by-owner/:slug — public owner profile + their published properties */
router.get('/by-owner/:slug', async (req, res) => {
  try {
    const owner = await findAgentBySlug(req.params.slug);
    if (!owner || owner.status !== 'approved') return res.status(404).json({ error: 'Not found' });
    const properties = await listPublicPropertiesByOwner(owner.id);
    res.json({ owner: publicOwner(owner), properties });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Owner dashboard (registered before /:id so "mine" isn't captured as an id) ──

/** GET /api/properties/mine — the authenticated owner's own listings, any status */
router.get('/mine', requireAgentAuth, async (req, res) => {
  try {
    const properties = await listPropertiesByOwner(req.agentId);
    res.json({ properties });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** GET /api/properties/booking-requests/mine — every booking request across all of the
 * authenticated owner's properties (7.5 dashboard "בקשות הזמנה" screen). Must be registered
 * before /:id/mine below — otherwise "booking-requests" would be captured as :id there. */
router.get('/booking-requests/mine', requireAgentAuth, async (req, res) => {
  try {
    const requests = await listBookingRequestsAcrossOwner(req.agentId);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** PATCH /api/properties/booking-requests/:bookingId/status — approve/reject; emails the
 * customer either way (7.5: "שינוי סטטוס שולח מייל ללקוח"). */
router.patch('/booking-requests/:bookingId/status', requireAgentAuth, async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'status must be approved or rejected' });
    const result = await updateBookingRequestStatus(req.params.bookingId, req.agentId, status);
    if (!result) return res.status(404).json({ error: 'Not found' });
    notifyCustomerStatusChanged({ ...result, status }).catch((err) =>
      console.error('[properties] status-change email failed:', err.message)
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[properties] booking status update error:', err.message);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/** GET /api/properties/trash/mine — recycle bin (7.6), deleted within the last 30 days. Must be
 * registered before /:id/mine for the same reason as booking-requests/mine above. */
router.get('/trash/mine', requireAgentAuth, async (req, res) => {
  try {
    const properties = await listDeletedPropertiesByOwner(req.agentId);
    res.json({ properties });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** GET /api/properties/:id/mine — owner-scoped single-property fetch (unlike the public GET
 * /:id, this includes drafts and all units regardless of is_active) — used by the wizard to
 * resume editing a draft, incl. after a page refresh. */
router.get('/:id/mine', requireAgentAuth, async (req, res) => {
  try {
    const property = await getPropertyByIdForOwner(req.params.id, req.agentId);
    if (!property) return res.status(404).json({ error: 'Not found' });
    res.json({ property });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** POST /api/properties — create a new listing (owner auth required) */
router.post('/', requireAgentAuth, async (req, res) => {
  try {
    const { name, property_type, region } = req.body || {};
    if (!name || !property_type || !region) {
      return res.status(400).json({ error: 'name, property_type, and region are required' });
    }
    if (!PROPERTY_TYPES.includes(property_type)) return res.status(400).json({ error: 'Invalid property_type' });
    if (!REGIONS.includes(region)) return res.status(400).json({ error: 'Invalid region' });

    const id = await createProperty(req.agentId, req.body);
    const property = await getPropertyByIdForOwner(id, req.agentId);
    res.status(201).json({ property });
    if (!req.body.latitude && !req.body.longitude) {
      geocodePropertyInBackground(id, { city: req.body.city, region: req.body.region, address: req.body.address });
    }
  } catch (err) {
    console.error('[properties] create error:', err.message);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

/** PATCH /api/properties/:id — edit own listing */
router.patch('/:id', requireAgentAuth, async (req, res) => {
  try {
    await updateProperty(req.params.id, req.agentId, req.body || {});
    const property = await getPropertyByIdForOwner(req.params.id, req.agentId);
    if (!property) return res.status(404).json({ error: 'Not found' });
    res.json({ property });
    if ((req.body || {}).city || (req.body || {}).address) {
      geocodePropertyInBackground(req.params.id, { city: property.city, region: property.region, address: property.address });
    }
  } catch (err) {
    console.error('[properties] update error:', err.message);
    res.status(500).json({ error: 'Update failed' });
  }
});

/** DELETE /api/properties/:id — soft delete (7.6). Disappears from search/detail immediately;
 * recoverable from the recycle bin for 30 days. */
router.delete('/:id', requireAgentAuth, async (req, res) => {
  try {
    const result = await softDeleteProperty(req.params.id, req.agentId);
    if (!result) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[properties] delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

/** POST /api/properties/:id/restore — undo a soft delete, only within the 30-day window */
router.post('/:id/restore', requireAgentAuth, async (req, res) => {
  try {
    const ok = await restoreProperty(req.params.id, req.agentId);
    if (!ok) return res.status(404).json({ error: 'Not found or past the 30-day restore window' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[properties] restore error:', err.message);
    res.status(500).json({ error: 'Failed to restore property' });
  }
});

/** GET /api/properties/:id/publish-checklist — what's still missing before this draft can go live */
router.get('/:id/publish-checklist', requireAgentAuth, async (req, res) => {
  try {
    const property = await getPropertyByIdForOwner(req.params.id, req.agentId);
    if (!property) return res.status(404).json({ error: 'Not found' });
    res.json(getPublishChecklist(property));
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** POST /api/properties/:id/publish — draft -> active, only if the checklist passes */
router.post('/:id/publish', requireAgentAuth, async (req, res) => {
  try {
    const result = await publishProperty(req.params.id, req.agentId);
    if (result.missing.includes('not_found')) return res.status(404).json({ error: 'Not found' });
    if (!result.ok) return res.status(422).json(result);
    res.json(result);
  } catch (err) {
    console.error('[properties] publish error:', err.message);
    res.status(500).json({ error: 'Failed to publish' });
  }
});

// ── Units (7.3) — always registered before /:id ────────────────────────────────

/** POST /api/properties/:id/units — add a unit to the complex */
router.post('/:id/units', requireAgentAuth, async (req, res) => {
  try {
    const unit = await createUnit(req.params.id, req.agentId, req.body || {});
    if (!unit) return res.status(404).json({ error: 'Not found' });
    res.status(201).json({ unit });
  } catch (err) {
    console.error('[properties] create unit error:', err.message);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

/** PATCH /api/properties/:id/units/:unitId — edit a unit */
router.patch('/:id/units/:unitId', requireAgentAuth, async (req, res) => {
  try {
    const unit = await updateUnit(req.params.unitId, req.agentId, req.body || {});
    if (!unit) return res.status(404).json({ error: 'Not found' });
    res.json({ unit });
  } catch (err) {
    console.error('[properties] update unit error:', err.message);
    res.status(500).json({ error: 'Failed to update unit' });
  }
});

/** POST /api/properties/:id/units/:unitId/duplicate */
router.post('/:id/units/:unitId/duplicate', requireAgentAuth, async (req, res) => {
  try {
    const unit = await duplicateUnit(req.params.unitId, req.agentId);
    if (!unit) return res.status(404).json({ error: 'Not found' });
    res.status(201).json({ unit });
  } catch (err) {
    res.status(500).json({ error: 'Failed to duplicate unit' });
  }
});

/** DELETE /api/properties/:id/units/:unitId — soft: flips is_active=0 (see deactivateUnit) */
router.delete('/:id/units/:unitId', requireAgentAuth, async (req, res) => {
  try {
    const ok = await deactivateUnit(req.params.unitId, req.agentId);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
});

/** PATCH /api/properties/:id/units/reorder — body: { orderedIds: [id, id, ...] } */
router.patch('/:id/units/reorder', requireAgentAuth, async (req, res) => {
  try {
    const { orderedIds } = req.body || {};
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ error: 'orderedIds array is required' });
    }
    const ok = await reorderUnits(req.params.id, req.agentId, orderedIds);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder units' });
  }
});

// ── Availability ──────────────────────────────────────────────────────────────

/** GET /api/properties/:id/availability?from=&to=&unit_id= — public read */
router.get('/:id/availability', async (req, res) => {
  try {
    const property = await getPropertyById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Not found' });
    const { from, to, unit_id } = req.query;
    const availability = await getAvailability(req.params.id, { from, to, unitId: unit_id });
    res.json({ availability });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

/** PATCH /api/properties/:id/availability — owner sets availability for a batch of dates, optionally scoped to unit_id */
router.patch('/:id/availability', requireAgentAuth, async (req, res) => {
  try {
    const { dates, unit_id } = req.body || {};
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'dates array is required' });
    }
    const ok = await setAvailability(req.params.id, req.agentId, dates, unit_id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[properties] availability update error:', err.message);
    res.status(500).json({ error: 'Failed to update availability' });
  }
});

/** GET /api/properties/booking-requests/track/:token — 9.6: public status lookup for a
 * customer's own booking request, no login required. Keyed by the random tracking_token, never
 * the sequential id (see core/db/index.js migration comment for why). */
router.get('/booking-requests/track/:token', async (req, res) => {
  try {
    const booking = await getBookingRequestByTrackingToken(req.params.token);
    if (!booking) return res.status(404).json({ error: 'Not found' });
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Booking requests ─────────────────────────────────────────────────────────

/** POST /api/properties/:id/booking-requests — public: a customer requests to book.
 * - Claimed/active property (has a registered owner): the owner is emailed immediately — this is
 *   transactional to a user who registered to receive bookings, not subject to
 *   PROPERTY_MESSAGING_ENABLED (7.5).
 * - Unclaimed property (auto-collected, no owner account): unchanged existing behavior — a single
 *   WhatsApp notification gated behind PROPERTY_MESSAGING_ENABLED (server/services/complianceMessaging.js).
 * The customer gets an email confirmation either way, if they gave an email address. */
router.post('/:id/booking-requests', async (req, res) => {
  try {
    const property = await getPropertyById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Not found' });
    const { check_in, check_out, customer_name, customer_phone } = req.body || {};
    if (!check_in || !check_out || !customer_name || !customer_phone) {
      return res.status(400).json({ error: 'check_in, check_out, customer_name, and customer_phone are required' });
    }
    const created = await createBookingRequest(req.params.id, req.body);
    if (!created) return res.status(400).json({ error: 'Invalid unit for this property' });
    const { id, trackingToken } = created;
    const booking = await getBookingRequestById(id);
    const unit = await getUnitById(booking.unit_id);

    notifyCustomerBookingReceived({ property, unit, booking }).catch((err) =>
      console.error('[properties] customer confirmation email failed:', err.message)
    );
    if (property.owner_id) {
      findAgentById(property.owner_id).then((owner) => {
        if (owner) return notifyOwnerNewBooking({ owner, property, unit, booking });
      }).catch((err) => console.error('[properties] owner booking email failed:', err.message));
    } else {
      notifyOwnerOfBookingRequest(property, booking).catch((err) =>
        console.error('[properties] booking notification failed:', err.message)
      );
    }

    const priceEstimate = estimateBookingPrice({ unit, currency: property.currency, checkIn: check_in, checkOut: check_out });
    res.status(201).json({ id, trackingToken, priceEstimate });
  } catch (err) {
    console.error('[properties] booking request error:', err.message);
    res.status(500).json({ error: 'Failed to submit booking request' });
  }
});

/** GET /api/properties/:id/booking-requests — owner views requests for their own property */
router.get('/:id/booking-requests', requireAgentAuth, async (req, res) => {
  try {
    const requests = await listBookingRequestsForOwner(req.params.id, req.agentId);
    if (requests === null) return res.status(404).json({ error: 'Not found' });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Ownership claim (Step 5) ────────────────────────────────────────────────────

/** POST /api/properties/:id/claim/request — owner auth required. Sends a one-time code to the
 * phone/whatsapp already on the property record (proof they control that number, not just a
 * claim of ownership). Property must be unclaimed and have a contact number on file. */
router.post('/:id/claim/request', requireAgentAuth, authRateLimiter, async (req, res) => {
  try {
    const property = await getPropertyByIdRaw(req.params.id);
    if (!property || property.status === 'hidden') return res.status(404).json({ error: 'Not found' });
    if (property.status !== 'unclaimed') return res.status(409).json({ error: 'Property is not available to claim' });
    const targetPhone = property.whatsapp || property.phone;
    if (!targetPhone) return res.status(422).json({ error: 'This property has no phone number on file to verify against' });

    const code = await createClaimCode(property.id, req.agentId);
    await sendVerificationCode(targetPhone, code);
    // Never echo the code itself — just confirm where it went (masked).
    const masked = targetPhone.replace(/.(?=.{4})/g, '•');
    res.json({ ok: true, sentTo: masked });
  } catch (err) {
    console.error('[properties] claim request error:', err.message);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

/** POST /api/properties/:id/claim/verify — on success, property.owner_id is set and status
 * becomes 'pending' (awaiting admin approval — see server/routes/admin.js). */
router.post('/:id/claim/verify', requireAgentAuth, authRateLimiter, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: 'code is required' });
    const ok = await verifyClaimCode(req.params.id, req.agentId, code);
    if (!ok) return res.status(400).json({ error: 'Invalid or expired code' });
    res.json({ ok: true, status: 'pending' });
  } catch (err) {
    console.error('[properties] claim verify error:', err.message);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// ── Single property (registered last — it's the catch-all for GET /:id) ───────

/** GET /api/properties/:id — public property detail */
router.get('/:id', async (req, res) => {
  try {
    const property = await getPropertyById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Not found' });
    res.json({ property });
  } catch (err) {
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
