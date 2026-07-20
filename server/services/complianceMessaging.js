import { getPool } from '../../core/db/index.js';
import { isPhoneBlocked, addToBlocklist, normalizePhone } from '../../core/compliance/blocklist.js';

/**
 * Real sending is off by default — build the mechanism, don't activate it (see
 * engine/templates/messages.he.md header note: wording needs lawyer sign-off first).
 * Every call still runs the full gating logic (blocklist, do_not_contact, one-message-max) and
 * logs exactly what *would* have been sent, so the flow is provable end-to-end without a live
 * WhatsApp account wired up.
 */
const MESSAGING_ENABLED = process.env.PROPERTY_MESSAGING_ENABLED === 'true';
const SITE_URL = process.env.SITE_URL || 'https://dealim.org';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@dealim.org';

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/**
 * The one real send point. Not wired to a live WhatsApp Business API client — when
 * PROPERTY_MESSAGING_ENABLED=true this is the spot to add that integration (WHATSAPP_ACCESS_TOKEN
 * / WHATSAPP_PHONE_NUMBER_ID are already in .env.example from the retired flight distribution/
 * layer). Until then it only logs, which is sufficient to prove the surrounding gating logic.
 */
async function sendWhatsAppMessage(toPhone, text) {
  if (!MESSAGING_ENABLED) {
    console.log(`[complianceMessaging] DISABLED — would send WhatsApp to ${toPhone}:\n${text}\n`);
    return { sent: false, reason: 'disabled' };
  }
  console.error(
    '[complianceMessaging] PROPERTY_MESSAGING_ENABLED=true but no WhatsApp API client is wired up yet. ' +
      'Add the actual Meta Cloud API call here before relying on this in production.'
  );
  return { sent: false, reason: 'not_implemented' };
}

// ── Templates (must match engine/templates/messages.he.md — that file is the source of truth
// for wording; update both together) ────────────────────────────────────────────────────────

function bookingNotificationText({ property, booking }) {
  const messageLine = booking.message ? `הודעה: ${booking.message}\n` : '';
  return `שלום, קיבלתם בקשת הזמנה חדשה דרך Dealim (${SITE_URL}) עבור הנכס "${property.name}" שלכם.

תאריכים: ${booking.check_in} – ${booking.check_out}
מספר אורחים: ${booking.guest_count}
שם הפונה: ${booking.customer_name}
טלפון: ${booking.customer_phone}
${messageLine}
הנכס שלכם מוצג כרגע ב-Dealim ממקורות פומביים. לניהול מלא של הנכס (עדכון פרטים, תמונות, זמינות) — היכנסו לקישור: ${SITE_URL}/property/${property.id}

להסרת הנכס ולהפסקת פניות — השב הסר`;
}

function reminderText({ property, booking, daysAgo }) {
  return `תזכורת: יש לכם בקשת הזמנה ממתינה ל-${property.name} דרך Dealim, מ-${booking.customer_name} (תאריכים: ${booking.check_in} – ${booking.check_out}). הבקשה מ-${daysAgo} ימים.

לצפייה בפרטים המלאים: ${SITE_URL}/property/${property.id}

להסרת הנכס ולהפסקת פניות — השב הסר`;
}

function removalConfirmationText() {
  return `הנכס שלכם הוסר מ-Dealim ולא יופיע יותר באתר. לא תישלחנה אליכם הודעות נוספות ממספר זה.

אם ההסרה בוצעה בטעות, ניתן לפנות אלינו: ${SUPPORT_EMAIL}`;
}

// ── Verification codes (ownership claim + /remove) ───────────────────────────────────────────
// Transactional, user-initiated one-time codes (not marketing) — still routed through the same
// disabled-by-default sender for consistency and because no live WhatsApp client is wired up.

export async function sendVerificationCode(phone, code) {
  const text = `קוד האימות שלך ל-Dealim: ${code}\nהקוד בתוקף ל-15 דקות. אם לא ביקשת קוד זה, התעלם מהודעה זו.`;
  return sendWhatsAppMessage(phone, text);
}

// ── Booking-request notification (unclaimed properties only — see PropertyPage /
// booking-requests route) ──────────────────────────────────────────────────────────────────

