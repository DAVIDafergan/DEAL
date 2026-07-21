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
    extraction_confidence: parseJsonField(row.extraction_confidence),
  };
}

function parseUnit(row) {
  if (!row) return row;
  return {
    ...row,
    unit_amenities: parseJsonField(row.unit_amenities),
    images: parseJsonField(row.images),
  };
}

// Every property has >=1 property_units row (7.3 backfill migration + createProperty both
// guarantee this), so search/display always read price and capacity from active units rather
// than the legacy property-level columns — "מחיר התצוגה = היחידה הזולה", "קיבולת = סכום היחידות".
const UNITS_AGG_JOIN = `
  LEFT JOIN (
    SELECT property_id,
      MIN(base_price_night) AS price_from,
      SUM(max_guests) AS total_guest_capacity,
      MAX(bedrooms) AS max_bedrooms,
      COUNT(*) AS unit_count
    FROM property_units WHERE is_active = 1
    GROUP BY property_id
  ) units_agg ON units_agg.property_id = properties.id
`;

const UNIT_FIELDS = [
  'name', 'description', 'max_guests', 'bedrooms', 'beds', 'bathrooms',
  'base_price_night', 'weekend_price', 'holiday_price', 'min_nights',
  'unit_amenities', 'images',
];

export async function listUnitsForProperty(propertyId, { activeOnly = false } = {}) {
  const pool = getPool();
  const where = ['property_id = ?'];
  const vals = [propertyId];
  if (activeOnly) where.push('is_active = 1');
  const [rows] = await pool.query(
    `SELECT * FROM property_units WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, id ASC`,
    vals
  );
  return rows.map(parseUnit);
}

/** Ownership-scoped lookup, used by every owner-facing unit mutation below. */
async function getUnitOwnedBy(unitId, ownerId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT pu.* FROM property_units pu JOIN properties p ON p.id = pu.property_id
     WHERE pu.id = ? AND p.owner_id = ? LIMIT 1`,
    [unitId, ownerId]
  );
  return rows[0] ? parseUnit(rows[0]) : null;
}

export async function createUnit(propertyId, ownerId, fields) {
  const pool = getPool();
  const property = await getPropertyByIdForOwner(propertyId, ownerId);
  if (!property) return null;
  const ts = nowStr();
  const [[{ nextSort }]] = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS nextSort FROM property_units WHERE property_id = ?',
    [propertyId]
  );
  const [result] = await pool.query(
    `INSERT INTO property_units
       (property_id, name, description, max_guests, bedrooms, beds, bathrooms,
        base_price_night, weekend_price, holiday_price, min_nights, unit_amenities, images,
        sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      propertyId,
      fields.name || property.name,
      fields.description || null,
      fields.max_guests ?? null,
      fields.bedrooms ?? null,
      fields.beds ?? null,
      fields.bathrooms ?? null,
      fields.base_price_night ?? null,
      fields.weekend_price ?? null,
      fields.holiday_price ?? null,
      fields.min_nights ?? 1,
      fields.unit_amenities ? JSON.stringify(fields.unit_amenities) : null,
      fields.images ? JSON.stringify(fields.images) : null,
      nextSort,
      ts, ts,
    ]
  );
  return getUnitOwnedBy(result.insertId, ownerId);
}

/** Duplicates a unit in place (7.4: "הוספה/עריכה/מחיקה/שכפול") — copies every field except
 * identity/ordering, appends "(עותק)" to the name, and places the copy right after the source. */
export async function duplicateUnit(unitId, ownerId) {
  const pool = getPool();
  const source = await getUnitOwnedBy(unitId, ownerId);
  if (!source) return null;
  return createUnit(source.property_id, ownerId, {
    ...source,
    name: `${source.name} (עותק)`,
  });
}

