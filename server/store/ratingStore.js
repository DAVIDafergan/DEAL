import { getPool } from '../../core/db/index.js';

export async function upsertRating(sessionId, agentId, rating) {
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(
    `INSERT INTO agent_ratings (session_id, agent_id, rating, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE rating=VALUES(rating), updated_at=VALUES(updated_at)`,
    [sessionId, agentId, rating, now, now]
  );
}

export async function getAgentRatingSummary(agentId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT AVG(rating) AS avg_rating, COUNT(*) AS count FROM agent_ratings WHERE agent_id=?',
    [agentId]
  );
  const avg = rows[0]?.avg_rating ? Number(rows[0].avg_rating).toFixed(1) : null;
  return { avg, count: Number(rows[0]?.count || 0) };
}

export async function getSessionRating(sessionId, agentId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT rating FROM agent_ratings WHERE session_id=? AND agent_id=?',
    [sessionId, agentId]
  );
  return rows[0]?.rating || null;
}

export async function getSessionAllRatings(sessionId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT ar.agent_id, ar.rating, a.business_name, a.slug
     FROM agent_ratings ar JOIN agents a ON a.id=ar.agent_id
     WHERE ar.session_id=?
     ORDER BY ar.updated_at DESC`,
    [sessionId]
  );
  return rows;
}
