/** 10.4: direct-contact links (WhatsApp/call) replacing the booking-request flow — a guest
 * messages or calls the owner directly instead of submitting a form. Shared by the property
 * page (property + per-unit) and the units table. */

function normalizeIsraeliPhone(phone) {
  let clean = (phone || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 10) clean = '972' + clean.slice(1);
  return clean;
}

/** Builds the WhatsApp deep link with a pre-filled message: property name, unit name (if this
 * is a specific unit in a multi-unit property), the page link, and check-in/out dates if the
 * guest picked any (currently no date-picker remains on the property page after 10.4 removed
 * the booking form, but this stays date-aware in case a future surface passes dates in). */
export function buildPropertyWhatsAppUrl({ whatsapp, phone, propertyName, unitName, pageUrl, checkIn, checkOut, t }) {
  const number = normalizeIsraeliPhone(whatsapp || phone);
  if (!number) return null;
  const parts = [t.contactWhatsAppGreeting(unitName ? `${propertyName} — ${unitName}` : propertyName)];
  if (checkIn && checkOut) parts.push(t.contactWhatsAppDates(checkIn, checkOut));
  if (pageUrl) parts.push(pageUrl);
  return `https://wa.me/${number}?text=${encodeURIComponent(parts.join('\n'))}`;
}

export function buildTelUrl(phone) {
  const clean = (phone || '').replace(/[^0-9+]/g, '');
  return clean ? `tel:${clean}` : null;
}
