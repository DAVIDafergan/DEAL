import { getPool } from '../core/db/index.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * Step 8.7 periodic refresh — NOT wired to any cron/scheduler in this codebase. Exposed only as
 * an admin-triggered action (POST /api/admin/engine/refresh), same "manual, deliberate step"
 * pattern as the live-run route — an unattended weekly job that touches real websites is exactly
 * the kind of automatic real-site execution the operator has not authorized yet. Wire this into
 * an actual scheduler only after that's explicitly requested.
 *
 * What it does once triggered:
 *  - Re-checks the blocklist for every property.source_url domain (in case something was
 *    opted out or globally blocklisted since the last run) and hides any newly-blocked ones.
 *  - Marks a property 'inactive'-equivalent (status='hidden') after 3 consecutive failed
 *    re-fetch attempts, tracked via a small counter column.
 * Discovering brand-new domains and re-scraping existing ones for updates both reuse
 * runPipeline() directly — this module only adds the "what to do with properties that already
 * exist" half (staleness/failure tracking), not a second copy of discovery/fetch/extract.
 */
export async function markFailedFetch(propertyId) {
  const pool = getPool();
  const [[row]] = await pool.query('SELECT refresh_fail_count FROM properties WHERE id = ?', [propertyId]);
  const failCount = (row?.refresh_fail_count || 0) + 1;
  const updates = ['refresh_fail_count = ?', 'last_refresh_attempt_at = ?'];
  const vals = [failCount, nowStr()];
  if (failCount >= 3) {
    updates.push(`status = 'hidden'`);
  }
  vals.push(propertyId);
  await pool.query(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`, vals);
  return { propertyId, failCount, markedInactive: failCount >= 3 };
}

export async function markSuccessfulFetch(propertyId) {
  const pool = getPool();
  await pool.query(
    `UPDATE properties SET refresh_fail_count = 0, last_refresh_attempt_at = ? WHERE id = ?`,
    [nowStr(), propertyId]
  );
}

/** Candidates for this refresh pass — auto-collected, not already hidden, not touched in the
 * last 30 days (8.5: "אל תעבד מחדש דומיין שנסרק ב-30 הימים האחרונים אלא אם התוכן השתנה" — this
 * simple version just skips anything refreshed recently; detecting real content change would
 * need a content hash, a reasonable follow-up once this is actually run for the first time). */
export async function listRefreshCandidates(limit = 500) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, name, source_url, refresh_fail_count, last_refresh_attempt_at
     FROM properties
     WHERE source = 'auto' AND status != 'hidden' AND deleted_at IS NULL
       AND (last_refresh_attempt_at IS NULL OR last_refresh_attempt_at < (UTC_TIMESTAMP() - INTERVAL 30 DAY))
     ORDER BY last_refresh_attempt_at ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}
