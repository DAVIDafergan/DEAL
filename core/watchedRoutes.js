/**
 * רשימת ברירת מחדל של ~40 מסלולים פופולריים מ-TLV (אירופה, יעדי נופש, מזרח רחוק) — משמשת
 * רק אם WATCHED_ROUTES לא הוגדר בסביבה, כדי שהסריקה תתחיל "out of the box" בלי תצורה נוספת.
 * משותף בין server/index.js (הסריקה) ל-core/packages (מנוע החבילות) — מקור אחד לרשימת היעדים.
 *
 * Default fallback route list (~40 popular TLV destinations), shared between the scanner and
 * the package engine so there's one source of truth for "which destinations do we cover".
 */
export const DEFAULT_WATCHED_ROUTES =
  'TLV-BCN,TLV-FCO,TLV-ATH,TLV-MXP,TLV-PRG,TLV-BUD,TLV-LIS,TLV-CDG,TLV-AMS,TLV-BER,' +
  'TLV-VIE,TLV-IST,TLV-DXB,TLV-BKK,TLV-PMI,TLV-RHO,TLV-HER,TLV-LCA,TLV-TBS,TLV-BUS,' +
  'TLV-SOF,TLV-KRK,TLV-WAW,TLV-NAP,TLV-VCE,TLV-MAD,TLV-LHR,TLV-SKG,TLV-TIA,TLV-BEG,' +
  'TLV-ZAG,TLV-SPU,TLV-OTP,TLV-EVN,TLV-BOM,TLV-GOI,TLV-CMB,TLV-MLE,TLV-ZNZ';

/** מפענח את משתנה הסביבה WATCHED_ROUTES (פורמט: "TLV-BCN,TLV-FCO") לרשימת מסלולים לסריקה */
export function parseWatchedRoutes(env = process.env, dateOverride) {
  const raw = env.WATCHED_ROUTES || DEFAULT_WATCHED_ROUTES;
  const daysAhead = Number(env.SCAN_DATE_OFFSET_DAYS || 30);
  const date = dateOverride || new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return raw
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [origin, destination] = pair.split('-');
      return { origin, destination, date };
    })
    .filter((r) => r.origin && r.destination);
}

/** רשימת קודי היעד הייחודיים (בלי כפילויות) שמכוסים על ידי WATCHED_ROUTES */
export function getWatchedDestinations(env = process.env) {
  return [...new Set(parseWatchedRoutes(env).map((r) => r.destination))];
}
