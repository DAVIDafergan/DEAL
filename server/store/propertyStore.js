import { getPool } from '../../core/db/index.js';
import { normalizePhone, addToBlocklist } from '../../core/compliance/blocklist.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export const AMENITY_FIELDS = [
  'has_private_jacuzzi', 'has_private_pool', 'has_heated_pool', 'has_sauna', 'has_view',
  'has_garden', 'has_bbq', 'has_outdoor_jacuzzi', 'has_parking', 'has_air_conditioning',
  'has_equipped_kitchen', 'has_wifi', 'is_kid_friendly', 'is_pet_friendly', 'is_accessible',
];

// status is writable by owners, but only within claimed/active — unclaimed and hidden are
// engine/compliance-only transitions (see core/db/index.js properties.status comment).
const OWNER_EDITABLE_FIELDS = [
  'name', 'description', 'property_type', 'region', 'city', 'address', 'latitude', 'longitude',
  'guest_capacity', 'bedrooms', 'beds', 'bathrooms',
  ...AMENITY_FIELDS,
  'kosher_level', 'base_price_night', 'weekend_price', 'holiday_price', 'cleaning_fee',
  'min_nights', 'currency', 'owner_images', 'phone', 'whatsapp', 'email', 'website', 'status',
];

function parseJsonField(value) {
  if (value == null) return null;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function parseProperty(row) {
  if (!row) return row;
  return {
    ...row,
    owner_images: parseJsonField(row.owner_images),
    source_image_urls: parseJsonField(row.source_image_urls),
  };
}

// Defense-in-depth beyond opted_out (which is set immediately at removal time): a property
// re-collected later for an already-blocklisted phone/whatsapp/source domain must never
// display either. See core/compliance/blocklist.js — this is the read-time half of "בדיקה
// לפני כל הצגה של נכס"; addToBlocklist() + opted_out=1 together are the write-time half.
const NOT_BLOCKLISTED_SQL = `
  NOT EXISTS (SELECT 1 FROM blocklist b WHERE b.type = 'phone' AND (b.value = properties.phone OR b.value = properties.whatsapp))
  AND NOT EXISTS (SELECT 1 FROM blocklist b WHERE b.type = 'domain' AND properties.source_url IS NOT NULL AND properties.source_url LIKE CONCAT('%', b.value, '%'))
`;

/** GET /api/properties — public search. Never returns hidden, opted-out, or blocklisted rows. */
export async function searchProperties(filters = {}) {
  const pool = getPool();
  const where = [`status != 'hidden'`, 'opted_out = 0', NOT_BLOCKLISTED_SQL];
  const vals = [];

  if (filters.region) { where.push('region = ?'); vals.push(filters.region); }
  if (filters.propertyType) { where.push('property_type = ?'); vals.push(filters.propertyType); }
  if (filters.minGuests) { where.push('guest_capacity >= ?'); vals.push(Number(filters.minGuests)); }
  if (filters.maxPrice) { where.push('base_price_night <= ?'); vals.push(Number(filters.maxPrice)); }
  if (filters.kosherLevel) { where.push('kosher_level = ?'); vals.push(filters.kosherLevel); }
  for (const amenity of filters.amenities || []) {
    if (AMENITY_FIELDS.includes(amenity)) where.push(`${amenity} = 1`);
  }
  // No availability row for a date = available by default (see availability table); only an
  // explicit is_available=0 row excludes a property from date-filtered search results.
  if (filters.checkIn && filters.checkOut) {
    where.push(`NOT EXISTS (
      SELECT 1 FROM availability av
      WHERE av.property_id = properties.id AND av.date >= ? AND av.date < ? AND av.is_available = 0
    )`);
    vals.push(filters.checkIn, filters.checkOut);
  }

  const limit = Math.min(Number(filters.limit) || 40, 100);
  const [rows] = await pool.query(
    `SELECT * FROM properties WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ?`,
    [...vals, limit]
  );
  return rows.map(parseProperty);
}

/** Public single-property lookup — 404-equivalent (null) for hidden/opted-out/blocklisted rows. */
export async function getPropertyById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM properties WHERE id = ? AND status != 'hidden' AND opted_out = 0 AND ${NOT_BLOCKLISTED_SQL} LIMIT 1`,
    [id]
  );
  return rows[0] ? parseProperty(rows[0]) : null;
}

/** Owner-scoped lookup — bypasses the hidden/opted-out filter so an owner can see their own listing regardless of status. */
export async function getPropertyByIdForOwner(id, ownerId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM properties WHERE id = ? AND owner_id = ? LIMIT 1', [id, ownerId]);
  return rows[0] ? parseProperty(rows[0]) : null;
}

export async function listPropertiesByOwner(ownerId) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM properties WHERE owner_id = ? ORDER BY updated_at DESC', [ownerId]);
  return rows.map(parseProperty);
}

/** Public owner-profile listing — only claimed/active, never hidden/opted-out (mirrors searchProperties' guard). */
export async function listPublicPropertiesByOwner(ownerId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM properties
     WHERE owner_id = ? AND status IN ('claimed', 'active') AND opted_out = 0
     ORDER BY updated_at DESC`,
    [ownerId]
  );
  return rows.map(parseProperty);
}

