import { getPool } from '../../core/db/index.js';

const EDIT_WINDOW_DAYS = 30;

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function parseReviewRow(row) {
  const nums = ['rating', 'cleanliness_rating', 'accuracy_rating', 'host_rating', 'value_rating'];
  const out = { ...row };
  for (const k of nums) if (out[k] != null) out[k] = Number(out[k]);
  out.can_edit = row.created_at ? (Date.now() - new Date(row.created_at).getTime()) < EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000 : false;
  return out;
}

/** listReviewsForProperty — public, visible reviews only, newest first by default (caller can
 * pass sort='rating_desc'). Joined with the reviewer's display name (not email — never expose
 * a reviewer's email to other visitors). */
export async function listReviewsForProperty(propertyId, { sort = 'newest' } = {}) {
  const pool = getPool();
  const orderBy = sort === 'rating_desc' ? 'r.rating DESC, r.created_at DESC' : 'r.created_at DESC';
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS reviewer_name
     FROM property_reviews r
     JOIN users u ON u.id = r.user_id
     WHERE r.property_id = ? AND r.status = 'visible'
     ORDER BY ${orderBy}`,
    [propertyId]
  );
  return rows.map(parseReviewRow);
}

/** getReviewAggregate — average + count + per-dimension averages, for one property. Used by
 * the property page header, PropertyCard, and the AggregateRating JSON-LD. */
export async function getReviewAggregate(propertyId) {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count, AVG(rating) AS avg_rating,
       AVG(cleanliness_rating) AS avg_cleanliness, AVG(accuracy_rating) AS avg_accuracy,
       AVG(host_rating) AS avg_host, AVG(value_rating) AS avg_value
     FROM property_reviews WHERE property_id = ? AND status = 'visible'`,
    [propertyId]
  );
  return {
    count: Number(row.count),
    avgRating: row.avg_rating ? Math.round(Number(row.avg_rating) * 10) / 10 : null,
    avgCleanliness: row.avg_cleanliness ? Math.round(Number(row.avg_cleanliness) * 10) / 10 : null,
    avgAccuracy: row.avg_accuracy ? Math.round(Number(row.avg_accuracy) * 10) / 10 : null,
    avgHost: row.avg_host ? Math.round(Number(row.avg_host) * 10) / 10 : null,
    avgValue: row.avg_value ? Math.round(Number(row.avg_value) * 10) / 10 : null,
  };
}

/** getReviewAggregatesForProperties — batch version for search results / grids, one query
 * for N properties instead of N (same "don't repeat the pre-10.1 mistake" rule everywhere
 * else in this codebase). */
export async function getReviewAggregatesForProperties(propertyIds) {
  if (!propertyIds.length) return {};
  const pool = getPool();
  const placeholders = propertyIds.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT property_id, COUNT(*) AS count, AVG(rating) AS avg_rating
     FROM property_reviews WHERE property_id IN (${placeholders}) AND status = 'visible'
     GROUP BY property_id`,
    propertyIds
  );
  const byProperty = {};
  for (const row of rows) {
    byProperty[row.property_id] = { count: Number(row.count), avgRating: Math.round(Number(row.avg_rating) * 10) / 10 };
  }
  return byProperty;
}

export async function getUserReviewForProperty(propertyId, userId) {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT * FROM property_reviews WHERE property_id = ? AND user_id = ?`, [propertyId, userId]);
  return rows[0] ? parseReviewRow(rows[0]) : null;
}

/** createReview — self-review blocked by comparing the reviewer's email to the property
 * owner's (agent) email; duplicate-per-user blocked by the DB unique constraint (caught and
 * turned into a friendly error, not a raw SQL error). */
export async function createReview(propertyId, userEmail, userId, fields) {
  const pool = getPool();
  const [[property]] = await pool.query(
    `SELECT p.id, a.email AS owner_email FROM properties p LEFT JOIN agents a ON a.id = p.owner_id WHERE p.id = ?`,
    [propertyId]
  );
  if (!property) { const e = new Error('Property not found'); e.status = 404; throw e; }
  if (property.owner_email && property.owner_email.toLowerCase() === (userEmail || '').toLowerCase()) {
    const e = new Error('You cannot review your own property'); e.status = 403; throw e;
  }
  const now = nowStr();
  try {
    const [result] = await pool.query(
      `INSERT INTO property_reviews
        (property_id, user_id, rating, cleanliness_rating, accuracy_rating, host_rating, value_rating, title, body, stay_date, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'visible', ?, ?)`,
      [
        propertyId, userId, fields.rating,
        fields.cleanlinessRating || null, fields.accuracyRating || null, fields.hostRating || null, fields.valueRating || null,
        fields.title || null, fields.body, fields.stayDate || null, now, now,
      ]
    );
    return { id: result.insertId };
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') { const e = new Error('You have already reviewed this property'); e.status = 409; throw e; }
    throw err;
  }
}

/** updateReview — only within the 30-day edit window, only by the review's own author. */
export async function updateReview(reviewId, userId, fields) {
  const pool = getPool();
  const [rows] = await pool.query(`SELECT * FROM property_reviews WHERE id = ? AND user_id = ?`, [reviewId, userId]);
  const review = rows[0];
  if (!review) { const e = new Error('Not found'); e.status = 404; throw e; }
  const ageMs = Date.now() - new Date(review.created_at).getTime();
  if (ageMs > EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000) { const e = new Error('Edit window has passed'); e.status = 403; throw e; }
  await pool.query(
    `UPDATE property_reviews SET rating=?, cleanliness_rating=?, accuracy_rating=?, host_rating=?, value_rating=?, title=?, body=?, stay_date=?, updated_at=? WHERE id=?`,
    [
      fields.rating, fields.cleanlinessRating || null, fields.accuracyRating || null, fields.hostRating || null, fields.valueRating || null,
      fields.title || null, fields.body, fields.stayDate || null, nowStr(), reviewId,
    ]
  );
}

/** replyToReview — owner-only (ownership checked by the route via the property's owner_id),
 * one reply per review (overwrites — spec says "תגובה אחת", not a thread). */
export async function replyToReview(reviewId, ownerId, replyText) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT r.id FROM property_reviews r JOIN properties p ON p.id = r.property_id WHERE r.id = ? AND p.owner_id = ?`,
    [reviewId, ownerId]
  );
  if (!rows[0]) { const e = new Error('Not found'); e.status = 404; throw e; }
  await pool.query(`UPDATE property_reviews SET owner_reply = ?, owner_reply_at = ? WHERE id = ?`, [replyText, nowStr(), reviewId]);
}

export async function reportReview(reviewId, reason, reporterSession) {
  const pool = getPool();
  await pool.query(`INSERT INTO property_review_reports (review_id, reason, reporter_session, created_at) VALUES (?, ?, ?, ?)`, [reviewId, reason || null, reporterSession || null, nowStr()]);
  await pool.query(`UPDATE property_reviews SET report_count = report_count + 1 WHERE id = ?`, [reviewId]);
}

// ── Admin moderation ────────────────────────────────────────────────────────

export async function listReportedReviews() {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT r.*, u.name AS reviewer_name, p.name AS property_name
     FROM property_reviews r
     JOIN users u ON u.id = r.user_id
     JOIN properties p ON p.id = r.property_id
     WHERE r.report_count > 0 AND r.status != 'removed'
     ORDER BY r.report_count DESC, r.created_at DESC`
  );
  return rows.map(parseReviewRow);
}

export async function setReviewStatus(reviewId, status) {
  const pool = getPool();
  await pool.query(`UPDATE property_reviews SET status = ? WHERE id = ?`, [status, reviewId]);
}
