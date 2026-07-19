/**
 * Hard-coded scan boundary for the future collection engine (Step 3 — not built yet).
 * These are OTA/listing-platform/social domains the engine must refuse to scan at the code
 * level, per the compliance layer (Step 5.5): "המנוע סורק אך ורק אתרים עצמאיים של בעלי נכסים."
 * Enforced in code, not just as a guideline — isDomainBlocked() below checks this list before
 * the DB blocklist table, so it can never be bypassed by deleting a row.
 */
export const HARD_BLOCKED_DOMAINS = [
  // Global OTAs / booking platforms
  'booking.com', 'airbnb.com', 'airbnb.co.il', 'expedia.com', 'hotels.com', 'agoda.com',
  'tripadvisor.com', 'vrbo.com', 'homeaway.com', 'trivago.com', 'hostelworld.com',
  // Israeli zimmer/vacation listing portals
  'zimmer.co.il', 'weekend.co.il', 'lametayel.co.il', 'zimmerim.co.il', 'tzimmer.co.il',
  'inisrael.com', 'holidayil.co.il', 'israelhotels.org.il',
  // Social / ad platforms
  'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'linkedin.com',
  'pinterest.com', 'youtube.com',
];

/** Bare-domain check (no protocol/path) — callers should normalize first via normalizeDomain(). */
export function isHardBlockedDomain(domain) {
  if (!domain) return false;
  const d = domain.toLowerCase().replace(/^www\./, '');
  return HARD_BLOCKED_DOMAINS.some((blocked) => d === blocked || d.endsWith(`.${blocked}`));
}