export async function updateUnit(unitId, ownerId, fields) {
  const pool = getPool();
  const owned = await getUnitOwnedBy(unitId, ownerId);
  if (!owned) return null;
  const sets = [];
  const vals = [];
  for (const key of UNIT_FIELDS) {
    if (!Object.hasOwn(fields, key)) continue;
    let value = fields[key];
    if ((key === 'unit_amenities' || key === 'images') && value != null) value = JSON.stringify(value);
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  if (Object.hasOwn(fields, 'is_active')) {
    sets.push('is_active = ?');
    vals.push(fields.is_active ? 1 : 0);
  }
  if (sets.length === 0) return owned;
  sets.push('updated_at = ?');
  vals.push(nowStr(), unitId);
  await pool.query(`UPDATE property_units SET ${sets.join(', ')} WHERE id = ?`, vals);
  return getUnitOwnedBy(unitId, ownerId);
}

/** Soft — flips is_active=0 rather than deleting the row, so booking history tied to the unit
 * (booking_requests.unit_id, availability.unit_id) is never orphaned. Hidden from search/display
 * the same way a hidden property is. */
export async function deactivateUnit(unitId, ownerId) {
  const owned = await getUnitOwnedBy(unitId, ownerId);
  if (!owned) return false;
  const pool = getPool();
  await pool.query('UPDATE property_units SET is_active = 0, updated_at = ? WHERE id = ?', [nowStr(), unitId]);
  return true;
}

export async function reorderUnits(propertyId, ownerId, orderedIds) {
  const property = await getPropertyByIdForOwner(propertyId, ownerId);
  if (!property) return false;
  const pool = getPool();
  const ts = nowStr();
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      'UPDATE property_units SET sort_order = ?, updated_at = ? WHERE id = ? AND property_id = ?',
      [i, ts, orderedIds[i], propertyId]
    );
  }
  return true;
}

/** Engine-only write path (Step 3 Loader) — bypasses OWNER_EDITABLE_FIELDS since the engine
 * writes fields (source, confidence, collected_at, source_url, source_image_urls) that an
 * owner is never allowed to touch directly. Used only by server/engine/loader/loader.js. */
