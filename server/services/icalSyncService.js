import { getPool } from '../../core/db/index.js';
import { getUnitOwnedBy } from '../store/propertyStore.js';
import { parseIcsFeed } from './icalService.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** Pulls the unit's external calendar (ical_import_url) and marks every date it lists as busy
 * (is_available=0), with a fresh updated_at — which is exactly what feeds the "עודכן לפני X"
 * freshness badge and its search-ranking boost (see propertyStore.js's AVAILABILITY_AGG_JOIN),
 * so a synced calendar reads as "actively maintained" the same way a manual edit would.
 * One-directional by design: only ever adds blocks, never re-opens a date that dropped out of
 * the feed (a transient fetch/parse hiccup must never accidentally re-open a room that's
 * actually booked) — an owner who wants to reopen a date does so manually, same as today. */
export async function syncUnitIcalImport(unitId, ownerId) {
  const unit = await getUnitOwnedBy(unitId, ownerId);
  if (!unit) return { ok: false, reason: 'not_found' };
  if (!unit.ical_import_url) return { ok: false, reason: 'no_import_url' };

  let icsText;
  try {
    const response = await fetch(unit.ical_import_url);
    if (!response.ok) return { ok: false, reason: 'fetch_failed' };
    icsText = await response.text();
  } catch {
    return { ok: false, reason: 'fetch_error' };
  }

  const blockedDates = parseIcsFeed(icsText);
  const pool = getPool();
  const ts = nowStr();
  for (const date of blockedDates) {
    await pool.query(
      `INSERT INTO availability (property_id, unit_id, date, is_available, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE is_available = 0, updated_at = VALUES(updated_at)`,
      [unit.property_id, unitId, date, ts, ts]
    );
  }
  await pool.query('UPDATE property_units SET ical_last_synced_at = ? WHERE id = ?', [ts, unitId]);
  return { ok: true, blockedCount: blockedDates.length };
}
