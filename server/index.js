import 'dotenv/config';
import { createApp } from './app.js';
import { initializeSources } from '../sources/index.js';
import { initializeDistribution } from '../distribution/index.js';
import { DealPipeline } from './services/dealPipeline.js';
import { connectWithRetry } from '../core/db/index.js';

const PORT = process.env.PORT || 3001;

/**
 * רשימת ברירת מחדל של ~40 מסלולים פופולריים מ-TLV (אירופה, יעדי נופש, מזרח רחוק) — משמשת
 * רק אם WATCHED_ROUTES לא הוגדר בסביבה, כדי שהסריקה תתחיל "out of the box" בלי תצורה נוספת.
 * הערה: כמה קודים שהתבקשו במקור הוחלפו לקוד IATA תקין כשהיו קודי עיר/טעות (MIL->MXP,
 * LON->LHR, GOA->GOI), וכפילות אחת (ATH) הוסרה.
 *
 * Default fallback route list (~40 popular TLV destinations) used only when WATCHED_ROUTES
 * isn't set, so scanning starts without extra configuration.
 */
const DEFAULT_WATCHED_ROUTES =
  'TLV-BCN,TLV-FCO,TLV-ATH,TLV-MXP,TLV-PRG,TLV-BUD,TLV-LIS,TLV-CDG,TLV-AMS,TLV-BER,' +
  'TLV-VIE,TLV-IST,TLV-DXB,TLV-BKK,TLV-PMI,TLV-RHO,TLV-HER,TLV-LCA,TLV-TBS,TLV-BUS,' +
  'TLV-SOF,TLV-KRK,TLV-WAW,TLV-NAP,TLV-VCE,TLV-MAD,TLV-LHR,TLV-SKG,TLV-TIA,TLV-BEG,' +
  'TLV-ZAG,TLV-SPU,TLV-OTP,TLV-EVN,TLV-BOM,TLV-GOI,TLV-CMB,TLV-MLE,TLV-ZNZ';

/** מפענח את משתנה הסביבה WATCHED_ROUTES (פורמט: "TLV-BCN,TLV-FCO") לרשימת מסלולים לסריקה */
function parseWatchedRoutes(env = process.env) {
  const raw = env.WATCHED_ROUTES || DEFAULT_WATCHED_ROUTES;
  const daysAhead = Number(env.SCAN_DATE_OFFSET_DAYS || 30);
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

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

async function main() {
  const app = createApp();

  // מתחבר ל-MySQL ברקע, עם retry+backoff — בכוונה לא חוסם את app.listen() למטה.
  // כך השרת עולה ומגיש /health ו-/api גם אם ה-DB עוד לא מוכן (למשל מכל MySQL שעדיין מתאתחל
  // בעלייה הראשונה ב-Railway); כל שאילתה בודדת מטופלת בנפרד ומחזירה fallback בטוח אם נכשלת.
  // Connects to MySQL in the background with retry+backoff — deliberately NOT awaited before
  // app.listen() below, so the HTTP server stays up even while the DB is still warming up.
  connectWithRetry().catch((err) => {
    console.error('[deal-radar-pro] Giving up on MySQL connection:', err.message);
  });

  const sourceRegistry = initializeSources();
  const distributionManager = initializeDistribution();
  const whatsappRecipients = (process.env.WHATSAPP_RECIPIENTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // השהיה בין מסלול למסלול בסריקה כדי לא לעבור את מכסת ה-rate-limit של מקורות כמו Travelpayouts
  const scanRequestDelayMs = Number(process.env.SCAN_REQUEST_DELAY_MS || 1500);
  const pipeline = new DealPipeline({ sourceRegistry, distributionManager, whatsappRecipients, scanRequestDelayMs });
  const watchedRoutes = parseWatchedRoutes();

  if (sourceRegistry.listSources().length === 0) {
    console.warn(
      '[deal-radar-pro] No flight sources configured (missing AMADEUS_API_KEY/AMADEUS_API_SECRET or ' +
        'TRAVELPAYOUTS_API_TOKEN/TRAVELPAYOUTS_MARKER) — scanning is disabled.'
    );
  } else if (watchedRoutes.length === 0) {
    console.warn('[deal-radar-pro] No WATCHED_ROUTES configured — scanning is disabled.');
  } else {
    const intervalMinutes = Number(process.env.SCAN_INTERVAL_MINUTES || 60);
    console.log(
      `[deal-radar-pro] Scanning ${watchedRoutes.length} routes every ${intervalMinutes}m ` +
        `(${scanRequestDelayMs}ms delay between requests).`
    );
    const runScan = () => {
      pipeline.runScan(watchedRoutes).catch((err) => console.error('[deal-radar-pro] Scan failed:', err.message));
    };
    runScan();
    setInterval(runScan, intervalMinutes * 60 * 1000);
  }

  app.listen(PORT, () => {
    console.log(`[deal-radar-pro] Server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[deal-radar-pro] Fatal startup error:', err);
  process.exit(1);
});
