import mysql from 'mysql2/promise';

/**
 * חיבור MySQL משותף לכל האפליקציה. תומך גם בחיבור מלא (MYSQL_URL/DATABASE_URL) וגם
 * במשתנים נפרדים (MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE/MYSQLPORT) — בדיוק
 * הפורמטים ש-Railway חושף אוטומטית לשירות MySQL מחובר.
 *
 * Shared MySQL connection for the whole app. Supports both a full connection string
 * (MYSQL_URL/DATABASE_URL) and discrete vars (MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/
 * MYSQLDATABASE/MYSQLPORT) — exactly what Railway exposes for a linked MySQL service.
 */

let pool = null;
let ready = false;
let readyPromise = null;

function buildPoolOptions(env = process.env) {
  const connectionString = env.MYSQL_URL || env.DATABASE_URL;

  const baseOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // מטפל ב-DATETIME/DATE כ-UTC טהור משני הצדדים, כדי שלא יהיה זליגת timezone מקומי
    // Treat DATETIME/DATE as pure UTC both ways — avoids local-timezone drift bugs.
    timezone: 'Z',
    // מחזיר DECIMAL כ-Number של JS ולא כמחרוזת, כדי שחישובי מחיר יעבדו בלי המרה ידנית
    decimalNumbers: true,
  };

  if (connectionString) {
    return { uri: connectionString, ...baseOptions };
  }

  return {
    host: env.MYSQLHOST || env.MYSQL_HOST || 'localhost',
    port: Number(env.MYSQLPORT || env.MYSQL_PORT || 3306),
    user: env.MYSQLUSER || env.MYSQL_USER || 'root',
    password: env.MYSQLPASSWORD || env.MYSQL_PASSWORD || '',
    database: env.MYSQLDATABASE || env.MYSQL_DATABASE || 'railway',
    ...baseOptions,
  };
}

/** יוצר (אם עוד לא קיים) ומחזיר את ה-pool של החיבורים. לא מתחבר בפועל עד לשאילתה הראשונה. */
export function getPool(env = process.env) {
  if (!pool) {
    pool = mysql.createPool(buildPoolOptions(env));
  }
  return pool;
}

export function isDbReady() {
  return ready;
}

/**
 * הוספת עמודה לטבלה קיימת בצורה בטוחה — בודקים אם העמודה כבר קיימת לפני ALTER, כדי שזה יעבוד
 * גם על טבלת deals שכבר פרוסה ב-Railway (CREATE TABLE IF NOT EXISTS לא מוסיף עמודות לטבלה
 * שכבר קיימת, אז צריך migration נפרד לכל עמודה חדשה שמתווספת בהמשך).
 *
 * Safely adds a column to an existing table — checks existence first so this also works
 * against an already-deployed `deals` table (CREATE TABLE IF NOT EXISTS won't add columns
 * to a table that already exists; new columns need an explicit migration like this one).
 */
async function ensureColumn(connection, table, column, definition) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (rows[0].count === 0) {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[deal-radar-pro] Migrated: added column ${table}.${column}`);
  }
}

/** Idempotent ADD INDEX — same pattern as ensureColumn. `columns` is the raw column list
 * (e.g. "city" or "deleted_at, status") as it should appear inside the INDEX(...) clause. */
async function ensureIndex(connection, table, indexName, columns) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName]
  );
  if (rows[0].count === 0) {
    await connection.query(`ALTER TABLE ${table} ADD INDEX ${indexName} (${columns})`);
    console.log(`[deal-radar-pro] Migrated: added index ${table}.${indexName} (${columns})`);
  }
}

/**
 * מעביר טבלה קיימת לשם `_legacy` בלי לאבד נתונים — משמש לסגירת עולם הטיסות (deals/packages/
 * vibe_feed_cards/price_history) בלי למחוק היסטוריה. בטוח להריץ פעמים רבות: אם `oldName` כבר
 * לא קיים (כבר הועבר בעבר, או שמעולם לא היה — התקנה חדשה), פשוט לא עושה כלום. מטפל גם במקרה
 * שבו SCHEMA_STATEMENTS כבר יצר `newName` ריק ברגע זה בעלייה (כי ה-CREATE TABLE IF NOT EXISTS
 * החדש מגדיר את השם החדש ישירות, ורץ *לפני* המיגרציות) — מוחק את המעטפת הריקה ואז מבצע rename
 * אמיתי של הטבלה הישנה (עם הנתונים) למקומה.
 *
 * Renames an existing table to a `_legacy` name without losing data — used to retire the
 * flight world (deals/packages/vibe_feed_cards/price_history) without deleting history. Safe
 * to run repeatedly: no-ops once `oldName` no longer exists (already migrated, or a fresh
 * install that never had it). Also handles the case where SCHEMA_STATEMENTS already created an
 * empty `newName` shell earlier in this same boot (since schema statements run *before*
 * migrations, and the schema now defines the new name directly) — drops that empty shell first,
 * then does a real rename of the old, data-bearing table into place.
 */
async function ensureTableRenamed(connection, oldName, newName) {
  const [[oldTable]] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
    [oldName]
  );
  if (oldTable.count === 0) return;

  const [[newTable]] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?`,
    [newName]
  );
  if (newTable.count > 0) {
    const [[rowCount]] = await connection.query(`SELECT COUNT(*) AS count FROM \`${newName}\``);
    if (rowCount.count > 0) {
      console.error(
        `[deal-radar-pro] Cannot rename ${oldName} -> ${newName}: both tables exist and ${newName} ` +
          'already has rows. Skipping — resolve manually.'
      );
      return;
    }
    await connection.query(`DROP TABLE \`${newName}\``);
  }

  await connection.query(`RENAME TABLE \`${oldName}\` TO \`${newName}\``);
  console.log(`[deal-radar-pro] Migrated: renamed table ${oldName} -> ${newName}`);
}

/** Drops `oldKeyName` and adds a unique key `newKeyName(newColumns)` if the old one is still
 * present — used to move availability's uniqueness from (property_id, date) to (unit_id, date)
 * on a table that was already deployed before property_units existed. No-ops once already run. */
