import { sendEmail } from './emailService.js';

const SITE_URL = process.env.SITE_URL || 'https://dealim.org';
const CURRENCY_SYMBOLS = { ILS: '₪', USD: '$', EUR: '€' };

function currencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency || '₪';
}

function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(1, Math.round(ms / (24 * 60 * 60 * 1000)));
}

function unitLabel(unit) {
  return unit?.name || 'הנכס';
}

// ── 7.5: "אישור גם במייל ללקוח" — fires for every booking request regardless of claimed/unclaimed ──

export async function notifyCustomerBookingReceived({ property, unit, booking }) {
  if (!booking.customer_email) return { sent: false, reason: 'no_email' };
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const html = `
    <p>שלום ${booking.customer_name},</p>
    <p>בקשתך להזמנת <strong>${unitLabel(unit)}</strong> ב-${property.name} התקבלה. בעל הנכס יחזור אליך לאישור ההזמנה.</p>
    <p><strong>מספר בקשה:</strong> #${booking.id}<br/>
       <strong>תאריכים:</strong> ${booking.check_in} – ${booking.check_out} (${nights} לילות)<br/>
       <strong>אורחים:</strong> ${booking.guest_count}</p>
    <p><a href="${SITE_URL}/property/${property.id}">לצפייה בנכס</a></p>
  `;
  return sendEmail(booking.customer_email, `בקשת ההזמנה שלך ל-${property.name} התקבלה`, html);
}

// ── 7.5: claimed/active property (has owner_id) — immediate, not gated by PROPERTY_MESSAGING_ENABLED ──

export async function notifyOwnerNewBooking({ owner, property, unit, booking }) {
  if (!owner?.email) return { sent: false, reason: 'no_email' };
  const nights = nightsBetween(booking.check_in, booking.check_out);
  const html = `
    <p>שלום ${owner.contact_name || owner.business_name},</p>
    <p>התקבלה בקשת הזמנה חדשה עבור <strong>${unitLabel(unit)}</strong> ב-${property.name}.</p>
    <p><strong>תאריכים:</strong> ${booking.check_in} – ${booking.check_out} (${nights} לילות)<br/>
       <strong>אורחים:</strong> ${booking.guest_count}<br/>
       <strong>שם הפונה:</strong> ${booking.customer_name}<br/>
       <strong>טלפון:</strong> ${booking.customer_phone}
       ${booking.customer_email ? `<br/><strong>אימייל:</strong> ${booking.customer_email}` : ''}
       ${booking.message ? `<br/><strong>הודעה:</strong> ${booking.message}` : ''}</p>
    <p><a href="${SITE_URL}/owner/dashboard/bookings">לצפייה בכל בקשות ההזמנה</a></p>
  `;
  return sendEmail(owner.email, `בקשת הזמנה חדשה — ${property.name}`, html);
}

const STATUS_LABELS = { approved: 'אושרה', rejected: 'נדחתה' };

// ── 7.5: "שינוי סטטוס שולח מייל ללקוח" ──

export async function notifyCustomerStatusChanged({ property, unit, booking, status }) {
  if (!booking.customer_email) return { sent: false, reason: 'no_email' };
  const label = STATUS_LABELS[status] || status;
  const approvedNote = status === 'approved'
    ? '<p>בעל הנכס יצור איתך קשר בקרוב לתיאום הפרטים הסופיים.</p>'
    : '<p>מוזמנים לחפש נכסים נוספים באתר.</p>';
  const html = `
    <p>שלום ${booking.customer_name},</p>
    <p>בקשת ההזמנה שלך (#${booking.id}) ל-<strong>${unitLabel(unit)}</strong> ב-${property.name} <strong>${label}</strong>.</p>
    <p><strong>תאריכים:</strong> ${booking.check_in} – ${booking.check_out}</p>
    ${approvedNote}
  `;
  return sendEmail(booking.customer_email, `בקשת ההזמנה שלך ${label} — ${property.name}`, html);
}

export function estimateBookingPrice({ unit, currency, checkIn, checkOut }) {
  if (!unit?.base_price_night) return null;
  const nights = nightsBetween(checkIn, checkOut);
  let total = 0;
  const d = new Date(checkIn);
  for (let i = 0; i < nights; i++) {
    const dayOfWeek = d.getUTCDay(); // 5=Friday, 6=Saturday — treated as weekend pricing
    const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
    total += (isWeekend && unit.weekend_price) ? Number(unit.weekend_price) : Number(unit.base_price_night);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return { nights, total, currencySymbol: currencySymbol(currency) };
}