export async function upsertAutoCollectedProperty(fields) {
  const pool = getPool();
  const ts = nowStr();
  const [result] = await pool.query(
    `INSERT INTO properties (
       name, description, property_type, region, city, address, latitude, longitude,
       guest_capacity, bedrooms, beds, bathrooms,
       ${AMENITY_FIELDS.join(', ')},
       kosher_level, phone, whatsapp, email, website,
       source_image_urls, extraction_confidence,
       status, source, confidence, collected_at, source_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
       ${AMENITY_FIELDS.map(() => '?').join(', ')},
       ?, ?, ?, ?, ?, ?, ?, 'unclaimed', 'auto', ?, ?, ?, ?, ?)`,
    [
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
      normalizePhone(fields.phone) || fields.phone || null,
      normalizePhone(fields.whatsapp) || fields.whatsapp || null,
      fields.email || null,
      fields.website || null,
      fields.source_image_urls ? JSON.stringify(fields.source_image_urls) : null,
      fields.extraction_confidence ? JSON.stringify(fields.extraction_confidence) : null,
      fields.confidence ?? null,
      ts,
      fields.source_url || null,
      ts, ts,
    ]
  );
  const propertyId = result.insertId;
  // Same "every property needs >=1 unit" rule as the manual owner-creation path (7.3) — the
  // engine rarely extracts a reliable nightly price, so this unit's price fields typically stay
  // null (the property just shows "מחיר לפי פנייה" until an owner claims and fills it in).
  await pool.query(
    `INSERT INTO property_units (property_id, name, max_guests, bedrooms, beds, bathrooms, sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
    [propertyId, fields.name, fields.guest_capacity ?? null, fields.bedrooms ?? null, fields.beds ?? null, fields.bathrooms ?? null, ts, ts]
  );
  return propertyId;
}

export async function updateAutoCollectedProperty(id, fields) {
  const pool = getPool();
  const settable = [
    'name', 'description', 'property_type', 'region', 'city', 'address', 'latitude', 'longitude',
    'guest_capacity', 'bedrooms', 'beds', 'bathrooms', ...AMENITY_FIELDS,
    'kosher_level', 'phone', 'whatsapp', 'email', 'website', 'confidence',
  ];
  const sets = [];
  const vals = [];
  for (const key of settable) {
    if (!Object.hasOwn(fields, key)) continue;
    let value = fields[key];
    if ((key === 'phone' || key === 'whatsapp') && value) value = normalizePhone(value) || value;
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  if (Object.hasOwn(fields, 'source_image_urls')) {
    sets.push('source_image_urls = ?');
    vals.push(fields.source_image_urls ? JSON.stringify(fields.source_image_urls) : null);
  }
  if (Object.hasOwn(fields, 'extraction_confidence')) {
    sets.push('extraction_confidence = ?');
    vals.push(fields.extraction_confidence ? JSON.stringify(fields.extraction_confidence) : null);
  }
  if (sets.length > 0) {
    sets.push('collected_at = ?', 'updated_at = ?');
    vals.push(nowStr(), nowStr(), id);
    await pool.query(`UPDATE properties SET ${sets.join(', ')} WHERE id = ? AND source = 'auto'`, [...vals]);
  }

  // Same single-unit mirroring as the owner-facing updateProperty (7.3) — a re-crawl that finds
  // a new bedroom/guest count should update what search actually filters on.
  const UNIT_MIRROR = { guest_capacity: 'max_guests', bedrooms: 'bedrooms', beds: 'beds', bathrooms: 'bathrooms' };
  const mirrored = Object.keys(UNIT_MIRROR).filter((k) => Object.hasOwn(fields, k));
  if (mirrored.length > 0) {
    const units = await listUnitsForProperty(id);
    if (units.length === 1) {
      const unitSets = mirrored.map((k) => `${UNIT_MIRROR[k]} = ?`);
      const unitVals = mirrored.map((k) => fields[k]);
      await pool.query(
        `UPDATE property_units SET ${unitSets.join(', ')}, updated_at = ? WHERE id = ?`,
        [...unitVals, nowStr(), units[0].id]
      );
    }
  }
}

/** Finds an existing auto-collected property by normalized phone or matching source domain —
 * used by the Deduplicator to decide "update existing" vs. "create new". */
export async function findAutoPropertyByPhoneOrDomain({ phone, domain }) {
  const pool = getPool();
  if (phone) {
    const [rows] = await pool.query(`SELECT * FROM properties WHERE source = 'auto' AND (phone = ? OR whatsapp = ?) LIMIT 1`, [phone, phone]);
    if (rows[0]) return parseProperty(rows[0]);
  }
  if (domain) {
    const [rows] = await pool.query(`SELECT * FROM properties WHERE source = 'auto' AND source_url LIKE CONCAT('%', ?, '%') LIMIT 1`, [domain]);
    if (rows[0]) return parseProperty(rows[0]);
  }
  return null;
}

/** Admin review queue — auto-collected properties below the publish confidence gate. */
export async function listPropertiesPendingReview() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT * FROM properties WHERE source = 'auto' AND confidence < 60 ORDER BY collected_at DESC`
  );
  return rows.map(parseProperty);
}

export async function approveAutoProperty(id) {
  const pool = getPool();
  // Publish gate is confidence>=60 (see CONFIDENCE_PUBLISHABLE_SQL) — admin approval bumps the
  // score itself rather than adding a parallel "approved" flag the gate would also need to check.
  await pool.query(`UPDATE properties SET confidence = 100, updated_at = ? WHERE id = ? AND source = 'auto'`, [nowStr(), id]);
}

export async function rejectAutoProperty(id) {
  const pool = getPool();
  await pool.query(`UPDATE properties SET status = 'hidden', updated_at = ? WHERE id = ? AND source = 'auto'`, [nowStr(), id]);
}

