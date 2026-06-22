import 'dotenv/config';
import { createApp } from './app.js';
import { initializeSources } from '../sources/index.js';
import { initializeDistribution } from '../distribution/index.js';
import { DealPipeline } from './services/dealPipeline.js';
import { connectWithRetry } from '../core/db/index.js';
import { parseWatchedRoutes } from '../core/watchedRoutes.js';
import { refreshPopularPackages } from '../core/packages/packageEngine.js';
import { buildPackageDeps } from '../core/packages/packageDeps.js';

const POPULAR_PACKAGES_INTERVAL_MINUTES = 30;

const PORT = process.env.PORT || 3001;

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
  // הנחת אורך חופשה לחיפוש הלוך-חזור (תצוגה בלבד, ב-"Best Live Prices") — ראו אזהרה למטה
  const returnTripDays = Number(process.env.SCAN_RETURN_TRIP_DAYS || 7);
  const pipeline = new DealPipeline({
    sourceRegistry,
    distributionManager,
    whatsappRecipients,
    scanRequestDelayMs,
    returnTripDays,
  });
  const watchedRoutes = parseWatchedRoutes();

  if (sourceRegistry.listSources().length === 0) {
    console.warn(
      '[deal-radar-pro] No flight sources configured (missing AMADEUS_API_KEY/AMADEUS_API_SECRET or ' +
        'TRAVELPAYOUTS_API_TOKEN/TRAVELPAYOUTS_MARKER) — scanning is disabled.'
    );
  } else if (watchedRoutes.length === 0) {
    console.warn('[deal-radar-pro] No WATCHED_ROUTES configured — scanning is disabled.');
  } else {
    const intervalMinutes = Number(process.env.SCAN_INTERVAL_MINUTES || 15);
    // כל מסלול עושה כעת 2 קריאות API (one-way + round-trip enrichment) — סריקה תכופה על ~40
    // מסלולים יכולה לצרוך מכסה גדולה. מזהירים בלוג כדי שזה לא יתפוס בהפתעה.
    const estimatedCallsPerHour = Math.round((watchedRoutes.length * 2 * 60) / intervalMinutes);
    console.log(
      `[deal-radar-pro] Scanning ${watchedRoutes.length} routes every ${intervalMinutes}m ` +
        `(${scanRequestDelayMs}ms delay between requests, ~${estimatedCallsPerHour} API calls/hour).`
    );
    if (intervalMinutes <= 10) {
      console.warn(
        `[deal-radar-pro] ⚠️ SCAN_INTERVAL_MINUTES=${intervalMinutes} is aggressive — ~${estimatedCallsPerHour} ` +
          'Travelpayouts calls/hour. If you see frequent 429s, raise SCAN_INTERVAL_MINUTES.'
      );
    }
    const runScan = () => {
      pipeline.runScan(watchedRoutes).catch((err) => console.error('[deal-radar-pro] Scan failed:', err.message));
    };
    runScan();
    setInterval(runScan, intervalMinutes * 60 * 1000);
  }

  // "דילים פופולריים היום" (חבילות טיסה+מלון) — מתעדכנים כל 30 דק', זמינים למשתמש שלא ענה
  // שאלון. אם Travelpayouts לא מוגדר, ה-engine מדלג בעדינות (לא ממציא נתונים).
  const packageDeps = buildPackageDeps(sourceRegistry);
  if (packageDeps.travelpayoutsAdapter) {
    const runPackageRefresh = () => {
      refreshPopularPackages(packageDeps).catch((err) =>
        console.error('[deal-radar-pro] Popular package refresh failed:', err.message)
      );
    };
    runPackageRefresh();
    setInterval(runPackageRefresh, POPULAR_PACKAGES_INTERVAL_MINUTES * 60 * 1000);
  } else {
    console.warn('[deal-radar-pro] Travelpayouts not configured — popular package generation is disabled.');
  }

  // אישור מפורש בלוג אם UNSPLASH_ACCESS_KEY הגיע לשרת — הדרך הכי ישירה לבדוק ב-Railway אם
  // ה-Variable שהגדרתם בכלל "נתפס" (ולא רק נשמר ב-UI בלי שה-deploy הריץ אותו).
  if (process.env.UNSPLASH_ACCESS_KEY) {
    console.log('[deal-radar-pro] UNSPLASH_ACCESS_KEY is set — destination photos enabled.');
  } else {
    console.warn(
      '[deal-radar-pro] UNSPLASH_ACCESS_KEY is NOT set — destination cards will show the gradient ' +
        'placeholder instead of a real photo. Set it in Railway Variables and redeploy if you want photos.'
    );
  }

  app.listen(PORT, () => {
    console.log(`[deal-radar-pro] Server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[deal-radar-pro] Fatal startup error:', err);
  process.exit(1);
});
