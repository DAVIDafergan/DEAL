import { getPool } from '../../core/db/index.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** Upserts the full query matrix (8.2) — safe to call every run; existing rows keep their
 * status/result_count history, only brand-new query strings get inserted. */
export async function upsertQueryMatrix(queries) {
  const pool = getPool();
  const now = nowStr();
  for (const q of queries) {
    await pool.query(
      `INSERT INTO engine_queries (query_text, property_type, region, amenity, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE query_text = query_text`,
      [q.text, q.propertyType || null, q.region || null, q.amenity || null, now]
    );
  }
}

/** Records the outcome of running one query — status becomes 'productive' (found >=1 usable
 * site) or 'unproductive' (ran, found nothing), so future runs can prioritize/skip accordingly. */
export async function recordQueryResult(queryText, resultCount) {
  const pool = getPool();
  await pool.query(
    `UPDATE engine_queries SET status = ?, result_count = ?, last_run_at = ? WHERE query_text = ?`,
    [resultCount > 0 ? 'productive' : 'unproductive', resultCount, nowStr(), queryText]
  );
}

export async function listQueries({ status } = {}) {
  const pool = getPool();
  if (status) {
    const [rows] = await pool.query('SELECT * FROM engine_queries WHERE status = ? ORDER BY result_count DESC', [status]);
    return rows;
  }
  const [rows] = await pool.query('SELECT * FROM engine_queries ORDER BY result_count DESC');
  return rows;
}

export async function getQueryStats() {
  const pool = getPool();
  const [[stats]] = await pool.query(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'productive' THEN 1 ELSE 0 END) AS productive,
            SUM(CASE WHEN status = 'unproductive' THEN 1 ELSE 0 END) AS unproductive,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending
     FROM engine_queries`
  );
  return stats;
}