async function ensureUniqueKeyReplaced(connection, table, oldKeyName, newKeyName, newColumns) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, oldKeyName]
  );
  if (rows[0].count === 0) return;
  await connection.query(`ALTER TABLE ${table} DROP INDEX ${oldKeyName}`);
  await connection.query(`ALTER TABLE ${table} ADD UNIQUE KEY ${newKeyName} (${newColumns})`);
  console.log(`[deal-radar-pro] Migrated: ${table} unique key ${oldKeyName} -> ${newKeyName}(${newColumns})`);
}

/** Step 7.3 backfill — every property needs exactly one property_units row to stay a valid
 * "complex" under the new model. Only touches properties with zero units, so it's a no-op once
 * every property has been backfilled (and never re-runs against a property an owner has since
 * split into multiple units). */
async function backfillDefaultPropertyUnits(connection) {
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const [properties] = await connection.query(
    `SELECT p.* FROM properties p
     WHERE NOT EXISTS (SELECT 1 FROM property_units pu WHERE pu.property_id = p.id)`
  );
  for (const p of properties) {
    await connection.query(
      `INSERT INTO property_units
         (property_id, name, max_guests, bedrooms, beds, bathrooms,
          base_price_night, weekend_price, holiday_price, min_nights, images,
          sort_order, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?)`,
      [
        p.id, p.name, p.guest_capacity, p.bedrooms, p.beds, p.bathrooms,
        p.base_price_night, p.weekend_price, p.holiday_price, p.min_nights || 1,
        p.owner_images ? JSON.stringify(typeof p.owner_images === 'string' ? JSON.parse(p.owner_images) : p.owner_images) : null,
        now, now,
      ]
    );
  }
  if (properties.length > 0) {
    console.log(`[deal-radar-pro] Migrated: backfilled ${properties.length} default property_units row(s)`);
  }
  // Link any pre-existing availability/booking rows to the unit that was just backfilled for
  // their property — safe only while every property still has exactly one unit (see docstring).
  await connection.query(
    `UPDATE availability av JOIN property_units pu ON pu.property_id = av.property_id
     SET av.unit_id = pu.id WHERE av.unit_id IS NULL`
  );
  await connection.query(
    `UPDATE booking_requests br JOIN property_units pu ON pu.property_id = br.property_id
     SET br.unit_id = pu.id WHERE br.unit_id IS NULL`
  );
}

