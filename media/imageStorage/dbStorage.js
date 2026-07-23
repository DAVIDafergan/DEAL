import { getPool } from '../../core/db/index.js';

/** 11.5 — "db" ImageStorage backend: stores the actual image bytes in MySQL (property_images
 * table) instead of an external service. No API keys, no third-party dependency — works out of
 * the box on any deploy. Trade-off (deliberate, see DECISIONS.md 11.5): DB size grows with
 * photo volume, and there's no CDN — acceptable for this site's current scale, not meant to be
 * the permanent answer if photo volume grows a lot; switching to Cloudinary later is a one-line
 * env var change (IMAGE_STORAGE=cloudinary), not a rewrite. */

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

/** property_id is nullable here even though it's the primary association for almost every
 * upload — the one exception is the owner's own profile/logo photo (OwnerSettingsPage), which
 * isn't a property photo at all but reuses the same uploader component and endpoint. */
export async function uploadImage({ buffer, thumbBuffer, mimeType, width, height, propertyId, unitId, sortOrder, isPrimary }) {
  const pool = getPool();
  const [result] = await pool.query(
    `INSERT INTO property_images
       (property_id, unit_id, mime_type, bytes, thumb_bytes, width, height, size_bytes, sort_order, is_primary, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      propertyId || null, unitId || null, mimeType, buffer, thumbBuffer || null,
      width || null, height || null, buffer.length, sortOrder || 0, isPrimary ? 1 : 0, nowStr(),
    ]
  );
  return { url: `/api/images/${result.insertId}`, id: result.insertId };
}

function idFromUrl(url) {
  const match = /\/api\/images\/(\d+)/.exec(url || '');
  return match ? Number(match[1]) : null;
}

export async function deleteImage(url) {
  const id = idFromUrl(url);
  if (!id) return;
  await getPool().query('DELETE FROM property_images WHERE id = ?', [id]);
}

/** Ownership check for the DELETE route — resolves a stored image's owning agent (via its
 * property_id) so one agent can't delete another agent's photo by guessing/reusing a URL. An
 * image with no property_id (the owner-logo case) has no owner to check against here — the
 * route allows those through since they're not tied to any listing in the first place. */
export async function getImageOwnerId(url) {
  const id = idFromUrl(url);
  if (!id) return null;
  const [rows] = await getPool().query(
    `SELECT p.owner_id FROM property_images pi JOIN properties p ON p.id = pi.property_id WHERE pi.id = ?`,
    [id]
  );
  return rows[0]?.owner_id ?? null;
}

/** thumb: true prefers thumb_bytes but falls back to the full bytes when no thumbnail was
 * generated for this row (e.g. a browser that couldn't produce a webp client-side — see the
 * fallback path in web/src/utils/imageCompress.js) — never 404s just because the thumb
 * variant specifically doesn't exist when the image itself does. */
export async function getImageRow(id, { thumb = false } = {}) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT mime_type, COALESCE(${thumb ? 'thumb_bytes' : 'NULL'}, bytes) AS bytes, created_at FROM property_images WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
}

/** Used by the upload route to enforce the 15-per-property / 10-per-unit caps before accepting
 * a new file — checked against the DB regardless of which storage backend is active, since the
 * cap is about how many photos a listing has, not where the bytes live. */
export async function countImages({ propertyId, unitId }) {
  const pool = getPool();
  if (unitId) {
    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM property_images WHERE unit_id = ?', [unitId]);
    return count;
  }
  const [[{ count }]] = await pool.query(
    'SELECT COUNT(*) AS count FROM property_images WHERE property_id = ? AND unit_id IS NULL',
    [propertyId]
  );
  return count;
}

/** 11.5 admin status screen — how many images, how much space. */
export async function getStorageStats() {
  const pool = getPool();
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS count, COALESCE(SUM(size_bytes), 0) AS totalBytes FROM property_images`
  );
  return { count: Number(row.count), totalBytes: Number(row.totalBytes) };
}
