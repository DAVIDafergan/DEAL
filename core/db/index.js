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

const MIGRATIONS = [
  (connection) => ensureColumn(connection, 'deals', 'departure_at', 'DATETIME NULL'),
  (connection) => ensureColumn(connection, 'deals', 'arrival_at', 'DATETIME NULL'),
  (connection) => ensureColumn(connection, 'deals', 'duration_minutes', 'INT NULL'),
];

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    route VARCHAR(16) NOT NULL,
    date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    scanned_at DATETIME NOT NULL,
    INDEX idx_price_history_route_date (route, date),
    INDEX idx_price_history_route_scanned_at (route, scanned_at)
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS deals (
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
  `CREATE TABLE IF NOT EXISTS packages (
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
];

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
