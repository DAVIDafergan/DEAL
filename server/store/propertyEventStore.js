import { createHash } from 'node:crypto';
import { getPool } from '../../core/db/index.js';

const EVENT_TYPES = ['view', 'whatsapp_click', 'call_click', 'share', 'favorite'];
const SOURCES = ['search', 'direct', 'external'];

/** Hashes the client's random session token before it ever touches the DB — see the
 * property_events table comment in core/db/index.js for why. Salted with a fixed, non-secret
 * string (this isn't access control, just avoiding storing the raw client token verbatim). */
function hashSessionId(rawSessionId) {
  return createHash('sha256').update(`dealradar-pe:${rawSessionId}`).digest('hex').slice(0, 64);
}

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export async function recordPropertyEvent({ propertyId, unitId, eventType, sessionId, source }) {
  if (!EVENT_TYPES.includes(eventType)) return;
  if (!sessionId) return;
  const pool = getPool();
  await pool.query(
    `INSERT INTO property_events (property_id, unit_id, event_type, session_id, source, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    [propertyId, unitId || null, eventType, hashSessionId(sessionId), SOURCES.includes(source) ? source : 'direct', nowStr()]
  );
}

async function eventTotals(pool, propertyId, fromDate, toDate) {
  const [rows] = await pool.query(
    `SELECT event_type,
       COUNT(*) AS total,
       COUNT(DISTINCT session_id) AS unique_sessions
     FROM property_events
     WHERE property_id = ? AND created_at >= ? AND created_at < ?
     GROUP BY event_type`,
    [propertyId, fromDate, toDate]
  );
  const byType = {};
  for (const t of EVENT_TYPES) byType[t] = { total: 0, unique: 0 };
  for (const row of rows) {
    byType[row.event_type] = { total: Number(row.total), unique: Number(row.unique_sessions) };
  }
  return byType;
}

/** getPropertyStats — everything the owner-facing stats card/page needs in one call: totals
 * for the requested window, the same totals for the immediately-preceding window of equal
 * length (so the UI can say "up 23% from last week"), views-by-day, and traffic sources. */
export async function getPropertyStats(propertyId, { days = 30 } = {}) {
  const pool = getPool();
  const now = new Date();
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const prevFrom = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

  const [current, previous] = await Promise.all([
    eventTotals(pool, propertyId, fmt(from), fmt(now)),
    eventTotals(pool, propertyId, fmt(prevFrom), fmt(from)),
  ]);

  const [viewsByDayRows] = await pool.query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS total, COUNT(DISTINCT session_id) AS unique_sessions
     FROM property_events
     WHERE property_id = ? AND event_type = 'view' AND created_at >= ?
     GROUP BY DATE(created_at) ORDER BY day ASC`,
    [propertyId, fmt(from)]
  );

  const [sourceRows] = await pool.query(
    `SELECT source, COUNT(*) AS total FROM property_events
     WHERE property_id = ? AND event_type = 'view' AND created_at >= ?
     GROUP BY source`,
    [propertyId, fmt(from)]
  );
  const sources = { search: 0, direct: 0, external: 0 };
  for (const row of sourceRows) sources[row.source] = Number(row.total);

  function pctChange(curr, prev) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  return {
    days,
    current,
    previous,
    changePct: Object.fromEntries(EVENT_TYPES.map((t) => [t, pctChange(current[t].total, previous[t].total)])),
    viewsByDay: viewsByDayRows.map((r) => ({
      day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
      total: Number(r.total),
      unique: Number(r.unique_sessions),
    })),
    sources,
  };
}

/** getOwnerEventSummary — one query for every property an owner has, instead of one stats
 * query per dashboard card (the exact N+1 shape 10.1 fixed elsewhere in this app). Used for
 * the compact view/whatsapp-click counts shown right on each dashboard card. */
export async function getOwnerEventSummary(ownerId, { days = 30 } = {}) {
  const pool = getPool();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const [rows] = await pool.query(
    `SELECT pe.property_id,
       SUM(CASE WHEN pe.event_type = 'view' THEN 1 ELSE 0 END) AS views,
       SUM(CASE WHEN pe.event_type = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
       SUM(CASE WHEN pe.event_type = 'call_click' THEN 1 ELSE 0 END) AS call_clicks
     FROM property_events pe
     JOIN properties p ON p.id = pe.property_id
     WHERE p.owner_id = ? AND pe.created_at >= ?
     GROUP BY pe.property_id`,
    [ownerId, from]
  );
  const byProperty = {};
  for (const row of rows) {
    byProperty[row.property_id] = { views: Number(row.views), whatsappClicks: Number(row.whatsapp_clicks), callClicks: Number(row.call_clicks) };
  }
  return byProperty;
}

/** getSiteEventStats — admin-wide aggregate: totals across every property, plus a top-10 list
 * by view count, for the requested window. */
export async function getSiteEventStats({ days = 30 } = {}) {
  const pool = getPool();
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  const [totalsRows] = await pool.query(
    `SELECT event_type, COUNT(*) AS total, COUNT(DISTINCT session_id) AS unique_sessions
     FROM property_events WHERE created_at >= ? GROUP BY event_type`,
    [from]
  );
  const totals = {};
  for (const t of EVENT_TYPES) totals[t] = { total: 0, unique: 0 };
  for (const row of totalsRows) totals[row.event_type] = { total: Number(row.total), unique: Number(row.unique_sessions) };

  const [topRows] = await pool.query(
    `SELECT pe.property_id, p.name, COUNT(*) AS views
     FROM property_events pe
     JOIN properties p ON p.id = pe.property_id
     WHERE pe.event_type = 'view' AND pe.created_at >= ?
     GROUP BY pe.property_id, p.name
     ORDER BY views DESC LIMIT 10`,
    [from]
  );

  return { days, totals, topProperties: topRows.map((r) => ({ propertyId: r.property_id, name: r.name, views: Number(r.views) })) };
}
