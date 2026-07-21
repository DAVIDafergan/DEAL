import { Router } from 'express';
import {
  searchProperties, getPropertyById, getPropertyByIdForOwner, getPropertyByIdRaw, listPropertiesByOwner,
  createProperty, updateProperty,
  getAvailability, setAvailability,
  createBookingRequest, getBookingRequestById, listBookingRequestsForOwner,
  listPublicPropertiesByOwner, listCitiesForRegion,
  createClaimCode, verifyClaimCode,
  createUnit, updateUnit, deactivateUnit, duplicateUnit, reorderUnits,
} from '../store/propertyStore.js';
import { findAgentBySlug } from '../store/agentStore.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';
import { sendVerificationCode, notifyOwnerOfBookingRequest } from '../services/complianceMessaging.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

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
    const { region, city, property_type, min_guests, bedrooms, min_price, max_price, kosher_level, amenities, check_in, check_out, limit } = req.query;
    const properties = await searchProperties({
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
      limit,
    });
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
  } catch (err) {
    console.error('[properties] update error:', err.message);
    res.status(500).json({ error: 'Update failed' });
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

// ── Booking requests ─────────────────────────────────────────────────────────

/** POST /api/properties/:id/booking-requests — public: a customer requests to book. For
 * unclaimed properties (no owner account to see a dashboard), this is their first real contact
 * with the platform — notify once via WhatsApp (server/services/complianceMessaging.js). */
router.post('/:id/booking-requests', async (req, res) => {
  try {
    const property = await getPropertyById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Not found' });
    const { check_in, check_out, customer_name, customer_phone } = req.body || {};
    if (!check_in || !check_out || !customer_name || !customer_phone) {
      return res.status(400).json({ error: 'check_in, check_out, customer_name, and customer_phone are required' });
    }
    const id = await createBookingRequest(req.params.id, req.body);
    if (!id) return res.status(400).json({ error: 'Invalid unit for this property' });
    if (!property.owner_id) {
      const booking = await getBookingRequestById(id);
      notifyOwnerOfBookingRequest(property, booking).catch((err) =>
        console.error('[properties] booking notification failed:', err.message)
      );
    }
    res.status(201).json({ id });
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