const MIGRATIONS = [
  (connection) => ensureColumn(connection, 'deals_legacy', 'departure_at', 'DATETIME NULL'),
  (connection) => ensureColumn(connection, 'deals_legacy', 'arrival_at', 'DATETIME NULL'),
  (connection) => ensureColumn(connection, 'deals_legacy', 'duration_minutes', 'INT NULL'),
  (connection) => ensureColumn(connection, 'deals_legacy', 'return_date', 'DATE NULL'),
  (connection) => ensureColumn(connection, 'deals_legacy', 'return_departure_at', 'DATETIME NULL'),
  (connection) => ensureColumn(connection, 'deals_legacy', 'return_stops', 'INT NULL'),
  (connection) => ensureColumn(connection, 'vibe_feed_cards_legacy', 'photo_url', 'TEXT NULL'),
  (connection) => ensureColumn(connection, 'vibe_feed_cards_legacy', 'video_poster_url', 'TEXT NULL'),
  (connection) => ensureColumn(connection, 'destination_images', 'source', "VARCHAR(16) NULL"),
  (connection) => ensureColumn(connection, 'vibe_feed_cards_legacy', 'hotel_breakfast_included', 'TINYINT(1) NULL'),
  (connection) => ensureColumn(connection, 'vibe_feed_cards_legacy', 'has_car_rental_option', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // agent_deals extended fields: airline, luggage, hotel, car
  (connection) => ensureColumn(connection, 'agent_deals', 'airline', 'VARCHAR(120) NULL'),
  (connection) => ensureColumn(connection, 'agent_deals', 'includes_checked_baggage', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agent_deals', 'includes_cabin_baggage', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agent_deals', 'includes_meal', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agent_deals', 'hotel_name', 'VARCHAR(255) NULL'),
  (connection) => ensureColumn(connection, 'agent_deals', 'hotel_stars', 'TINYINT(1) NULL'),
  (connection) => ensureColumn(connection, 'agent_deals', 'hotel_breakfast', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agent_deals', 'car_type', 'VARCHAR(60) NULL'),
  (connection) => ensureColumn(connection, 'agent_deals', 'car_company', 'VARCHAR(120) NULL'),
  (connection) => ensureColumn(connection, 'agent_deals', 'departure_time', 'VARCHAR(5) NULL'),
  (connection) => ensureColumn(connection, 'agent_deals', 'arrival_time', 'VARCHAR(5) NULL'),
  // hotel meals + link
  (connection) => ensureColumn(connection, 'agent_deals', 'hotel_lunch', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agent_deals', 'hotel_dinner', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agent_deals', 'hotel_link', 'TEXT NULL'),
  // passenger count
  (connection) => ensureColumn(connection, 'agent_deals', 'passenger_count', 'TINYINT(1) NOT NULL DEFAULT 2'),
  // deal purchase tracking
  (connection) => ensureColumn(connection, 'agent_deals', 'purchase_count', 'INT NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agent_deals', 'purchased_at', 'DATETIME NULL'),
  // user auth_provider column + make password_hash nullable for Google users
  (connection) => ensureColumn(connection, 'users', 'auth_provider', "VARCHAR(16) NOT NULL DEFAULT 'local'"),
  async (connection) => {
    const [rows] = await connection.query(
      `SELECT IS_NULLABLE FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'password_hash'`
    );
    if (rows[0] && rows[0].IS_NULLABLE === 'NO') {
      await connection.query('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL');
      console.log('[deal-radar-pro] Migrated: users.password_hash → NULL allowed');
    }
  },
  (connection) => ensureColumn(connection, 'agents', 'has_seen_onboarding', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'agents', 'cover_url', 'TEXT NULL'),
  (connection) => ensureColumn(connection, 'agents', 'about', 'TEXT NULL'),
  // Zimmer/villa platform: distinguishes today's paying flight agents from new property-owner
  // signups within the same `agents` table (see core/db/index.js properties.owner_id comment —
  // agents doubles as the owner table; renaming it is deferred to when routes are cut over).
  // Existing rows default to 'flight_agent'; registration code picks 'property_owner' explicitly
  // for new zimmer-world signups.
  (connection) => ensureColumn(connection, 'agents', "account_type", "ENUM('flight_agent','property_owner') NOT NULL DEFAULT 'flight_agent'"),
  // Retiring the flight world (README: platform now covers zimmer/villa rentals only) — rename
  // the auto-scanned/generated tables to `_legacy` instead of deleting them. dealsStore,
  // packagesStore, vibeFeedStore, and the deals-table lookup inside agentDealStore.computeValueScore
  // are all disconnected in the same change (server/routes/deals.js, packages.js, and the relevant
  // server/index.js background jobs no longer call them), so nothing reads/writes these tables
  // under their old names anymore.
  (connection) => ensureTableRenamed(connection, 'deals', 'deals_legacy'),
  (connection) => ensureTableRenamed(connection, 'packages', 'packages_legacy'),
  (connection) => ensureTableRenamed(connection, 'vibe_feed_cards', 'vibe_feed_cards_legacy'),
  (connection) => ensureTableRenamed(connection, 'price_history', 'price_history_legacy'),
  // Ownership-claim flow (Step 5): a verified claim needs an admin-review state between
  // 'unclaimed' and 'claimed'. CREATE TABLE IF NOT EXISTS won't widen an ENUM on a
  // already-deployed table, so this MODIFY COLUMN runs explicitly, once, guarded by a check.
  async (connection) => {
    const [rows] = await connection.query(
      `SELECT COLUMN_TYPE FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'status'`
    );
    if (rows[0] && !rows[0].COLUMN_TYPE.includes("'pending'")) {
      await connection.query(
        "ALTER TABLE properties MODIFY COLUMN status ENUM('unclaimed','claimed','active','hidden','pending') NOT NULL DEFAULT 'unclaimed'"
      );
      console.log('[deal-radar-pro] Migrated: properties.status enum widened to include \'pending\'');
    }
  },
  // Per-field confidence scores from the Extractor (Step 3) — separate from the single overall
  // `confidence` column (which stays an aggregate used as the publish gate).
  (connection) => ensureColumn(connection, 'properties', 'extraction_confidence', 'JSON NULL'),
  // Step 7.3 — multi-unit properties. unit_id columns first (so the backfill below has
  // somewhere to write), then the backfill itself, then the unique-key migration (which only
  // fires against a table deployed before property_units existed).
  (connection) => ensureColumn(connection, 'availability', 'unit_id', 'INT NULL'),
  (connection) => ensureColumn(connection, 'booking_requests', 'unit_id', 'INT NULL'),
  (connection) => backfillDefaultPropertyUnits(connection),
  (connection) => ensureUniqueKeyReplaced(connection, 'availability', 'uk_availability_property_date', 'uk_availability_unit_date', 'unit_id, date'),
  // Step 7.6 — soft delete for properties (recycle bin, 30-day restore window).
  (connection) => ensureColumn(connection, 'properties', 'deleted_at', 'DATETIME NULL'),
  // Step 7.4 — an owner-created listing starts as 'draft' (incomplete, invisible to search)
  // until it meets the publish checklist (photos, a priced unit, contact info) and the owner
  // explicitly publishes it, at which point it becomes 'active'. Previously createProperty set
  // 'claimed' directly on creation, which collided with 'claimed' meaning "came through the
  // ownership-claim flow" for an auto-collected listing — 'active' was already reserved in the
  // enum for exactly this "owner's own already-published listing" case but nothing set it yet.
  async (connection) => {
    const [rows] = await connection.query(
      `SELECT COLUMN_TYPE FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'status'`
    );
    if (rows[0] && !rows[0].COLUMN_TYPE.includes("'draft'")) {
      await connection.query(
        "ALTER TABLE properties MODIFY COLUMN status ENUM('unclaimed','claimed','active','hidden','pending','draft') NOT NULL DEFAULT 'unclaimed'"
      );
      console.log('[deal-radar-pro] Migrated: properties.status enum widened to include \'draft\'');
    }
  },
  // Step 7.7 — owner profile social links (agents doubles as the owner table, see the account_type
  // migration comment above).
  (connection) => ensureColumn(connection, 'agents', 'website', 'TEXT NULL'),
  (connection) => ensureColumn(connection, 'agents', 'facebook_url', 'TEXT NULL'),
  (connection) => ensureColumn(connection, 'agents', 'instagram_url', 'TEXT NULL'),
  (connection) => ensureColumn(connection, 'agents', 'tiktok_url', 'TEXT NULL'),
  (connection) => ensureColumn(connection, 'agents', 'youtube_url', 'TEXT NULL'),
  // Step 8.6 — explicit admin approval state for auto-collected properties, separate from the
  // LLM's own `confidence` score (previously approveAutoProperty hacked confidence=100 as a
  // stand-in for "approved", which conflated "the model is sure" with "a human signed off").
  // NULL for manually-created properties (source='manual'), where this column means nothing.
  (connection) => ensureColumn(connection, 'properties', "auto_review_status", "ENUM('pending','approved','rejected') NULL"),
  // Step 8.7 periodic refresh — tracks re-fetch attempts so a domain that's stopped resolving/
  // responding can be marked inactive after 3 consecutive failures, per spec.
  (connection) => ensureColumn(connection, 'properties', 'refresh_fail_count', 'TINYINT UNSIGNED NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'last_refresh_attempt_at', 'DATETIME NULL'),
  // Backfill: rows that were already publicly visible under the old 2-tier gate
  // (confidence>=60, no explicit auto_review_status yet) keep working exactly as before instead
  // of vanishing from search the moment this migration runs. Anything still under the old
  // review-queue threshold (<60) just starts 'pending', which is where it already effectively was.
  async (connection) => {
    await connection.query(
      `UPDATE properties SET auto_review_status = 'approved'
       WHERE source = 'auto' AND auto_review_status IS NULL AND confidence >= 60`
    );
    await connection.query(
      `UPDATE properties SET auto_review_status = 'pending'
       WHERE source = 'auto' AND auto_review_status IS NULL`
    );
  },
  // 9.6 — "track a booking request via a unique link, even without registering". A random,
  // unguessable token (not the sequential `id`) is what the public tracking route looks up by —
  // exposing booking status/customer details keyed by a guessable auto-increment id would let
  // anyone enumerate other customers' bookings.
  (connection) => ensureColumn(connection, 'booking_requests', 'tracking_token', 'VARCHAR(48) NULL'),
  async (connection) => {
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS count FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND table_name = 'booking_requests' AND index_name = 'idx_booking_requests_tracking_token'`
    );
    if (rows[0].count === 0) {
      await connection.query('ALTER TABLE booking_requests ADD INDEX idx_booking_requests_tracking_token (tracking_token)');
    }
  },
  // 10.1 — performance pass. Confirmed via EXPLAIN on a filled local DB (not guessed): filtering
  // properties by city did a full table scan (no index existed at all — idx_properties_region
  // covered region but nothing covered city, and city is filtered directly by search, the SEO
  // city landing pages, and the wizard's autocomplete-backed lookups). The properties.status
  // ENUM is low-cardinality and always paired with `deleted_at IS NULL` in every visibility
  // check (search/facets/getPropertyById/getPropertyByIdForOwner/sitemap) — a composite lets
  // MySQL narrow on deleted_at before filtering status row-by-row instead of scanning per query.
  // property_units(property_id, is_active) speeds up the UNITS_AGG_JOIN subquery used by
  // multi-row queries (search/facet-counts/dashboard list) — same rows idx_property_units_property
  // already covered, but is_active no longer needs a row-by-row filter after the index seek.
  (connection) => ensureIndex(connection, 'properties', 'idx_properties_city', 'city'),
  (connection) => ensureIndex(connection, 'properties', 'idx_properties_deleted_status', 'deleted_at, status'),
  (connection) => ensureIndex(connection, 'property_units', 'idx_property_units_property_active', 'property_id, is_active'),
  // 10.7 — detailed Shabbat + accessibility filters (see the AMENITY_FIELDS comment in
  // propertyStore.js for why each one exists as its own field).
  (connection) => ensureColumn(connection, 'properties', 'has_shabbat_plata', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_shabbat_urn', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_shabbat_clock', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_mechanical_key', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'is_near_eruv', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'is_near_synagogue', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_step_free_entrance', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_accessible_bathroom', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_grab_bars', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_accessible_parking', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_wide_doorways', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // 10.7 — "what's nearby": owner-entered free text (one attraction/restaurant per line), kept
  // simple deliberately — a curated per-city database of attractions would be a much bigger
  // project (real data entry, upkeep) that's out of scope here; see DECISIONS.md 10.7.
  (connection) => ensureColumn(connection, 'properties', 'nearby_attractions', 'TEXT NULL'),
  // 10.8 — detailed family filter (a real checklist beyond the single "kid-friendly" checkbox).
  (connection) => ensureColumn(connection, 'properties', 'has_crib', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_high_chair', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_pool_fence', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_kids_toys', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_dishwasher', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_microwave', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // 10.8 — view type: a single-select, not a boolean like has_view (which stays as-is) — "what
  // kind" of view, not just "has one".
  (connection) => ensureColumn(connection, 'properties', "view_type", "ENUM('sea','lake','mountains','desert','green','open') NULL"),
  // 10.8 — report-incorrect-info queue (distinct from review reports — this flags property
  // *data*, not a review).
  (connection) => ensureColumn(connection, 'properties', 'info_report_count', 'INT NOT NULL DEFAULT 0'),
  // 11.2 — property-type filter needed a 5th type ("מתחם"/complex — several standalone units
  // sharing one plot, distinct from a single villa/suite). Same guarded MODIFY COLUMN pattern
  // as the status enum widenings above.
  async (connection) => {
    const [rows] = await connection.query(
      `SELECT COLUMN_TYPE FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'properties' AND column_name = 'property_type'`
    );
    if (rows[0] && !rows[0].COLUMN_TYPE.includes("'complex'")) {
      await connection.query(
        "ALTER TABLE properties MODIFY COLUMN property_type ENUM('zimmer','villa','cottage','suite','complex') NOT NULL"
      );
      console.log('[deal-radar-pro] Migrated: properties.property_type enum widened to include \'complex\'');
    }
  },
  // 11.6 — massively expanded amenities catalog, grouped into categories (see AMENITIES in
  // web/src/data/propertyOptions.js). All additive — nothing existing is dropped or renamed at
  // the DB level, so no data loss for owners who already set the original 26 flags.
  // Pool
  (connection) => ensureColumn(connection, 'properties', 'has_shared_pool', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_indoor_pool', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_kids_pool', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_secluded_pool', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // Jacuzzi & spa — has_sauna (generic) is split into dry/wet; see the backfill migration below
  // that copies true values across instead of discarding them.
  (connection) => ensureColumn(connection, 'properties', 'has_spa', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_dry_sauna', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_wet_sauna', 'TINYINT(1) NOT NULL DEFAULT 0'),
  async (connection) => {
    await connection.query('UPDATE properties SET has_dry_sauna = 1 WHERE has_sauna = 1 AND has_dry_sauna = 0');
  },
  // Entertainment
  (connection) => ensureColumn(connection, 'properties', 'has_snooker_table', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_ping_pong', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_foosball', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_game_console', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_projector', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_home_cinema', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_library', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_board_games', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // Outdoor
  (connection) => ensureColumn(connection, 'properties', 'has_outdoor_seating', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_hammocks', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_lawn', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_balcony', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_pergola', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_fire_pit', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_trampoline', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_swings', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // Kitchen — has_dishwasher/has_microwave already existed (10.8) but were never surfaced in the
  // frontend catalog; this migration set only adds the genuinely new columns.
  (connection) => ensureColumn(connection, 'properties', 'has_coffee_machine', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_toaster_oven', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_stovetop', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_oven', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_large_fridge', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // General
  (connection) => ensureColumn(connection, 'properties', 'has_heating', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_tv', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_washing_machine', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_dryer', 'TINYINT(1) NOT NULL DEFAULT 0'),
  (connection) => ensureColumn(connection, 'properties', 'has_private_entrance', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // Families — has_crib/has_high_chair/has_pool_fence/has_kids_toys already existed (10.8),
  // same "never surfaced in the frontend" situation as the kitchen fields above.
  (connection) => ensureColumn(connection, 'properties', 'has_playground_equipment', 'TINYINT(1) NOT NULL DEFAULT 0'),
  // 11.6 — real bed-type breakdown per unit, replacing the single "beds" count in the UI (the
  // `beds` column itself stays for backward compatibility/reporting, just no longer edited
  // directly). bed_config is a JSON array of {type, qty}; the backfill below seeds it from the
  // existing beds count so units that already had a number don't suddenly show "no beds set" —
  // 'double' is the most common default configuration for a zimmer/villa unit.
  (connection) => ensureColumn(connection, 'property_units', 'bed_config', 'JSON NULL'),
  async (connection) => {
    await connection.query(
      `UPDATE property_units SET bed_config = JSON_ARRAY(JSON_OBJECT('type','double','qty',beds))
       WHERE bed_config IS NULL AND beds IS NOT NULL AND beds > 0`
    );
  },
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS contact_submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    INDEX idx_contact_created_at (created_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS price_history_legacy (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route VARCHAR(16) NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    scanned_at DATETIME NOT NULL,
    INDEX idx_price_history_route_date (route, date),
    INDEX idx_price_history_route_scanned_at (route, scanned_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS deals_legacy (
    id VARCHAR(64) PRIMARY KEY,
    type VARCHAR(16) NOT NULL,
    origin VARCHAR(8) NOT NULL,
    destination VARCHAR(8) NOT NULL,
    departure_date DATE NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    carrier VARCHAR(8) NULL,
    stops INT NULL,
    source VARCHAR(32) NULL,
    booking_url TEXT NULL,
    moving_average DECIMAL(10,2) NULL,
    z_score DECIMAL(6,2) NULL,
    enforcement_likelihood INT NULL,
    narrative_json JSON NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_deals_type_updated_at (type, updated_at),
    INDEX idx_deals_route (origin, destination)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS deals_sent (
    id INT AUTO_INCREMENT PRIMARY KEY,
    savings_percent INT NOT NULL,
    sent_at DATETIME NOT NULL,
    INDEX idx_deals_sent_sent_at (sent_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS packages_legacy (
    id VARCHAR(64) PRIMARY KEY,
    origin VARCHAR(8) NOT NULL,
    destination VARCHAR(8) NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    nights INT NOT NULL,
    people_count INT NOT NULL,
    destination_type VARCHAR(16) NULL,
    questionnaire_hash VARCHAR(64) NULL,
    is_personalized TINYINT(1) NOT NULL DEFAULT 0,
    flight_price DECIMAL(10,2) NULL,
    flight_booking_url TEXT NULL,
    flight_stops INT NULL,
    flight_return_stops INT NULL,
    hotel_name VARCHAR(255) NULL,
    hotel_total_price DECIMAL(10,2) NULL,
    hotel_booking_url TEXT NULL,
    car_rental_url TEXT NULL,
    esim_url TEXT NULL,
    total_price DECIMAL(10,2) NULL,
    price_per_person DECIMAL(10,2) NULL,
    currency VARCHAR(8) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_packages_hash (questionnaire_hash),
    INDEX idx_packages_personalized_updated (is_personalized, updated_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS destination_images (
    iata_code VARCHAR(8) PRIMARY KEY,
    image_url TEXT NULL,
    thumb_url TEXT NULL,
    attribution_name VARCHAR(255) NULL,
    attribution_url TEXT NULL,
    fetched_at DATETIME NOT NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS vibe_feed_cards_legacy (
    id VARCHAR(64) PRIMARY KEY,
    vibe VARCHAR(16) NOT NULL,
    origin VARCHAR(8) NOT NULL,
    destination VARCHAR(8) NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NOT NULL,
    nights INT NOT NULL,
    people_count INT NOT NULL,
    flight_price DECIMAL(10,2) NOT NULL,
    flight_booking_url TEXT NULL,
    flight_stops INT NULL,
    flight_return_stops INT NULL,
    hotel_name VARCHAR(255) NULL,
    hotel_stars INT NULL,
    hotel_total_price DECIMAL(10,2) NULL,
    hotel_booking_url TEXT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    price_per_person DECIMAL(10,2) NOT NULL,
    currency VARCHAR(8) NOT NULL,
    video_url TEXT NULL,
    music_url TEXT NULL,
    is_glitch_drop TINYINT(1) NOT NULL DEFAULT 0,
    narrative_json JSON NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_vibe_feed_vibe_updated (vibe, updated_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_users_email (email)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS agents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(128) NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NULL,
    whatsapp_number VARCHAR(32) NULL,
    whatsapp_template TEXT NULL,
    license_number VARCHAR(128) NULL,
    logo_url TEXT NULL,
    description TEXT NULL,
    response_hours VARCHAR(255) NULL,
    website TEXT NULL,
    facebook_url TEXT NULL,
    instagram_url TEXT NULL,
    tiktok_url TEXT NULL,
    youtube_url TEXT NULL,
    preferred_currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    subscription_tier ENUM('basic','pro','unlimited') NOT NULL DEFAULT 'basic',
    subscription_status ENUM('active','inactive','trial') NOT NULL DEFAULT 'trial',
    subscription_expires_at DATETIME NULL,
    stripe_customer_id VARCHAR(128) NULL,
    stripe_subscription_id VARCHAR(128) NULL,
    lead_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_agents_status (status),
    INDEX idx_agents_slug (slug)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS agent_deals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id INT NOT NULL,
    destination VARCHAR(8) NOT NULL,
    destination_name VARCHAR(255) NULL,
    country VARCHAR(128) NULL,
    video_url TEXT NULL,
    photo_url TEXT NULL,
    departure_date DATE NOT NULL,
    return_date DATE NULL,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'USD',
    purchase_link TEXT NULL,
    whatsapp_override VARCHAR(32) NULL,
    is_exclusive TINYINT(1) NOT NULL DEFAULT 0,
    expires_at DATE NULL,
    description TEXT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    rejection_reason TEXT NULL,
    quality_score DECIMAL(5,2) NULL,
    value_score DECIMAL(5,2) NULL,
    click_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    approved_at DATETIME NULL,
    INDEX idx_agent_deals_agent (agent_id),
    INDEX idx_agent_deals_status (status),
    INDEX idx_agent_deals_destination (destination),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS agent_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    agent_id INT NOT NULL,
    rating TINYINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_session_agent (session_id, agent_id),
    INDEX idx_agent_ratings_agent (agent_id),
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS user_favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(128) NOT NULL,
    deal_id VARCHAR(128) NOT NULL,
    deal_type VARCHAR(16) NOT NULL DEFAULT 'agent',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_favorites_session (session_id),
    INDEX idx_user_favorites_deal (deal_id, deal_type)
  ) ENGINE=InnoDB`,

  // ── Zimmer/villa platform (additive — not yet read by any route/store) ─────────
  // properties.owner_id points at the existing `agents` table: it already has every
  // field the Owner entity needs (business_name, contact_name, email, password_hash,
  // phone, whatsapp_number, status...), and it's still the live, working auth table
  // for today's travel agents. Renaming agents → owners is deferred to the step that
  // also rewires the routes/stores that read `agents` by name, so nothing breaks in
  // between. ON DELETE SET NULL: deleting an owner account reverts their properties
  // to unclaimed rather than destroying booking history tied to them.
  `CREATE TABLE IF NOT EXISTS blocklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('domain','phone') NOT NULL,
    value VARCHAR(255) NOT NULL,
    reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_blocklist_type_value (type, value)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS properties (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    property_type ENUM('zimmer','villa','cottage','suite') NOT NULL,
    region ENUM('north','galilee','golan','carmel','center','jerusalem','south','dead_sea','eilat') NOT NULL,
    city VARCHAR(120) NULL,
    address VARCHAR(255) NULL,
    latitude DECIMAL(9,6) NULL,
    longitude DECIMAL(9,6) NULL,
    guest_capacity TINYINT UNSIGNED NULL,
    bedrooms TINYINT UNSIGNED NULL,
    beds TINYINT UNSIGNED NULL,
    bathrooms TINYINT UNSIGNED NULL,
    has_private_jacuzzi TINYINT(1) NOT NULL DEFAULT 0,
    has_private_pool TINYINT(1) NOT NULL DEFAULT 0,
    has_heated_pool TINYINT(1) NOT NULL DEFAULT 0,
    has_sauna TINYINT(1) NOT NULL DEFAULT 0,
    has_view TINYINT(1) NOT NULL DEFAULT 0,
    has_garden TINYINT(1) NOT NULL DEFAULT 0,
    has_bbq TINYINT(1) NOT NULL DEFAULT 0,
    has_outdoor_jacuzzi TINYINT(1) NOT NULL DEFAULT 0,
    has_parking TINYINT(1) NOT NULL DEFAULT 0,
    has_air_conditioning TINYINT(1) NOT NULL DEFAULT 0,
    has_equipped_kitchen TINYINT(1) NOT NULL DEFAULT 0,
    has_wifi TINYINT(1) NOT NULL DEFAULT 0,
    is_kid_friendly TINYINT(1) NOT NULL DEFAULT 0,
    is_pet_friendly TINYINT(1) NOT NULL DEFAULT 0,
    is_accessible TINYINT(1) NOT NULL DEFAULT 0,
    kosher_level ENUM('kosher','shomer_shabbat','kosher_kitchen','not_applicable') NOT NULL DEFAULT 'not_applicable',
    base_price_night DECIMAL(10,2) NULL,
    weekend_price DECIMAL(10,2) NULL,
    holiday_price DECIMAL(10,2) NULL,
    cleaning_fee DECIMAL(10,2) NULL,
    min_nights TINYINT UNSIGNED NOT NULL DEFAULT 1,
    currency VARCHAR(8) NOT NULL DEFAULT 'ILS',
    owner_images JSON NULL,
    source_image_urls JSON NULL,
    phone VARCHAR(32) NULL,
    whatsapp VARCHAR(32) NULL,
    email VARCHAR(255) NULL,
    website TEXT NULL,
    status ENUM('unclaimed','claimed','active','hidden','pending','draft') NOT NULL DEFAULT 'unclaimed',
    source ENUM('manual','auto') NOT NULL DEFAULT 'manual',
    confidence TINYINT UNSIGNED NULL,
    collected_at DATETIME NULL,
    source_url TEXT NULL,
    opted_out TINYINT(1) NOT NULL DEFAULT 0,
    do_not_contact TINYINT(1) NOT NULL DEFAULT 0,
    opt_out_at DATETIME NULL,
    opt_out_method VARCHAR(64) NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_properties_owner (owner_id),
    INDEX idx_properties_status (status),
    INDEX idx_properties_region (region),
    INDEX idx_properties_source (source),
    CONSTRAINT fk_properties_owner FOREIGN KEY (owner_id) REFERENCES agents(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
  // Step 7.3 — a property ("complex") has one or more bookable units. A single-unit complex is
  // the common case and stays invisible in the UI (system creates the one unit behind the
  // scenes); multi-unit complexes (Booking-style) show each unit as its own card. Shared
  // amenities/description/gallery live on `properties`; per-unit amenities/images/price live here.
  `CREATE TABLE IF NOT EXISTS property_units (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    max_guests TINYINT UNSIGNED NULL,
    bedrooms TINYINT UNSIGNED NULL,
    beds TINYINT UNSIGNED NULL,
    bathrooms TINYINT UNSIGNED NULL,
    base_price_night DECIMAL(10,2) NULL,
    weekend_price DECIMAL(10,2) NULL,
    holiday_price DECIMAL(10,2) NULL,
    min_nights TINYINT UNSIGNED NOT NULL DEFAULT 1,
    unit_amenities JSON NULL,
    images JSON NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_property_units_property (property_id),
    CONSTRAINT fk_property_units_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    unit_id INT NULL,
    date DATE NOT NULL,
    is_available TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_availability_unit_date (unit_id, date),
    INDEX idx_availability_property (property_id),
    CONSTRAINT fk_availability_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_availability_unit FOREIGN KEY (unit_id) REFERENCES property_units(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS booking_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    unit_id INT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guest_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    customer_email VARCHAR(255) NULL,
    message TEXT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    notified_at DATETIME NULL,
    reminder_sent_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_booking_requests_property (property_id),
    INDEX idx_booking_requests_status (status),
    CONSTRAINT fk_booking_requests_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // Shared one-time-code table for both ownership-claim verification and the /remove page —
  // same short-lived OTP mechanism, different `purpose`. `target` is the phone number (claim,
  // removal_phone) or domain (removal_domain) the code was sent to/about.
  `CREATE TABLE IF NOT EXISTS verification_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    purpose ENUM('property_claim','removal_phone','removal_domain') NOT NULL,
    target VARCHAR(255) NOT NULL,
    property_id INT NULL,
    owner_id INT NULL,
    code VARCHAR(8) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_verification_codes_target (purpose, target),
    CONSTRAINT fk_verification_codes_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_verification_codes_owner FOREIGN KEY (owner_id) REFERENCES agents(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,

  // Collection engine (Step 3) run log + compliance report — one row per pipeline run
  // (server/engine/pipeline.js). compliance_report is the auto-generated Step 5.5 report:
  // images downloaded (must be 0), description-overlap check results, domains skipped for
  // robots.txt/blocklist reasons.
  `CREATE TABLE IF NOT EXISTS engine_runs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mode ENUM('dry_run','live') NOT NULL DEFAULT 'dry_run',
    status ENUM('running','completed','failed') NOT NULL DEFAULT 'running',
    domains_discovered INT NOT NULL DEFAULT 0,
    pages_fetched INT NOT NULL DEFAULT 0,
    pages_extracted INT NOT NULL DEFAULT 0,
    pages_rejected INT NOT NULL DEFAULT 0,
    properties_created INT NOT NULL DEFAULT 0,
    properties_updated INT NOT NULL DEFAULT 0,
    properties_queued_for_review INT NOT NULL DEFAULT 0,
    domains_skipped_robots INT NOT NULL DEFAULT 0,
    domains_skipped_blocklist INT NOT NULL DEFAULT 0,
    llm_cost_usd DECIMAL(10,4) NOT NULL DEFAULT 0,
    compliance_report JSON NULL,
    error_message TEXT NULL,
    started_at DATETIME NOT NULL,
    finished_at DATETIME NULL,
    INDEX idx_engine_runs_started (started_at)
  ) ENGINE=InnoDB`,
  // Step 8.2 — query matrix, persisted so productive vs. wasteful queries can be told apart
  // across runs instead of regenerated blind every time.
  `CREATE TABLE IF NOT EXISTS engine_queries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_text VARCHAR(255) NOT NULL,
    property_type VARCHAR(32) NULL,
    region VARCHAR(64) NULL,
    amenity VARCHAR(64) NULL,
    status ENUM('pending','run','productive','unproductive') NOT NULL DEFAULT 'pending',
    result_count INT NOT NULL DEFAULT 0,
    last_run_at DATETIME NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_engine_queries_text (query_text),
    INDEX idx_engine_queries_status (status)
  ) ENGINE=InnoDB`,
  // Step 8.3 — one row per normalized domain ever classified, so a domain is never re-sent to
  // the LLM classifier twice (8.3: "שמור את הסיווג כדי לא לסווג שוב").
  `CREATE TABLE IF NOT EXISTS engine_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    classification ENUM('single_property','portal','irrelevant') NOT NULL,
    classified_via ENUM('llm','heuristic') NOT NULL DEFAULT 'heuristic',
    reason TEXT NULL,
    created_at DATETIME NOT NULL,
    UNIQUE KEY uk_engine_sources_domain (domain)
  ) ENGINE=InnoDB`,
  // Step 8.5 — emergency stop + any other small engine-wide toggles. Single-row-per-key,
  // DB-backed (not just in-memory) so the stop button works even against a different process
  // than the one running the pipeline, and survives a restart mid-run.
  `CREATE TABLE IF NOT EXISTS engine_settings (
    setting_key VARCHAR(64) PRIMARY KEY,
    setting_value VARCHAR(255) NOT NULL,
    updated_at DATETIME NOT NULL
  ) ENGINE=InnoDB`,
  // 10.5 — per-property analytics. One row per event, never deduplicated at write time —
  // "unique views" is computed at read time as COUNT(DISTINCT session_id), so the raw total
  // (every page load) is preserved too ("views (unique/not unique)" needs both numbers).
  // session_id is a hash of a random client-generated token (never anything identifying), so
  // even this table alone can't be used to track a specific person across properties.
  `CREATE TABLE IF NOT EXISTS property_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    unit_id INT NULL,
    event_type ENUM('view','whatsapp_click','call_click','share','favorite') NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    source ENUM('search','direct','external') NOT NULL DEFAULT 'direct',
    created_at DATETIME NOT NULL,
    INDEX idx_property_events_property_type_date (property_id, event_type, created_at),
    INDEX idx_property_events_session (property_id, session_id, event_type),
    CONSTRAINT fk_property_events_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  // 10.6 — reviews. One review per (property_id, user_id) enforced at the DB level (the
  // "editable for 30 days" rule is enforced in the store by comparing created_at, not schema).
  // owner_reply lives on the same row (spec: "תגובה אחת" — one reply, not a thread).
  `CREATE TABLE IF NOT EXISTS property_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    user_id INT NOT NULL,
    rating TINYINT UNSIGNED NOT NULL,
    cleanliness_rating TINYINT UNSIGNED NULL,
    accuracy_rating TINYINT UNSIGNED NULL,
    host_rating TINYINT UNSIGNED NULL,
    value_rating TINYINT UNSIGNED NULL,
    title VARCHAR(150) NULL,
    body TEXT NOT NULL,
    stay_date DATE NULL,
    owner_reply TEXT NULL,
    owner_reply_at DATETIME NULL,
    status ENUM('visible','hidden','removed') NOT NULL DEFAULT 'visible',
    report_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uk_property_reviews_user_property (property_id, user_id),
    INDEX idx_property_reviews_property_status (property_id, status),
    CONSTRAINT fk_property_reviews_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_property_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS property_review_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    review_id INT NOT NULL,
    reason VARCHAR(255) NULL,
    reporter_session VARCHAR(64) NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_property_review_reports_review (review_id),
    CONSTRAINT fk_review_reports_review FOREIGN KEY (review_id) REFERENCES property_reviews(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  // 10.8 — "report incorrect info" (distinct from review reports): flags property *data* as
  // wrong, most valuable on auto-collected listings — turns visitors into a QA layer.
  `CREATE TABLE IF NOT EXISTS property_info_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    reason VARCHAR(255) NULL,
    details TEXT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_property_info_reports_property (property_id),
    CONSTRAINT fk_property_info_reports_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  // 11.5 — local (in-DB) image storage, the "db" ImageStorage backend (see media/imageStorage/).
  // No external service required — an alternative to Cloudinary when CLOUDINARY_URL isn't set.
  // property_id is nullable — the one non-property use of the same upload endpoint+component
  // (the owner's own profile/logo photo, OwnerSettingsPage) has no property to attach to at
  // all. unit_id is nullable too: an image belongs either directly to the property
  // (complex/shared photos) or to one specific unit, never both. thumb_bytes is a second,
  // separately-generated 400px copy — cards request it instead of the full image (see
  // GET /api/images/:id?size=thumb).
  `CREATE TABLE IF NOT EXISTS property_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NULL,
    unit_id INT NULL,
    mime_type VARCHAR(64) NOT NULL,
    bytes MEDIUMBLOB NOT NULL,
    thumb_bytes MEDIUMBLOB NULL,
    width SMALLINT UNSIGNED NULL,
    height SMALLINT UNSIGNED NULL,
    size_bytes INT UNSIGNED NOT NULL,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    is_primary TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    INDEX idx_property_images_property (property_id),
    INDEX idx_property_images_unit (unit_id),
    CONSTRAINT fk_property_images_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    CONSTRAINT fk_property_images_unit FOREIGN KEY (unit_id) REFERENCES property_units(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
];

/**
 * תיקון-עצמי חד-פעמי בכל עלייה: שורות ב-destination_images עם image_url **זהה** בין
 * iata_code **שונים** הן בהגדרה שגויות — שני יעדים שונים לא אמורים לחלוק תמונה במקרה
 * (קטלוג Pexels/Unsplash גדול מספיק). אם זה קרה (cache ישן מבאג קודם, seed לא תקין וכו'),
 * מוחקים את השורות האלה — הן יתמשכו מחדש בבקשה הבאה, עם הקוד הנוכחי (Pexels-ראשון, query
 * ספציפי-יעד). לא משנה את ה-root cause המדויק (אין לי גישה ל-DB של production לבדוק
 * ישירות), רק מתקן את הסימפטום בצורה בטוחה ועקבית.
 */
async function cleanupDuplicateDestinationImages(connection) {
  const [rows] = await connection.query(
    `SELECT image_url FROM destination_images
     WHERE image_url IS NOT NULL
     GROUP BY image_url
     HAVING COUNT(DISTINCT iata_code) > 1`
  );
  if (rows.length === 0) return;

  const urls = rows.map((r) => r.image_url);
  await connection.query('DELETE FROM destination_images WHERE image_url IN (?)', [urls]);
  console.warn(
    `[deal-radar-pro] Cleared ${urls.length} destination_images URL(s) that were shared across ` +
      'multiple different destinations (always wrong) — they will be re-fetched fresh on next request.'
  );
}

/**
 * מתחבר ל-MySQL עם retry+backoff עד שמצליח, ובונה את הטבלאות אם הן לא קיימות.
 * חשוב: לא חוסם את עליית שרת ה-HTTP — קוראים לזה ברקע (fire-and-forget) מ-server/index.js,
 * כדי שהשרת יעלה וישרת /health ו-/api אפילו אם ה-DB עוד לא מוכן (למשל בעלייה ראשונה ב-Railway
 * כשמכל ה-MySQL עדיין מתאתחל).
 *
 * Connects with retry+backoff until it succeeds, creating tables if missing. Deliberately
 * does NOT block server startup — called fire-and-forget so the HTTP server stays up even
 * while the DB is still warming up.
 */
export async function connectWithRetry({ maxAttempts = Infinity, baseDelayMs = 2000, maxDelayMs = 30000 } = {}) {
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    let attempt = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt += 1;
      try {
        const currentPool = getPool();
        const connection = await currentPool.getConnection();
        try {
          for (const statement of SCHEMA_STATEMENTS) {
            await connection.query(statement);
          }
          for (const migration of MIGRATIONS) {
            await migration(connection);
          }
          await cleanupDuplicateDestinationImages(connection);
        } finally {
          connection.release();
        }
        ready = true;
        console.log('[deal-radar-pro] MySQL connected and schema verified.');
        return currentPool;
      } catch (err) {
        if (attempt >= maxAttempts) {
          console.error(`[deal-radar-pro] MySQL connection failed after ${attempt} attempt(s), giving up:`, err.message);
          throw err;
        }
        const delayMs = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
        console.warn(
          `[deal-radar-pro] MySQL not ready yet (attempt ${attempt}): ${err.message}. Retrying in ${Math.round(delayMs / 1000)}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  })();

  return readyPromise;
}

/** לשימוש בטסטים/כיבוי מסודר בלבד */
export async function closePool() {
  if (pool) {
    await pool.end();
  }
  pool = null;
  ready = false;
  readyPromise = null;
}