// Defense-in-depth beyond opted_out (which is set immediately at removal time): a property
// re-collected later for an already-blocklisted phone/whatsapp/source domain must never
// display either. See core/compliance/blocklist.js — this is the read-time half of "בדיקה
// לפני כל הצגה של נכס"; addToBlocklist() + opted_out=1 together are the write-time half.
const NOT_BLOCKLISTED_SQL = `
  NOT EXISTS (SELECT 1 FROM blocklist b WHERE b.type = 'phone' AND (b.value = properties.phone OR b.value = properties.whatsapp))
  AND NOT EXISTS (SELECT 1 FROM blocklist b WHERE b.type = 'domain' AND properties.source_url IS NOT NULL AND properties.source_url LIKE CONCAT('%', b.value, '%'))
`;

// Step 3 spec: "כל נכס שנאסף אוטומטית ומגיע לציון confidence נמוך מ-60 נכנס לתור אישור ידני ולא
// מתפרסם" — gated here rather than via a separate status value, so it doesn't collide with
// 'pending' (which already means "ownership claim awaiting admin review", a different thing).
// Manually-created properties have confidence=NULL and are never affected by this gate.
const CONFIDENCE_PUBLISHABLE_SQL = `(confidence IS NULL OR confidence >= 60)`;

/** GET /api/properties — public search. Never returns hidden, opted-out, blocklisted, or low-confidence-unreviewed rows. */
export async function searchProperties(filters = {}) {
  const pool = getPool();
  const where = [`status NOT IN ('hidden','draft')`, 'opted_out = 0', 'deleted_at IS NULL', NOT_BLOCKLISTED_SQL, CONFIDENCE_PUBLISHABLE_SQL];
  const vals = [];

  if (filters.region) { where.push('region = ?'); vals.push(filters.region); }
  if (filters.city) { where.push('city = ?'); vals.push(filters.city); }
  if (filters.propertyType) { where.push('property_type = ?'); vals.push(filters.propertyType); }
  if (filters.minGuests) { where.push('units_agg.total_guest_capacity >= ?'); vals.push(Number(filters.minGuests)); }
  if (filters.bedrooms) { where.push('units_agg.max_bedrooms >= ?'); vals.push(Number(filters.bedrooms)); }
  if (filters.minPrice) { where.push('units_agg.price_from >= ?'); vals.push(Number(filters.minPrice)); }
  if (filters.maxPrice) { where.push('units_agg.price_from <= ?'); vals.push(Number(filters.maxPrice)); }
  if (filters.kosherLevel) { where.push('kosher_level = ?'); vals.push(filters.kosherLevel); }
  for (const amenity of filters.amenities || []) {
    if (AMENITY_FIELDS.includes(amenity)) where.push(`${amenity} = 1`);
  }
  // No availability row for a date = available by default (see availability table); only an
  // explicit is_available=0 row excludes a unit for that date. A property still counts as
  // available if at least one active unit is free for the whole range (7.3: search no longer
  // knows about "the" property's availability, only its units').
  if (filters.checkIn && filters.checkOut) {
    where.push(`EXISTS (
      SELECT 1 FROM property_units pu2 WHERE pu2.property_id = properties.id AND pu2.is_active = 1
      AND NOT EXISTS (
        SELECT 1 FROM availability av WHERE av.unit_id = pu2.id AND av.date >= ? AND av.date < ? AND av.is_available = 0
      )
    )`);
    vals.push(filters.checkIn, filters.checkOut);
  }

  const limit = Math.min(Number(filters.limit) || 40, 100);
  const [rows] = await pool.query(
    `SELECT properties.*, units_agg.price_from, units_agg.total_guest_capacity, units_agg.max_bedrooms, units_agg.unit_count
     FROM properties ${UNITS_AGG_JOIN} WHERE ${where.join(' AND ')} ORDER BY properties.updated_at DESC LIMIT ?`,
    [...vals, limit]
  );
  return rows.map(parseProperty);
}

/** GET /api/properties/cities?region= — distinct cities with a listed property in that region,
 * for the staged filter's "where" step (7.2: "רק ערים שיש בהן נכסים בפועל"). Same visibility
 * guard as searchProperties so the count a traveler sees matches what they'll actually get. */
