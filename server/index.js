import 'dotenv/config';
import { createApp } from './app.js';
import { connectWithRetry } from '../core/db/index.js';
import { sendPendingReminders } from './services/complianceMessaging.js';
import { checkPropertyAlerts } from './store/alertStore.js';
import { sendWeeklyOwnerReports } from './services/weeklyOwnerReport.js';

// Flight world retired (see README): the scanner (sources/, DealPipeline, distribution/),
// popular-package refresh (core/packages/packageEngine.js), and vibe-feed refresh
// (core/vibes/vibeFeedEngine.js) all wrote to tables that are now `_legacy` (deals, packages,
// vibe_feed_cards, price_history). None of that code is deleted — it's just not invoked below
// anymore, so nothing tries to write to a renamed table. See core/db/index.js MIGRATIONS.

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

  // Flight scanning, popular-package refresh, and vibe-feed refresh are retired — see the
  // module-level comment above. sources/, distribution/, DealPipeline, packageEngine, and
  // vibeFeedEngine are all still in the repo, untouched, just not started here anymore.
  console.log('[deal-radar-pro] Flight world retired — scanning, package refresh, and vibe feed refresh are disabled.');

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

  // בדיקה יומית לתזכורות בקשת-הזמנה ממתינות (מקסימום תזכורת אחת, ראו complianceMessaging.js).
  // רץ גם כש-PROPERTY_MESSAGING_ENABLED כבוי — במצב הזה הוא רק רושם ללוג מה היה נשלח, לא שולח.
  setInterval(async () => {
    try {
      await sendPendingReminders();
    } catch (err) {
      console.error('[deal-radar-pro] Booking reminder check failed:', err.message);
    }
  }, 24 * 60 * 60 * 1000);

  // ניקוי יומי של דילי סוכנים שפג תוקפם (expires_at < היום) — מסיר אותם מהפיד
  setInterval(async () => {
    try {
      const { getPool } = await import('../core/db/index.js');
      const today = new Date().toISOString().slice(0, 10);
      const [result] = await getPool().query(
        "UPDATE agent_deals SET status='rejected', rejection_reason='Expired' WHERE expires_at IS NOT NULL AND expires_at < ? AND status='approved'",
        [today]
      );
      if (result.affectedRows > 0) {
        console.log(`[deal-radar-pro] Expired ${result.affectedRows} agent deal(s) past their expires_at date.`);
      }
    } catch (err) {
      console.error('[deal-radar-pro] Agent deal expiry check failed:', err.message);
    }
  }, 24 * 60 * 60 * 1000);

  // 11.14 — "notify me" alerts: hourly sweep for newly-matching properties (see alertStore.js;
  // dedup against last_seen_property_ids means an hourly cadence never double-emails).
  setInterval(async () => {
    try {
      const result = await checkPropertyAlerts();
      if (result.emailsSent > 0) {
        console.log(`[deal-radar-pro] Property alerts: checked ${result.alertsChecked}, sent ${result.emailsSent} email(s).`);
      }
    } catch (err) {
      console.error('[deal-radar-pro] Property alert check failed:', err.message);
    }
  }, 60 * 60 * 1000);

  // 11.13 — weekly owner report: checked daily, but each owner is only actually emailed once
  // every 7 days (last_weekly_report_sent_at) — see weeklyOwnerReport.js.
  setInterval(async () => {
    try {
      const result = await sendWeeklyOwnerReports();
      if (result.emailsSent > 0) {
        console.log(`[deal-radar-pro] Weekly owner reports: checked ${result.ownersChecked}, sent ${result.emailsSent} email(s).`);
      }
    } catch (err) {
      console.error('[deal-radar-pro] Weekly owner report check failed:', err.message);
    }
  }, 24 * 60 * 60 * 1000);

  // Admin credentials — logged at startup so Railway logs reveal exactly what to type
  {
    const u = process.env.ADMIN_USERNAME;
    const p = process.env.ADMIN_PASSWORD;
    console.log('[deal-radar-pro] Admin login credentials:', {
      username: u ? `[env var set, ${u.trim().length} chars]` : '"admin" ← ADMIN_USERNAME not set, using fallback',
      password: p ? `[env var set, ${p.trim().length} chars]` : '"admin-change-me" ← ADMIN_PASSWORD not set, using fallback',
    });
  }

  app.listen(PORT, () => {
    console.log(`[deal-radar-pro] Server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[deal-radar-pro] Fatal startup error:', err);
  process.exit(1);
});