export async function createProperty(ownerId, fields) {
  const pool = getPool();
  const ts = nowStr();
  const [result] = await pool.query(
    `INSERT INTO properties (
       owner_id, name, description, property_type, region, city, address, latitude, longitude,
       guest_capacity, bedrooms, beds, bathrooms,
       ${AMENITY_FIELDS.join(', ')},
       kosher_level, base_price_night, weekend_price, holiday_price, cleaning_fee, min_nights, currency,
       owner_images, phone, whatsapp, email, website,
       status, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
       ${AMENITY_FIELDS.map(() => '?').join(', ')},
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'claimed', 'manual', ?, ?)`,
    [
      ownerId,
      fields.name,
      fields.description || null,
      fields.property_type,
      fields.region,
      fields.city || null,
      fields.address || null,
      fields.latitude ?? null,
      fields.longitude ?? null,
      fields.guest_capacity ?? null,
      fields.bedrooms ?? null,
      fields.beds ?? null,
      fields.bathrooms ?? null,
      ...AMENITY_FIELDS.map((f) => (fields[f] ? 1 : 0)),
      fields.kosher_level || 'not_applicable',
      fields.base_price_night ?? null,
      fields.weekend_price ?? null,
      fields.holiday_price ?? null,
      fields.cleaning_fee ?? null,
      fields.min_nights ?? 1,
      fields.currency || 'ILS',
      fields.owner_images ? JSON.stringify(fields.owner_images) : null,
      // Normalized at the write boundary so blocklist/removal matching (which always compares
      // normalized values — see core/compliance/blocklist.js) can rely on a consistent format
      // instead of re-normalizing stored data on every read.
      normalizePhone(fields.phone) || fields.phone || null,
      normalizePhone(fields.whatsapp) || fields.whatsapp || null,
      fields.email || null,
      fields.website || null,
      ts, ts,
    ]
  );
  return result.insertId;
}