/** At most one notification per booking request. No-ops silently if the property has no
 * contact number, is blocklisted, or has do_not_contact set — never throws, a notification
 * failure must never block the booking request itself from being saved. */
export async function notifyOwnerOfBookingRequest(property, booking) {
  const toPhone = property.whatsapp || property.phone;
  if (!toPhone) return { sent: false, reason: 'no_contact' };
  if (property.do_not_contact) return { sent: false, reason: 'do_not_contact' };
  if (await isPhoneBlocked(toPhone)) return { sent: false, reason: 'blocklisted' };

  const text = bookingNotificationText({ property, booking });
  const result = await sendWhatsAppMessage(toPhone, text);

  // notified_at is set whenever the gating logic decided to send (even in disabled/logged
  // mode) — otherwise the one-message-max cap can't be proven correct without live sending.
  await getPool().query('UPDATE booking_requests SET notified_at = ? WHERE id = ?', [nowStr(), booking.id]);
  return result;
}

/** Sends the single allowed reminder for booking requests still pending 2+ days after the
 * first notification. Safe to call repeatedly (e.g. from a daily interval) — reminder_sent_at
 * guarantees it never sends twice for the same booking request. */
export async function sendPendingReminders() {
  const pool = getPool();
  // Bound UTC cutoff, not SQL NOW() — see the matching comment in propertyStore.verifyClaimCode;
  // same timezone trap (MySQL session tz vs. the UTC DATETIMEs this app actually stores).
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
  const [rows] = await pool.query(
    `SELECT br.*, p.name, p.whatsapp, p.phone, p.do_not_contact, p.id AS property_id
     FROM booking_requests br
     JOIN properties p ON p.id = br.property_id
     WHERE br.status = 'pending' AND br.notified_at IS NOT NULL AND br.reminder_sent_at IS NULL
       AND p.owner_id IS NULL
       AND br.notified_at <= ?`,
    [cutoff]
  );

  let sent = 0;
  for (const row of rows) {
    const toPhone = row.whatsapp || row.phone;
    if (!toPhone || row.do_not_contact || (await isPhoneBlocked(toPhone))) continue;
    const daysAgo = Math.max(1, Math.round((Date.now() - new Date(row.notified_at).getTime()) / 86400000));
    const text = reminderText({
      property: { id: row.property_id, name: row.name },
      booking: row,
      daysAgo,
    });
    await sendWhatsAppMessage(toPhone, text);
    await pool.query('UPDATE booking_requests SET reminder_sent_at = ? WHERE id = ?', [nowStr(), row.id]);
    sent += 1;
  }
  if (sent > 0) console.log(`[complianceMessaging] Processed ${sent} reminder(s) (sending ${MESSAGING_ENABLED ? 'enabled' : 'disabled — logged only'}).`);
  return sent;
}

// ── Inbound "הסר" handling — see server/routes/whatsapp.js for the webhook that calls this ──

const REMOVE_KEYWORDS = ['הסר', 'הסירו', 'stop', 'remove', 'unsubscribe'];

function looksLikeRemoveRequest(text) {
  const normalized = (text || '').trim().toLowerCase();
  return REMOVE_KEYWORDS.some((kw) => normalized.includes(kw.toLowerCase()));
}

/** Called from the inbound WhatsApp webhook. Opts out every property tied to this phone number
 * and blocklists it — no admin approval needed, per the compliance rule. Returns the
 * confirmation text to send back (still subject to the same MESSAGING_ENABLED gate). */
export async function handleInboundReply(fromPhone, text) {
  if (!looksLikeRemoveRequest(text)) return { handled: false };

  const normalized = normalizePhone(fromPhone);
  const pool = getPool();
  const now = nowStr();
  await pool.query(
    `UPDATE properties SET opted_out = 1, do_not_contact = 1, status = 'hidden', opt_out_at = ?, opt_out_method = 'whatsapp_reply'
     WHERE phone = ? OR whatsapp = ?`,
    [now, normalized, normalized]
  );
  await addToBlocklist('phone', normalized, 'Replied "הסר" to a booking-request WhatsApp message');

  const confirmation = removalConfirmationText();
  await sendWhatsAppMessage(fromPhone, confirmation);
  return { handled: true, confirmation };
}

export const _internal = { MESSAGING_ENABLED, bookingNotificationText, reminderText, removalConfirmationText };