export async function listCitiesForRegion(region) {
  const pool = getPool();
  const where = [`status NOT IN ('hidden','draft')`, 'opted_out = 0', NOT_BLOCKLISTED_SQL, CONFIDENCE_PUBLISHABLE_SQL, 'region = ?', 'city IS NOT NULL', "city != ''"];
  const [rows] = await pool.query(
    `SELECT city, COUNT(*) AS count FROM properties WHERE ${where.join(' AND ')} GROUP BY city ORDER BY count DESC`,
    [region]
  );
  return rows;
}

/** Attaches the property's units (public callers get only active ones — a deactivated unit is
 * exactly as invisible to a traveler as a hidden property). */
async function withUnits(property, { activeOnly }) {
  if (!property) return property;
  property.units = await listUnitsForProperty(property.id, { activeOnly });
  return property;
}

/** Public single-property lookup — 404-equivalent (null) for hidden/opted-out/blocklisted/low-confidence-unreviewed/deleted rows. */
export async function getPropertyById(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT properties.*, units_agg.price_from, units_agg.total_guest_capacity, units_agg.max_bedrooms, units_agg.unit_count
     FROM properties ${UNITS_AGG_JOIN}
     WHERE properties.id = ? AND status NOT IN ('hidden','draft') AND opted_out = 0 AND deleted_at IS NULL
       AND ${NOT_BLOCKLISTED_SQL} AND ${CONFIDENCE_PUBLISHABLE_SQL} LIMIT 1`,
    [id]
  );
  return rows[0] ? withUnits(parseProperty(rows[0]), { activeOnly: true }) : null;
}

/** Owner-scoped lookup — bypasses the hidden/opted-out/deleted filter so an owner can see their
 * own listing (including from the recycle bin) regardless of status. */
export async function getPropertyByIdForOwner(id, ownerId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT properties.*, units_agg.price_from, units_agg.total_guest_capacity, units_agg.max_bedrooms, units_agg.unit_count
     FROM properties ${UNITS_AGG_JOIN} WHERE properties.id = ? AND owner_id = ? LIMIT 1`,
    [id, ownerId]
  );
  return rows[0] ? withUnits(parseProperty(rows[0]), { activeOnly: false }) : null;
}

export async function listPropertiesByOwner(ownerId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT properties.*, units_agg.price_from, units_agg.total_guest_capacity, units_agg.max_bedrooms, units_agg.unit_count
     FROM properties ${UNITS_AGG_JOIN} WHERE owner_id = ? AND deleted_at IS NULL ORDER BY properties.updated_at DESC`,
    [ownerId]
  );
  return rows.map(parseProperty);
}

/** Public owner-profile listing — only claimed/active, never hidden/opted-out (mirrors searchProperties' guard). */
export async function listPublicPropertiesByOwner(ownerId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT properties.*, units_agg.price_from, units_agg.total_guest_capacity, units_agg.max_bedrooms, units_agg.unit_count
     FROM properties ${UNITS_AGG_JOIN}
     WHERE owner_id = ? AND status IN ('claimed', 'active') AND opted_out = 0 AND deleted_at IS NULL
     ORDER BY properties.updated_at DESC`,
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
       ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'manual', ?, ?)`,
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
  const propertyId = result.insertId;
  // Every property needs >=1 unit to have a price/capacity at all (7.3). The simple owner form
  // (name/type/region/price/capacity, no explicit units) still works exactly as before — it just
  // creates one unit behind the scenes instead of writing price/capacity onto properties directly.
  await pool.query(
    `INSERT INTO property_units
       (property_id, name, max_guests, bedrooms, beds, bathrooms,
        base_price_night, weekend_price, holiday_price, min_nights, images,
        sort_order, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
    [
      propertyId, fields.name,
      fields.guest_capacity ?? null, fields.bedrooms ?? null, fields.beds ?? null, fields.bathrooms ?? null,
      fields.base_price_night ?? null, fields.weekend_price ?? null, fields.holiday_price ?? null, fields.min_nights ?? 1,
      fields.owner_images ? JSON.stringify(fields.owner_images) : null,
      ts, ts,
    ]
  );
  return propertyId;
}