export async function updateProperty(id, ownerId, fields) {
  const pool = getPool();
  const sets = [];
  const vals = [];
  for (const key of OWNER_EDITABLE_FIELDS) {
    if (!Object.hasOwn(fields, key)) continue;
    if (key === 'status' && !['claimed', 'active'].includes(fields.status)) continue;
    let value = fields[key];
    if (key === 'owner_images' && value) value = JSON.stringify(value);
    if ((key === 'phone' || key === 'whatsapp') && value) value = normalizePhone(value) || value;
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  vals.push(nowStr(), id, ownerId);
  await pool.query(`UPDATE properties SET ${sets.join(', ')} WHERE id = ? AND owner_id = ?`, vals);
}

export async function getAvailability(propertyId, { from, to } = {}) {
  const pool = getPool();
  const where = ['property_id = ?'];
  const vals = [propertyId];
  if (from) { where.push('date >= ?'); vals.push(from); }
  if (to) { where.push('date <= ?'); vals.push(to); }
  const [rows] = await pool.query(
    `SELECT date, is_available FROM availability WHERE ${where.join(' AND ')} ORDER BY date ASC`,
    vals
  );
  return rows;
}

/** dates: [{ date: 'YYYY-MM-DD', is_available: boolean }]. Returns false if the property isn't owned by ownerId. */
export async function setAvailability(propertyId, ownerId, dates) {
  const pool = getPool();
  const owned = await getPropertyByIdForOwner(propertyId, ownerId);
  if (!owned) return false;
  const ts = nowStr();
  for (const { date, is_available } of dates) {
    await pool.query(
      `INSERT INTO availability (property_id, date, is_available, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), updated_at = VALUES(updated_at)`,
      [propertyId, date, is_available ? 1 : 0, ts, ts]
    );
  }
  return true;
}

export async function createBookingRequest(propertyId, fields) {
  const pool = getPool();
  const ts = nowStr();
  const [result] = await pool.query(
    `INSERT INTO booking_requests
      (property_id, check_in, check_out, guest_count, customer_name, customer_phone, customer_email,
       message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      propertyId,
      fields.check_in,
      fields.check_out,
      fields.guest_count || 1,
      fields.customer_name,
      fields.customer_phone,
      fields.customer_email || null,
      fields.message || null,
      ts, ts,
    ]
  );
  return result.insertId;
}

export async function getBookingRequestById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM booking_requests WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

/** Returns null (not []) if the property isn't owned by ownerId, so the route can 404. */
export async function listBookingRequestsForOwner(propertyId, ownerId) {
  const owned = await getPropertyByIdForOwner(propertyId, ownerId);
  if (!owned) return null;
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT * FROM booking_requests WHERE property_id = ? ORDER BY created_at DESC',
    [propertyId]
  );
  return rows;
}

// ── Ownership claim flow (Step 5) ──────────────────────────────────────────────────────────

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 digits
}

/** Raw lookup bypassing the public hidden/opted-out/blocklist filter — claim flow needs to see
 * unclaimed properties regardless (that's the whole point), but still must not resurrect an
 * opted-out one. */
export async function getPropertyByIdRaw(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM properties WHERE id = ? LIMIT 1', [id]);
  return rows[0] ? parseProperty(rows[0]) : null;
}

/** Creates a fresh claim code for (property, owner), invalidating any prior unverified one for
 * the same pair (a re-request shouldn't leave two valid codes active). Returns the property's
 * contact phone the code was "sent" to, and the code itself (caller passes it to the messaging
 * service — never returned to the HTTP client). */
export async function createClaimCode(propertyId, ownerId) {
  const pool = getPool();
  const now = nowStr();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(
    `DELETE FROM verification_codes WHERE purpose = 'property_claim' AND property_id = ? AND owner_id = ? AND verified_at IS NULL`,
    [propertyId, ownerId]
  );
  await pool.query(
    `INSERT INTO verification_codes (purpose, target, property_id, owner_id, code, expires_at, created_at)
     VALUES ('property_claim', ?, ?, ?, ?, ?, ?)`,
    [String(propertyId), propertyId, ownerId, code, expiresAt, now]
  );
  return code;
}

/** Verifies the code and, on success, moves the property to owner_id=ownerId, status='pending'
 * (admin review gate — see core/db/index.js properties.status comment). Returns false on any
 * mismatch/expiry without leaking which part failed. */
export async function verifyClaimCode(propertyId, ownerId, code) {
  const pool = getPool();
  // Bound UTC parameter, not SQL NOW() — the pool is configured with timezone:'Z' (UTC) for
  // all stored DATETIMEs (see core/db/index.js), but NOW() evaluates in the MySQL server's own
  // session timezone, which is not guaranteed to be UTC. Mixing the two silently breaks expiry.
  const [rows] = await pool.query(
    `SELECT id FROM verification_codes
     WHERE purpose = 'property_claim' AND property_id = ? AND owner_id = ? AND code = ?
       AND verified_at IS NULL AND expires_at >= ?
     ORDER BY created_at DESC LIMIT 1`,
    [propertyId, ownerId, code, nowStr()]
  );
  if (!rows[0]) return false;
  const now = nowStr();
  await pool.query('UPDATE verification_codes SET verified_at = ? WHERE id = ?', [now, rows[0].id]);
  await pool.query(
    `UPDATE properties SET owner_id = ?, status = 'pending', updated_at = ? WHERE id = ? AND status = 'unclaimed'`,
    [ownerId, now, propertyId]
  );
  return true;
}

/** Generic version of createClaimCode for the /remove flow — target is a phone or domain
 * string rather than a property_id/owner_id pair (see verification_codes.purpose). */
export async function createVerificationCode(purpose, target) {
  const pool = getPool();
  const now = nowStr();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(`DELETE FROM verification_codes WHERE purpose = ? AND target = ? AND verified_at IS NULL`, [purpose, target]);
  await pool.query(
    `INSERT INTO verification_codes (purpose, target, code, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
    [purpose, target, code, expiresAt, now]
  );
  return code;
}

export async function verifyCode(purpose, target, code) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id FROM verification_codes
     WHERE purpose = ? AND target = ? AND code = ? AND verified_at IS NULL AND expires_at >= ?
     ORDER BY created_at DESC LIMIT 1`,
    [purpose, target, code, nowStr()]
  );
  if (!rows[0]) return false;
  await pool.query('UPDATE verification_codes SET verified_at = ? WHERE id = ?', [nowStr(), rows[0].id]);
  return true;
}

export async function listPendingClaims() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT p.*, a.business_name AS claimant_business_name, a.email AS claimant_email
     FROM properties p JOIN agents a ON a.id = p.owner_id
     WHERE p.status = 'pending' ORDER BY p.updated_at ASC`
  );
  return rows.map(parseProperty);
}

