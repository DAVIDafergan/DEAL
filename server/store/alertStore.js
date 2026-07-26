import { randomBytes } from 'node:crypto';
import { getPool } from '../../core/db/index.js';
import { searchProperties } from './propertyStore.js';
import { sendEmail } from '../services/emailService.js';

const SITE_URL = process.env.SITE_URL || 'https://dealim.org';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// 11.14 — "notify me" alerts (no account): a visitor sets region/budget/dates once, gets an
// email whenever a new or newly-updated property matches. See core/db/index.js's
// property_alerts schema comment for the column shapes.

export async function createAlert({ email, region, maxPrice, checkIn, checkOut, guestCapacity }) {
  const pool = getPool();
  const token = randomBytes(24).toString('hex');
  const ts = nowStr();
  await pool.query(
    `INSERT INTO property_alerts
       (email, region, max_price, check_in, check_out, guest_capacity, unsubscribe_token, last_seen_property_ids, last_checked_at, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    [email, region || null, maxPrice || null, checkIn || null, checkOut || null, guestCapacity || null, token, JSON.stringify([]), ts, ts]
  );
  return { token };
}

export async function unsubscribeAlert(token) {
  const pool = getPool();
  const [result] = await pool.query('UPDATE property_alerts SET is_active = 0 WHERE unsubscribe_token = ?', [token]);
  return result.affectedRows > 0;
}

function buildAlertEmailHtml(properties, unsubscribeToken) {
  const rows = properties
    .map((p) => `<li><a href="${SITE_URL}/property/${p.id}">${p.name}</a>${p.city ? ` — ${p.city}` : ''}${p.price_from ? ` — ${Math.round(p.price_from)} ₪/לילה` : ''}</li>`)
    .join('');
  return `
    <p>שלום,</p>
    <p>נמצאו נכסים חדשים או מעודכנים שתואמים את ההתראה שהגדרת:</p>
    <ul>${rows}</ul>
    <p style="color:#7A6C5B;font-size:13px"><a href="${SITE_URL}/api/alerts/${unsubscribeToken}/unsubscribe">להסרה מרשימת התפוצה</a></p>
  `;
}

/** Sweeps every active alert, emails only about properties never emailed for that alert before
 * (last_seen_property_ids is the dedup guard), then records what it saw either way — safe to
 * run on any interval, from a cold start, or concurrently with a manual re-run. */
export async function checkPropertyAlerts() {
  const pool = getPool();
  const [alerts] = await pool.query('SELECT * FROM property_alerts WHERE is_active = 1');
  let emailsSent = 0;
  for (const alert of alerts) {
    try {
      const seenIds = new Set(JSON.parse(alert.last_seen_property_ids || '[]'));
      const matches = await searchProperties({
        region: alert.region || undefined,
        maxPrice: alert.max_price || undefined,
        checkIn: alert.check_in ? new Date(alert.check_in).toISOString().slice(0, 10) : undefined,
        checkOut: alert.check_out ? new Date(alert.check_out).toISOString().slice(0, 10) : undefined,
        minGuests: alert.guest_capacity || undefined,
        sort: 'new',
        limit: 50,
      });
      const newMatches = matches.filter((p) => !seenIds.has(p.id));
      if (newMatches.length > 0) {
        const result = await sendEmail(alert.email, 'נכסים חדשים שתואמים את ההתראה שלך ב-Dealim', buildAlertEmailHtml(newMatches, alert.unsubscribe_token));
        if (result.sent) emailsSent += 1;
        for (const p of newMatches) seenIds.add(p.id);
      }
      await pool.query('UPDATE property_alerts SET last_seen_property_ids = ?, last_checked_at = ? WHERE id = ?', [
        JSON.stringify([...seenIds]), nowStr(), alert.id,
      ]);
    } catch (err) {
      console.error(`[alertStore] check failed for alert ${alert.id}:`, err.message);
    }
  }
  return { alertsChecked: alerts.length, emailsSent };
}
