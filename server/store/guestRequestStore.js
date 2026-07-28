import jwt from 'jsonwebtoken';
import { getPool } from '../../core/db/index.js';
import { searchProperties } from './propertyStore.js';
import { findAgentById } from './agentStore.js';
import { sendEmail } from '../services/emailService.js';
import { regionLabel } from '../seo/regions.js';

const SITE_URL = process.env.SITE_URL || 'https://dealim.org';
const JWT_SECRET = process.env.JWT_SECRET || 'deal-radar-jwt-secret-change-me';
const MAX_OWNER_MATCHES = 5;

// Mirrors the 7 chips in RequestPage.jsx / web/src/data/propertyOptions.js — same cross-runtime
// boundary reason as server/seo/regions.js above.
const AMENITY_LABELS = {
  has_private_jacuzzi: "ג'קוזי",
  has_private_pool: 'בריכה',
  has_heated_pool: 'בריכה מחוממת',
  is_kid_friendly: 'מתאים לילדים',
  has_view: 'נוף',
  has_bbq: 'מנגל',
};

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// No dates given → open for 30 days (nothing to expire against). Dates given → a day after
// checkout the trip has already happened, so the request is moot regardless of whether it was
// ever filled — that's the "clean feed" requirement (11.23 §5).
function computeExpiry(checkOut) {
  const base = checkOut ? new Date(checkOut) : new Date();
  base.setDate(base.getDate() + (checkOut ? 1 : 30));
  return base.toISOString().slice(0, 19).replace('T', ' ');
}

export async function createGuestRequest(data) {
  const pool = getPool();
  const ts = nowStr();
  const expiresAt = computeExpiry(data.checkOut);
  const [result] = await pool.query(
    `INSERT INTO guest_requests
      (user_id, contact_name, contact_email, contact_phone, region, city, check_in, check_out,
       adults, children, budget_min, budget_max, amenities, kosher_level, notes,
       matched_properties_count, notified_owner_count, status, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'open', ?, ?, ?)`,
    [
      data.userId || null, data.contactName || null, data.contactEmail, data.contactPhone || null,
      data.region, data.city || null, data.checkIn || null, data.checkOut || null,
      data.adults || null, data.children || null, data.budgetMin || null, data.budgetMax || null,
      JSON.stringify(data.amenities || []), data.kosherLevel || null, data.notes || null,
      expiresAt, ts, ts,
    ]
  );
  return result.insertId;
}

/** The guest-facing "we found X" count — same searchProperties() every other search on the
 * site uses, so it's a real, live count against the actual property pool (never a made-up
 * number — see 11.23 §2). Includes both manual and auto-collected live properties, same as a
 * normal search would; matchOwnersForRequest below narrows further for the email side. */
export async function findMatchingProperties(request) {
  const guestCount = (Number(request.adults) || 0) + (Number(request.children) || 0);
  return searchProperties({
    region: request.region,
    city: request.city || undefined,
    minGuests: guestCount || undefined,
    minPrice: request.budgetMin || undefined,
    maxPrice: request.budgetMax || undefined,
    kosherLevel: request.kosherLevel || undefined,
    amenities: request.amenities || [],
    checkIn: request.checkIn || undefined,
    checkOut: request.checkOut || undefined,
    sort: 'recommended',
    limit: 40,
  });
}

function scoreMatch(request, property) {
  let score = 0;
  for (const a of request.amenities || []) if (property[a]) score += 10;
  if (request.kosherLevel && property.kosher_level === request.kosherLevel) score += 10;
  if (request.city && property.city === request.city) score += 5;
  if (request.budgetMax && property.price_from && Number(property.price_from) <= Number(request.budgetMax)) score += 3;
  return score;
}

/** Narrows the same matched-properties pool down to real, consenting owners to email — this is
 * the compliance-critical half (11.23 §3): source='manual' only (never an auto-collected/
 * unclaimed listing, which has no owner consent of any kind), agent status='approved', and
 * match_notifications_enabled=1 (the opt-out toggle, default on for a self-registered owner).
 * One property (the best-scoring) per distinct owner, top 3-5 by score. */
