// 11.13 — iCal sync for a unit's availability calendar. No external ical dependency: export only
// ever needs to emit VEVENT/DTSTART pairs (trivial to generate by hand), and import only ever
// needs to read them back out of someone else's export (Airbnb/Booking calendar links all use
// the same plain all-day-VEVENT-per-blocked-date shape) — a full RFC5545 parser would cover
// recurrence rules, timezones, etc. that no real rental-calendar export actually uses.

function toIcsDate(date) {
  return date.replace(/-/g, ''); // 'YYYY-MM-DD' -> 'YYYYMMDD' (all-day VALUE=DATE format)
}

function fold(line) {
  // RFC5545 §3.1: lines >75 octets should be folded, but nothing we generate gets close to that
  // — every field here is a short date or fixed label, so this is a no-op safety net, not real logic.
  return line;
}

/** Builds a VCALENDAR feed of this unit's blocked (is_available=0) dates as individual all-day
 * VEVENTs — the same shape Airbnb/Booking export, so any calendar app can subscribe to it. */
export function buildIcsFeed(unitName, blockedDates) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dealim//iCal Export//HE',
    'CALSCALE:GREGORIAN',
  ];
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  for (const date of blockedDates) {
    const start = toIcsDate(date);
    const end = toIcsDate(new Date(new Date(date).getTime() + 86400000).toISOString().slice(0, 10));
    lines.push(
      'BEGIN:VEVENT',
      `UID:${date}-${unitName ? unitName.replace(/[^a-zA-Z0-9]/g, '') : 'unit'}@dealim.org`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:תפוס`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Parses an external .ics feed's VEVENTs into a flat list of individual blocked dates
 * ('YYYY-MM-DD'), expanding each [DTSTART, DTEND) range day by day. DTSTART-only events (no
 * DTEND) are treated as a single-day block. Skips events it can't confidently parse rather than
 * guessing — a missed block (owner double-checks manually) is far safer than wrongly opening up
 * a date that's actually booked elsewhere. */
export function parseIcsFeed(icsText) {
  const blockedDates = new Set();
  const veventBlocks = icsText.split('BEGIN:VEVENT').slice(1);
  for (const block of veventBlocks) {
    const dtstartMatch = block.match(/DTSTART[^:]*:(\d{8})/);
    if (!dtstartMatch) continue;
    const dtendMatch = block.match(/DTEND[^:]*:(\d{8})/);
    const start = dtstartMatch[1];
    const startDate = `${start.slice(0, 4)}-${start.slice(4, 6)}-${start.slice(6, 8)}`;
    let endDate = startDate;
    if (dtendMatch) {
      const end = dtendMatch[1];
      endDate = `${end.slice(0, 4)}-${end.slice(4, 6)}-${end.slice(6, 8)}`;
    }
    const d = new Date(startDate);
    const endD = new Date(endDate);
    let guard = 0;
    while (d < endD && guard < 730) { // DTEND is exclusive per RFC5545; 2-year cap against a malformed feed
      blockedDates.add(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
      guard += 1;
    }
    if (d.getTime() === endD.getTime() && startDate === endDate) blockedDates.add(startDate); // single-day, no DTEND
  }
  return [...blockedDates].sort();
}
