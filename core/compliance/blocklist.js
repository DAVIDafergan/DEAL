import { getPool } from '../db/index.js';
import { isHardBlockedDomain } from './blockedDomains.js';

/** Normalizes to E.164-ish digits-only (Israeli-local 0X → 972X), matching the pattern used
 * throughout the codebase for WhatsApp links (see PropertyCard/PropertyPage buildWhatsAppUrl). */
export function normalizePhone(phone) {
  if (!phone) return null;
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('0') && digits.length === 10) digits = '972' + digits.slice(1);
  return digits || null;
}

/** Strips protocol/www/path/query — returns a bare registrable-ish domain for comparison. */
export function normalizeDomain(urlOrDomain) {
  if (!urlOrDomain) return null;
  let value = String(urlOrDomain).trim().toLowerCase();
  value = value.replace(/^https?:\/\//, '').replace(/^www\./, '');
  value = value.split('/')[0].split('?')[0];
  return value || null;
}

export async function isPhoneBlocked(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  const pool = getPool();
  const [rows] = await pool.query(`SELECT 1 FROM blocklist WHERE type = 'phone' AND value = ? LIMIT 1`, [normalized]);
  return rows.length > 0;
}

export async function isDomainBlocked(domain) {
  const normalized = normalizeDomain(domain);
  if (!normalized) return false;
  if (isHardBlockedDomain(normalized)) return true;
  const pool = getPool();
  const [rows] = await pool.query(`SELECT 1 FROM blocklist WHERE type = 'domain' AND value = ? LIMIT 1`, [normalized]);
  return rows.length > 0;
}

export async function addToBlocklist(type, value, reason = null) {
  const normalized = type === 'phone' ? normalizePhone(value) : normalizeDomain(value);
  if (!normalized) return;
  const pool = getPool();
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await pool.query(
    `INSERT INTO blocklist (type, value, reason, created_at) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE reason = VALUES(reason)`,
    [type, normalized, reason, now]
  );
}