export async function matchOwnersForRequest(request, matchedProperties) {
  const manualMatches = matchedProperties.filter((p) => p.source === 'manual' && p.owner_id);
  if (manualMatches.length === 0) return [];

  const ownerIds = [...new Set(manualMatches.map((p) => p.owner_id))];
  const pool = getPool();
  const [agentRows] = await pool.query(
    `SELECT id FROM agents WHERE id IN (${ownerIds.map(() => '?').join(',')}) AND status = 'approved' AND match_notifications_enabled = 1`,
    ownerIds
  );
  const eligibleOwnerIds = new Set(agentRows.map((r) => r.id));

  const byOwner = new Map();
  for (const p of manualMatches) {
    if (!eligibleOwnerIds.has(p.owner_id)) continue;
    if (!byOwner.has(p.owner_id)) byOwner.set(p.owner_id, p); // first = best-ranked (searchProperties order)
  }

  const scored = [...byOwner.entries()].map(([ownerId, property]) => ({
    agentId: ownerId,
    propertyId: property.id,
    score: scoreMatch(request, property),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_OWNER_MATCHES);
}

export function signMatchUnsubToken(agentId) {
  return jwt.sign({ agentId, purpose: 'match_notifications_unsub' }, JWT_SECRET, { expiresIn: '365d' });
}

/** Throws on an invalid/expired/wrong-purpose token — callers treat that as "bad link". */
export function verifyMatchUnsubToken(token) {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.purpose !== 'match_notifications_unsub' || !payload.agentId) throw new Error('invalid token purpose');
  return payload.agentId;
}

function buildOwnerMatchEmailHtml(request, unsubToken) {
  const guestCount = (request.adults || 0) + (request.children || 0);
  const parts = [];
  if (request.check_in && request.check_out) {
    parts.push(`${new Date(request.check_in).toLocaleDateString('he-IL')} – ${new Date(request.check_out).toLocaleDateString('he-IL')}`);
  }
  if (guestCount) parts.push(`${guestCount} אורחים`);
  if (request.budget_max) parts.push(`תקציב עד ${Math.round(request.budget_max)} ₪`);
  else if (request.budget_min) parts.push(`תקציב מ-${Math.round(request.budget_min)} ₪`);
  const amenities = (typeof request.amenities === 'string' ? JSON.parse(request.amenities || '[]') : request.amenities || [])
    .map((a) => AMENITY_LABELS[a]).filter(Boolean);
  if (amenities.length) parts.push(amenities.join(', '));
  if (request.notes) parts.push(`"${request.notes}"`);

  return `
    <p>שלום,</p>
    <p>יש אורח שמחפש בדיוק צימר כמו שלך — <strong>${regionLabel(request.region)}${request.city ? `, ${request.city}` : ''}</strong>.</p>
    <p>${parts.join(' · ')}</p>
    <p><a href="${SITE_URL}/owner/dashboard?tab=matches">רוצה לשלוח הצעה? לחצו כאן לצפייה בבקשה המלאה</a></p>
    <hr style="border:none;border-top:1px solid #eee;margin:16px 0">
    <p style="color:#7A6C5B;font-size:13px">
      נשלח מ-Dealim (dealim.org) — פלטפורמת צימרים ווילות בישראל.<br>
      <a href="${SITE_URL}/api/requests/unsubscribe?token=${unsubToken}">לא לקבל התראות התאמה נוספות — לחץ כאן</a>
    </p>
  `;
}

/** Records match rows (INSERT IGNORE — idempotent, matters if this were ever re-run) and emails
 * each matched owner, capped by MAX_OWNER_MATCHES already applied upstream in
 * matchOwnersForRequest. Never throws — a failed/unconfigured email must not fail the guest's
 * request submission (same "best-effort, log and move on" contract as emailService.js itself). */
export async function recordMatchesAndNotify(requestId, request, matches) {
  const pool = getPool();
  const ts = nowStr();
  for (const { agentId, propertyId, score } of matches) {
    try {
      await pool.query(
        'INSERT IGNORE INTO guest_request_matches (request_id, agent_id, property_id, match_score, notified_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [requestId, agentId, propertyId, score, ts, ts]
      );
      const agent = await findAgentById(agentId);
      if (!agent) continue;
      const unsubToken = signMatchUnsubToken(agentId);
      await sendEmail(agent.email, 'יש אורח שמחפש בדיוק צימר כמו שלך — Dealim', buildOwnerMatchEmailHtml(request, unsubToken));
    } catch (err) {
      console.error(`[guestRequestStore] notify failed for agent ${agentId}:`, err.message);
    }
  }
  await pool.query('UPDATE guest_requests SET notified_owner_count = ? WHERE id = ?', [matches.length, requestId]);
}

export async function setMatchedPropertiesCount(requestId, count) {
  const pool = getPool();
  await pool.query('UPDATE guest_requests SET matched_properties_count = ? WHERE id = ?', [count, requestId]);
}

export async function getGuestRequestById(id) {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM guest_requests WHERE id = ?', [id]);
  return rows[0] || null;
}

export async function listRequestsForUser(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT gr.*,
       (SELECT COUNT(*) FROM guest_request_offers gro WHERE gro.request_id = gr.id) AS offer_count
     FROM guest_requests gr WHERE gr.user_id = ? ORDER BY gr.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function closeGuestRequest(id, userId) {
  const pool = getPool();
  const [result] = await pool.query(
    "UPDATE guest_requests SET status = 'closed', updated_at = ? WHERE id = ? AND user_id = ?",
    [nowStr(), id, userId]
  );
  return result.affectedRows > 0;
}

// 11.23 §5 — expiry is enforced primarily by filtering expires_at at read time everywhere
// "open" requests are listed (see listOpenMatchesForAgent below); this opportunistic sweep just
// keeps the `status` column itself accurate for "הבקשות שלי" ("closed automatically") without a
// separate cron/interval — called at the top of the two read paths that matter (owner feed,
// traveler's own request list).
export async function closeExpiredRequests() {
  const pool = getPool();
  await pool.query("UPDATE guest_requests SET status = 'closed' WHERE status = 'open' AND expires_at <= NOW()");
}

export async function listOffersForRequest(requestId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT gro.*, a.business_name, a.contact_name, a.phone, a.whatsapp_number, a.logo_url, a.slug,
       p.name AS property_name
     FROM guest_request_offers gro
     JOIN agents a ON a.id = gro.agent_id
     JOIN properties p ON p.id = gro.property_id
     WHERE gro.request_id = ? ORDER BY gro.created_at ASC`,
    [requestId]
  );
  return rows;
}

/** Owner's dashboard feed ("בקשות שמתאימות לי") — every open, non-expired request this owner
 * was actually matched to (guest_request_matches is the source of truth for "matched", not a
 * live re-query — an owner sees the same request set that triggered their email, no surprises).
 * Excludes requests this owner already sent an offer for. */
export async function listOpenMatchesForAgent(agentId) {
  await closeExpiredRequests();
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT gr.*, grm.property_id AS matched_property_id, grm.match_score
     FROM guest_request_matches grm
     JOIN guest_requests gr ON gr.id = grm.request_id
     WHERE grm.agent_id = ? AND gr.status = 'open' AND gr.expires_at > NOW()
       AND NOT EXISTS (SELECT 1 FROM guest_request_offers gro WHERE gro.request_id = gr.id AND gro.agent_id = grm.agent_id)
     ORDER BY grm.match_score DESC, gr.created_at DESC`,
    [agentId]
  );
  return rows;
}

/** Guards against an owner offering on a request they were never matched to (guest_request_matches
 * is the allowlist) — this is also what confirms the property they're offering with is theirs. */
export async function isAgentMatchedToRequest(agentId, requestId) {
  const pool = getPool();
  const [rows] = await pool.query(
    'SELECT 1 FROM guest_request_matches WHERE agent_id = ? AND request_id = ? LIMIT 1',
    [agentId, requestId]
  );
  return rows.length > 0;
}

export async function createOffer({ requestId, agentId, propertyId, price, message }) {
  const pool = getPool();
  const ts = nowStr();
  await pool.query(
    `INSERT INTO guest_request_offers (request_id, agent_id, property_id, price, message, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE price = VALUES(price), message = VALUES(message)`,
    [requestId, agentId, propertyId, price || null, message || null, ts]
  );
}
