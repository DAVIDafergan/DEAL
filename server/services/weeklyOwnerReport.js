import { getPool } from '../../core/db/index.js';
import { listPropertiesByOwner } from '../store/propertyStore.js';
import { sendEmail } from './emailService.js';

const SITE_URL = process.env.SITE_URL || 'https://dealim.org';

function fmt(d) {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function eventTotalsForOwner(ownerId, fromStr, toStr) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT
       SUM(CASE WHEN pe.event_type = 'view' THEN 1 ELSE 0 END) AS views,
       SUM(CASE WHEN pe.event_type = 'whatsapp_click' THEN 1 ELSE 0 END) AS whatsapp_clicks,
       SUM(CASE WHEN pe.event_type = 'call_click' THEN 1 ELSE 0 END) AS call_clicks
     FROM property_events pe JOIN properties p ON p.id = pe.property_id
     WHERE p.owner_id = ? AND pe.created_at >= ? AND pe.created_at < ?`,
    [ownerId, fromStr, toStr]
  );
  return { views: Number(row.views) || 0, whatsappClicks: Number(row.whatsapp_clicks) || 0, callClicks: Number(row.call_clicks) || 0 };
}

function pctChange(curr, prev) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
}

function changeArrow(pct) {
  if (pct > 0) return `▲ ${pct}%`;
  if (pct < 0) return `▼ ${Math.abs(pct)}%`;
  return '— 0%';
}

/** One simple, honest heuristic at a time (not a ranked list) — cheap to compute, and an owner
 * acting on one concrete suggestion per week beats a wall of generic tips they skim past. */
function suggestImprovement(current, properties) {
  if (current.views === 0) {
    return 'הנכסים שלכם לא נצפו השבוע — ודאו שיש תמונות איכותיות ותיאור מפורט, זה מה שקובע אם נכס מופיע בתוצאות חיפוש רלוונטיות.';
  }
  const noPriceCount = properties.filter((p) => !p.price_from && !p.base_price_night).length;
  if (noPriceCount > 0) {
    return `${noPriceCount} מהנכסים שלכם עדיין בלי מחיר מוגדר — נכסים עם מחיר ברור מקבלים משמעותית יותר פניות.`;
  }
  if (current.whatsappClicks === 0 && current.views >= 5) {
    return 'הנכס נצפה אך לא קיבל פניה בוואטסאפ השבוע — ודאו שמספר הוואטסאפ מעודכן ובולט בעמוד הנכס.';
  }
  return 'המשיכו לעדכן את לוח הזמינות באופן שוטף — נכסים מעודכנים מקודמים אוטומטית בתוצאות החיפוש.';
}

function buildReportHtml(owner, current, previous, properties) {
  return `
    <p>שלום ${owner.contact_name || owner.business_name},</p>
    <p>הנה סיכום השבוע האחרון עבור ${properties.length} הנכסים שלכם ב-Dealim:</p>
    <table style="border-collapse:collapse;width:100%;max-width:420px">
      <tr><td style="padding:6px 10px;color:#7A6C5B">צפיות</td><td style="padding:6px 10px;font-weight:700">${current.views}</td><td style="padding:6px 10px;color:${current.views >= previous.views ? '#5B6B4E' : '#8C2F39'}">${changeArrow(pctChange(current.views, previous.views))}</td></tr>
      <tr><td style="padding:6px 10px;color:#7A6C5B">קליקים לוואטסאפ</td><td style="padding:6px 10px;font-weight:700">${current.whatsappClicks}</td><td style="padding:6px 10px;color:${current.whatsappClicks >= previous.whatsappClicks ? '#5B6B4E' : '#8C2F39'}">${changeArrow(pctChange(current.whatsappClicks, previous.whatsappClicks))}</td></tr>
      <tr><td style="padding:6px 10px;color:#7A6C5B">קליקים לחיוג</td><td style="padding:6px 10px;font-weight:700">${current.callClicks}</td><td style="padding:6px 10px;color:${current.callClicks >= previous.callClicks ? '#5B6B4E' : '#8C2F39'}">${changeArrow(pctChange(current.callClicks, previous.callClicks))}</td></tr>
    </table>
    <p style="background:#FAF6EF;padding:12px 16px;border-radius:10px;margin-top:16px"><strong>💡 המלצה לשיפור:</strong> ${suggestImprovement(current, properties)}</p>
    <p><a href="${SITE_URL}/owner/dashboard">לניהול הנכסים שלי</a></p>
  `;
}

/** Sends each owner (account_type='property_owner') a weekly views/clicks digest, at most once
 * every 7 days per owner — driven by `last_weekly_report_sent_at`, not a fixed cron day, so a
 * server restart or an irregular check interval can never double-send or skip an owner. */
export async function sendWeeklyOwnerReports() {
  const pool = getPool();
  const cutoff = fmt(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [owners] = await pool.query(
    `SELECT * FROM agents WHERE account_type = 'property_owner'
       AND (last_weekly_report_sent_at IS NULL OR last_weekly_report_sent_at <= ?)`,
    [cutoff]
  );

  let emailsSent = 0;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  for (const owner of owners) {
    try {
      const properties = await listPropertiesByOwner(owner.id);
      if (properties.length === 0) continue; // nothing to report yet — re-checked next sweep
      const [current, previous] = await Promise.all([
        eventTotalsForOwner(owner.id, fmt(weekAgo), fmt(now)),
        eventTotalsForOwner(owner.id, fmt(twoWeeksAgo), fmt(weekAgo)),
      ]);
      const result = await sendEmail(owner.email, 'הדוח השבועי שלך ב-Dealim', buildReportHtml(owner, current, previous, properties));
      if (result.sent) emailsSent += 1;
      await pool.query('UPDATE agents SET last_weekly_report_sent_at = ? WHERE id = ?', [fmt(now), owner.id]);
    } catch (err) {
      console.error(`[weeklyOwnerReport] failed for owner ${owner.id}:`, err.message);
    }
  }
  return { ownersChecked: owners.length, emailsSent };
}
