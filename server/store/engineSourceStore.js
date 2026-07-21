import { getPool } from '../../core/db/index.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** Cached classification for a domain (8.3: "שמור את הסיווג כדי לא לסווג שוב") — null if this
 * domain has never been classified. */
export async function getSourceClassification(domain) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM engine_sources WHERE domain = ? LIMIT 1', [domain]);
  return rows[0] || null;
}

export async function saveSourceClassification(domain, { classification, classifiedVia, reason }) {
  const pool = getPool();
  const now = nowStr();
  await pool.query(
    `INSERT INTO engine_sources (domain, classification, classified_via, reason, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE classification = VALUES(classification), classified_via = VALUES(classified_via),
       reason = VALUES(reason)`,
    [domain, classification, classifiedVia, reason || null, now]
  );
}

export async function listSourcesByClassification(classification) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM engine_sources WHERE classification = ? ORDER BY created_at DESC', [classification]);
  return rows;
}
