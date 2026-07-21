import { getPool } from '../../core/db/index.js';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** DB-backed (not in-memory) so it works across process restarts and isn't lost if the process
 * running the pipeline isn't the same one the admin panel's request hits. */
export async function getSetting(key, fallback = null) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT setting_value FROM engine_settings WHERE setting_key = ? LIMIT 1', [key]);
  return rows[0] ? rows[0].setting_value : fallback;
}

export async function setSetting(key, value) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO engine_settings (setting_key, setting_value, updated_at) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = VALUES(updated_at)`,
    [key, String(value), nowStr()]
  );
}

// ── Step 8.5 emergency stop ──────────────────────────────────────────────────────────────────

export async function isEmergencyStopped() {
  return (await getSetting('emergency_stop', 'false')) === 'true';
}

export async function setEmergencyStop(stopped) {
  await setSetting('emergency_stop', stopped ? 'true' : 'false');
}