export async function updateProperty(id, ownerId, fields) {
  const pool = getPool();
  const sets = [];
  const vals = [];
  for (const key of OWNER_EDITABLE_FIELDS) {
    if (!Object.hasOwn(fields, key)) continue;
    // 'active' only comes from the dedicated publishProperty() below (it validates the publish
    // checklist first) — a plain PATCH can move a listing back to 'draft' but never publish it.
    if (key === 'status' && fields.status !== 'draft') continue;
    let value = fields[key];
    if (key === 'owner_images' && value) value = JSON.stringify(value);
    if ((key === 'phone' || key === 'whatsapp') && value) value = normalizePhone(value) || value;
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  if (sets.length > 0) {
    sets.push('updated_at = ?');
    vals.push(nowStr(), id, ownerId);
    await pool.query(`UPDATE properties SET ${sets.join(', ')} WHERE id = ? AND owner_id = ?`, vals);
  }

  // Mirror onto the default unit — only while the property is still single-unit. Once an owner
  // has split it into multiple units (7.4), price/capacity moves entirely to per-unit editing and
  // these top-level fields on `properties` are no longer read for display at all.
  const UNIT_MIRROR = {
    guest_capacity: 'max_guests', bedrooms: 'bedrooms', beds: 'beds', bathrooms: 'bathrooms',
    base_price_night: 'base_price_night', weekend_price: 'weekend_price', holiday_price: 'holiday_price',
    min_nights: 'min_nights', owner_images: 'images',
  };
  const mirrored = Object.keys(UNIT_MIRROR).filter((k) => Object.hasOwn(fields, k));
  if (mirrored.length > 0) {
    const units = await listUnitsForProperty(id);
    if (units.length === 1) {
      const unitFields = {};
      for (const key of mirrored) unitFields[UNIT_MIRROR[key]] = fields[key];
      await updateUnit(units[0].id, ownerId, unitFields);
    }
  }
}

/** 7.4 publish gate: "לפחות 3 תמונות למתחם, ותמונה אחת לכל יחידה", "אזור, עיר, שם, סוג נכס,
 * ולפחות יחידה אחת עם מחיר וקיבולת", "טלפון או וואטסאפ". Returns { ok, missing[] } — missing is
 * a list of translation-ready keys so both the wizard and the dashboard checklist can render the
 * same reasons without duplicating the rule set. */
export function getPublishChecklist(property) {
  const units = property.units || [];
  const activeUnits = units.filter((u) => u.is_active);
  const missing = [];
  if (!property.region) missing.push('region');
  if (!property.city) missing.push('city');
  if (!property.name) missing.push('name');
  if (!property.property_type) missing.push('property_type');
  if (activeUnits.length === 0) missing.push('unit');
  else if (!activeUnits.every((u) => u.base_price_night && u.max_guests)) missing.push('unit_price_capacity');
  if ((property.owner_images?.length || 0) < 3) missing.push('complex_photos');
  if (activeUnits.length > 0 && !activeUnits.every((u) => (u.images?.length || 0) >= 1)) missing.push('unit_photos');
  if (!property.phone && !property.whatsapp) missing.push('contact');
  return { ok: missing.length === 0, missing };
}

/** Flips a draft to 'active' — only if the checklist passes. Returns the checklist either way so
 * the caller can show exactly what's still missing on failure. */
export async function publishProperty(id, ownerId) {
  const property = await getPropertyByIdForOwner(id, ownerId);
  if (!property) return { ok: false, missing: ['not_found'] };
  const checklist = getPublishChecklist(property);
  if (!checklist.ok) return checklist;
  const pool = getPool();
  await pool.query(
    `UPDATE properties SET status = 'active', updated_at = ? WHERE id = ? AND owner_id = ? AND status = 'draft'`,
    [nowStr(), id, ownerId]
  );
  return checklist;
}

// Availability/booking still take a propertyId at the API surface (unchanged route shape) and
// resolve internally to a specific unit — defaulting to the first one. Correct as long as the
// owner-facing calendar/booking UI stays single-unit-at-a-time (true today); a genuine per-unit
// calendar picker for multi-unit complexes is out of 7.3's scope (not requested by the spec) and
// deferred — see DECISIONS.md.
async function resolveUnitId(propertyId, explicitUnitId) {
  const units = await listUnitsForProperty(propertyId, { activeOnly: true });
  // A client-supplied unit_id must actually belong to this property — otherwise a booking/
  // availability write for property A could silently attach to a unit under property B.
  if (explicitUnitId) return units.some((u) => String(u.id) === String(explicitUnitId)) ? explicitUnitId : null;
  return units[0]?.id || null;
}

export async function getAvailability(propertyId, { from, to, unitId } = {}) {
  const pool = getPool();
  const resolvedUnitId = await resolveUnitId(propertyId, unitId);
  if (!resolvedUnitId) return [];
  const where = ['unit_id = ?'];
  const vals = [resolvedUnitId];
  if (from) { where.push('date >= ?'); vals.push(from); }
  if (to) { where.push('date <= ?'); vals.push(to); }
  const [rows] = await pool.query(
    `SELECT date, is_available FROM availability WHERE ${where.join(' AND ')} ORDER BY date ASC`,
    vals
  );
  return rows;
}

/** dates: [{ date: 'YYYY-MM-DD', is_available: boolean }]. Returns false if the property isn't owned by ownerId. */
export async function setAvailability(propertyId, ownerId, dates, unitId) {
  const pool = getPool();
  const owned = await getPropertyByIdForOwner(propertyId, ownerId);
  if (!owned) return false;
  const resolvedUnitId = await resolveUnitId(propertyId, unitId);
  if (!resolvedUnitId) return false;
  const ts = nowStr();
  for (const { date, is_available } of dates) {
    await pool.query(
      `INSERT INTO availability (property_id, unit_id, date, is_available, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE is_available = VALUES(is_available), updated_at = VALUES(updated_at)`,
      [propertyId, resolvedUnitId, date, is_available ? 1 : 0, ts, ts]
    );
  }
  return true;
}

/** Returns null if fields.unit_id was supplied but doesn't belong to this property. */
export async function createBookingRequest(propertyId, fields) {
  const pool = getPool();
  const ts = nowStr();
  const unitId = await resolveUnitId(propertyId, fields.unit_id);
  if (!unitId) return null;
  const [result] = await pool.query(
    `INSERT INTO booking_requests
      (property_id, unit_id, check_in, check_out, guest_count, customer_name, customer_phone, customer_email,
       message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      propertyId,
      unitId,
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

// ── Admin dashboard stats (Step 4) ────────────────────────────────────────────

export async function getPropertyStats() {
  const pool = getPool();
  const [[totals]] = await pool.query(`SELECT COUNT(*) AS total FROM properties`);
  const [byRegion] = await pool.query(`SELECT region, COUNT(*) AS count FROM properties GROUP BY region ORDER BY count DESC`);
  const [byStatus] = await pool.query(`SELECT status, COUNT(*) AS count FROM properties GROUP BY status ORDER BY count DESC`);
  const [bySource] = await pool.query(`SELECT source, COUNT(*) AS count FROM properties GROUP BY source`);
  const [[autoStats]] = await pool.query(
    `SELECT COUNT(*) AS total_auto,
            SUM(CASE WHEN confidence >= 60 THEN 1 ELSE 0 END) AS published,
            SUM(CASE WHEN confidence < 60 THEN 1 ELSE 0 END) AS pending_review,
            AVG(confidence) AS avg_confidence
     FROM properties WHERE source = 'auto'`
  );
  return {
    total: totals.total,
    byRegion,
    byStatus,
    bySource,
    autoCollection: {
      totalAuto: autoStats.total_auto || 0,
      published: autoStats.published || 0,
      pendingReview: autoStats.pending_review || 0,
      avgConfidence: autoStats.avg_confidence ? Math.round(autoStats.avg_confidence) : 0,
      successRate: autoStats.total_auto > 0 ? Math.round((autoStats.published / autoStats.total_auto) * 100) : 0,
    },
  };
}
