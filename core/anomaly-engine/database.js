import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_PATH = path.join(__dirname, '..', '..', 'data', 'price-history.sqlite');

let dbInstance = null;

/**
 * מחזיר instance יחיד (singleton) של חיבור ל-SQLite, ומבטיח שהטבלה הנדרשת קיימת.
 * Singleton connection to the SQLite price-history database. Created lazily so tests / scripts
 * that don't need persistence never touch the filesystem.
 */
export function getDb(dbPath = process.env.SQLITE_DB_PATH || DEFAULT_DB_PATH) {
  if (dbInstance) return dbInstance;

  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');

  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route TEXT NOT NULL,
      date TEXT NOT NULL,
      price REAL NOT NULL,
      scanned_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_route ON price_history (route);
  `);

  return dbInstance;
}

/** לשימוש בטסטים בלבד — סוגר ומאפס את ה-singleton */
export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
