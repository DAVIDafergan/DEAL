import { getPool } from '../../core/db/index.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function startEngineRun(mode = 'dry_run') {
  const pool = getPool();
  const now = nowStr();
  const [result] = await pool.query(
    `INSERT INTO engine_runs (mode, status, started_at) VALUES (?, 'running', ?)`,
    [mode, now]
  );
  return result.insertId;
}

export async function finishEngineRun(id, stats) {
  const pool = getPool();
  await pool.query(
    `UPDATE engine_runs SET
       status = ?, domains_discovered = ?, pages_fetched = ?, pages_extracted = ?, pages_rejected = ?,
       properties_created = ?, properties_updated = ?, properties_queued_for_review = ?,
       domains_skipped_robots = ?, domains_skipped_blocklist = ?, llm_cost_usd = ?,
       compliance_report = ?, error_message = ?, finished_at = ?
     WHERE id = ?`,
    [
      stats.status || 'completed',
      stats.domainsDiscovered || 0,
      stats.pagesFetched || 0,
      stats.pagesExtracted || 0,
      stats.pagesRejected || 0,
      stats.propertiesCreated || 0,
      stats.propertiesUpdated || 0,
      stats.propertiesQueuedForReview || 0,
      stats.domainsSkippedRobots || 0,
      stats.domainsSkippedBlocklist || 0,
      stats.llmCostUsd || 0,
      stats.complianceReport ? JSON.stringify(stats.complianceReport) : null,
      stats.errorMessage || null,
      nowStr(),
      id,
    ]
  );
}

export async function getEngineRun(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM engine_runs WHERE id = ? LIMIT 1', [id]);
  if (!rows[0]) return null;
  return { ...rows[0], compliance_report: rows[0].compliance_report ? JSON.parse(rows[0].compliance_report) : null };
}

export async function listEngineRuns(limit = 20) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM engine_runs ORDER BY started_at DESC LIMIT ?', [limit]);
  return rows.map((r) => ({ ...r, compliance_report: r.compliance_report ? JSON.parse(r.compliance_report) : null }));
}

export async function getLatestEngineRun() {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM engine_runs ORDER BY started_at DESC LIMIT 1');
  if (!rows[0]) return null;
  return { ...rows[0], compliance_report: rows[0].compliance_report ? JSON.parse(rows[0].compliance_report) : null };
}