export async function approveClaim(propertyId) {
  const pool = getPool();
  await pool.query(`UPDATE properties SET status = 'claimed', updated_at = ? WHERE id = ? AND status = 'pending'`, [nowStr(), propertyId]);
}

/** Rejecting a claim reverts the property to unclaimed and detaches the claimant — it does not
 * opt the property out (rejecting a false ownership claim isn't the same as the real owner
 * asking to be removed; that's the separate /remove flow). */
export async function rejectClaim(propertyId) {
  const pool = getPool();
  await pool.query(
    `UPDATE properties SET status = 'unclaimed', owner_id = NULL, updated_at = ? WHERE id = ? AND status = 'pending'`,
    [nowStr(), propertyId]
  );
}

// ── /remove flow (Step 5.5) ────────────────────────────────────────────────────────────────

/** Finds properties by normalized phone/whatsapp OR by source_url containing the domain —
 * used both to send the removal verification code and, after verification, to opt everything
 * matching out in one shot. */
export async function findPropertiesByContact({ phone, domain }) {
  const pool = getPool();
  if (phone) {
    const [rows] = await pool.query('SELECT * FROM properties WHERE phone = ? OR whatsapp = ?', [phone, phone]);
    return rows.map(parseProperty);
  }
  if (domain) {
    const [rows] = await pool.query('SELECT * FROM properties WHERE source_url LIKE CONCAT(\'%\', ?, \'%\')', [domain]);
    return rows.map(parseProperty);
  }
  return [];
}

/** The actual removal: opts out every matching property immediately and permanently, and
 * blocklists the phone/domain so the (future) collection engine never re-adds it. */
export async function removeAndBlock({ phone, domain, method }) {
  const pool = getPool();
  const now = nowStr();
  const properties = await findPropertiesByContact({ phone, domain });
  for (const p of properties) {
    await pool.query(
      `UPDATE properties SET opted_out = 1, do_not_contact = 1, status = 'hidden', opt_out_at = ?, opt_out_method = ? WHERE id = ?`,
      [now, method, p.id]
    );
  }
  // The actual "block" half of removeAndBlock — without this, opting out only hides today's
  // rows; a future engine run (Step 3) would happily re-collect the same phone/domain tomorrow.
  if (phone) await addToBlocklist('phone', phone, `Opted out via ${method}`);
  if (domain) await addToBlocklist('domain', domain, `Opted out via ${method}`);
  return properties.length;
}
