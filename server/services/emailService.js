/**
 * Transactional email — same "build the mechanism, log if not configured" pattern as
 * complianceMessaging.js's WhatsApp sender, but NOT gated behind PROPERTY_MESSAGING_ENABLED:
 * these are transactional emails to people who explicitly opted in (a registered owner asking
 * for bookings, or a customer who just submitted a booking request), not the compliance-gated
 * outbound-to-a-scraped-phone-number flow that flag exists to control (7.5: "התראה נשלחת מיד...
 * ואינה כפופה לדגל").
 *
 * No email SDK dependency — Resend's API is a single signed POST, same approach as
 * media/cloudinaryUpload.js for Cloudinary. Swap providers here if you use something else;
 * nothing else in the app should call fetch() directly for email.
 */
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Dealim <noreply@dealim.org>';

export function isEmailConfigured() {
  return Boolean(RESEND_API_KEY);
}

/** Never throws — a failed/unconfigured email must never block the booking flow it's attached
 * to. Returns { sent, reason? }. */
export async function sendEmail(to, subject, html) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  if (!RESEND_API_KEY) {
    console.log(`[emailService] DISABLED (no RESEND_API_KEY) — would send to ${to}: "${subject}"`);
    return { sent: false, reason: 'disabled' };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.error(`[emailService] send failed (${res.status}):`, await res.text().catch(() => ''));
      return { sent: false, reason: 'provider_error' };
    }
    return { sent: true };
  } catch (err) {
    console.error('[emailService] send error:', err.message);
    return { sent: false, reason: 'network_error' };
  }
}
