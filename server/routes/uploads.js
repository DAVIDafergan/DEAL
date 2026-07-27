import { Router } from 'express';
import multer from 'multer';
import { getImageStorage, resolveImageStorageMode } from '../../media/imageStorage/index.js';
import { isCloudinaryConfigured, uploadVideoToCloudinary, deleteVideoFromCloudinary } from '../../media/cloudinaryUpload.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';
import { getPropertyByIdForOwner, getUnitOwnedBy, updateProperty } from '../store/propertyStore.js';

const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
// 11.18 — the client tries to canvas-recompress every photo to webp before sending it (see
// imageCompress.js), but browsers frequently can't *decode* HEIC via createImageBitmap (common
// on non-Safari browsers), so that path silently falls back to sending the raw, unconverted
// original — a real iPhone photo, easily 5-10MB. With Cloudinary as the backend that's fine:
// Cloudinary decodes HEIC and re-encodes it server-side, and the upload-time transform (see
// cloudinaryUpload.js) caps the stored dimensions regardless of the original's size. The db
// backend has no such luxury — it stores the raw bytes straight into MySQL — so it keeps the
// original, stricter 2MB cap.
const USING_CLOUDINARY = resolveImageStorageMode() === 'cloudinary';
const MAX_FILE_BYTES = USING_CLOUDINARY ? 10 * 1024 * 1024 : 2 * 1024 * 1024;
const MAX_FILE_MB = MAX_FILE_BYTES / (1024 * 1024);
const PROPERTY_IMAGE_LIMIT = 15;
const UNIT_IMAGE_LIMIT = 10;

const ALLOWED_VIDEO_MIMETYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm', 'video/x-m4v', 'video/3gpp']);
// Video is Cloudinary-only — there's no realistic way to store/serve video from the db backend's
// MySQL-blob approach the way images are (see media/imageStorage/dbStorage.js), so this cap only
// matters when USING_CLOUDINARY is true; the route 503s outright otherwise (see below).
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;
const MAX_VIDEO_MB = MAX_VIDEO_BYTES / (1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_MIMETYPES.has(file.mimetype)),
});

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_VIDEO_MIMETYPES.has(file.mimetype)),
});

const router = Router();

/** POST /api/uploads/property-image — multipart "file" (required) + "thumb" (optional, the
 * pre-generated 400px copy) fields, owner auth required. Optional propertyId/unitId form
 * fields associate the image with a listing (and are ownership-checked below); omitted
 * entirely for the one non-property upload that reuses this same endpoint+component — the
 * owner's own profile/logo photo (OwnerSettingsPage). */
router.post(
  '/property-image',
  requireAgentAuth,
  upload.fields([{ name: 'file', maxCount: 1 }, { name: 'thumb', maxCount: 1 }]),
  async (req, res) => {
    const file = req.files?.file?.[0];
    const thumb = req.files?.thumb?.[0];
    if (!file) return res.status(400).json({ error: 'לא נבחרה תמונה להעלאה' });

    const propertyId = req.body.propertyId ? Number(req.body.propertyId) : null;
    const unitId = req.body.unitId ? Number(req.body.unitId) : null;

    if (propertyId) {
      const property = await getPropertyByIdForOwner(propertyId, req.agentId);
      if (!property) return res.status(403).json({ error: 'אין הרשאה להעלות תמונות לנכס הזה' });
    }
    if (unitId) {
      const unit = await getUnitOwnedBy(unitId, req.agentId);
      if (!unit) return res.status(403).json({ error: 'אין הרשאה להעלות תמונות ליחידה הזו' });
    }

    const storage = getImageStorage();

    if (propertyId) {
      try {
        const count = await storage.countImages({ propertyId, unitId });
        const limit = unitId ? UNIT_IMAGE_LIMIT : PROPERTY_IMAGE_LIMIT;
        if (count >= limit) {
          return res.status(400).json({
            error: unitId
              ? `אפשר להעלות עד ${UNIT_IMAGE_LIMIT} תמונות ליחידה אחת`
              : `אפשר להעלות עד ${PROPERTY_IMAGE_LIMIT} תמונות לנכס`,
          });
        }
      } catch { /* best-effort — the cloudinary backend doesn't enforce this cap, see its countImages */ }
    }

    try {
      const result = await storage.uploadImage({
        buffer: file.buffer,
        thumbBuffer: thumb?.buffer,
        mimeType: file.mimetype,
        width: Number(req.body.width) || null,
        height: Number(req.body.height) || null,
        propertyId,
        unitId,
      });
      res.json({ url: result.url });
    } catch (err) {
      console.error('[uploads] property-image error:', err.message);
      res.status(502).json({ error: 'העלאת התמונה נכשלה, נסו שוב' });
    }
  }
);

/** DELETE /api/uploads/property-image?url=... Removes the stored image (db: deletes the row;
 * cloudinary: signed destroy call) so removing a photo from a listing doesn't leave an
 * orphaned blob behind forever — matters much more for the db backend, where that blob lives
 * in this app's own MySQL storage, than it did for Cloudinary. */
router.delete('/property-image', requireAgentAuth, async (req, res) => {
  const { url } = req.query || {};
  if (!url) return res.status(400).json({ error: 'חסר url למחיקה' });
  const storage = getImageStorage();
  try {
    // Ownership check — an image tied to a property must belong to the requesting agent.
    // An image with no property (the owner-logo case) has no owner to check, and is allowed
    // through (matches the upload side, where propertyId is likewise optional there).
    const ownerId = await storage.getImageOwnerId(url);
    if (ownerId !== null && ownerId !== req.agentId) {
      return res.status(403).json({ error: 'אין הרשאה למחוק את התמונה הזו' });
    }
    await storage.deleteImage(url);
    res.json({ ok: true });
  } catch (err) {
    console.error('[uploads] delete property-image error:', err.message);
    res.status(502).json({ error: 'מחיקת התמונה נכשלה' });
  }
});

/** POST /api/uploads/property-video — Cloudinary-only (video isn't a realistic fit for the db
 * backend's MySQL-blob storage — see dbStorage.js). 503s with a clear Hebrew message if
 * Cloudinary isn't configured, rather than accepting an upload that has nowhere real to go. */
router.post('/property-video', requireAgentAuth, uploadVideo.single('file'), async (req, res) => {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ error: 'העלאת סרטונים דורשת חיבור ל-Cloudinary, שאינו מוגדר כרגע בשרת' });
  }
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'לא נבחר סרטון להעלאה' });

  const propertyId = req.body.propertyId ? Number(req.body.propertyId) : null;
  if (propertyId) {
    const property = await getPropertyByIdForOwner(propertyId, req.agentId);
    if (!property) return res.status(403).json({ error: 'אין הרשאה להעלות סרטון לנכס הזה' });
  }

  try {
    const folder = `dealim/properties/${propertyId || 'misc'}/video`;
    const { url, posterUrl } = await uploadVideoToCloudinary(file.buffer, { folder });
    if (propertyId) await updateProperty(propertyId, req.agentId, { video_url: url, video_poster_url: posterUrl });
    res.json({ url, posterUrl });
  } catch (err) {
    console.error('[uploads] property-video error:', err.message);
    res.status(502).json({ error: 'העלאת הסרטון נכשלה, נסו שוב' });
  }
});

/** DELETE /api/uploads/property-video?propertyId=...&url=... */
router.delete('/property-video', requireAgentAuth, async (req, res) => {
  const { url, propertyId } = req.query || {};
  if (!url) return res.status(400).json({ error: 'חסר url למחיקה' });
  const pid = propertyId ? Number(propertyId) : null;
  if (pid) {
    const property = await getPropertyByIdForOwner(pid, req.agentId);
    if (!property) return res.status(403).json({ error: 'אין הרשאה למחוק את הסרטון הזה' });
  }
  try {
    await deleteVideoFromCloudinary(url);
    if (pid) await updateProperty(pid, req.agentId, { video_url: null, video_poster_url: null });
    res.json({ ok: true });
  } catch (err) {
    console.error('[uploads] delete property-video error:', err.message);
    res.status(502).json({ error: 'מחיקת הסרטון נכשלה' });
  }
});

// multer errors (oversized file, rejected mimetype) land here instead of the generic error handler.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const isVideo = req.originalUrl?.includes('property-video');
    const sizeMsg = isVideo ? `הסרטון גדול מדי (עד ${MAX_VIDEO_MB}MB)` : `הקובץ גדול מדי (עד ${MAX_FILE_MB}MB${USING_CLOUDINARY ? '' : ' לאחר דחיסה'})`;
    return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE' ? sizeMsg : 'שגיאה בהעלאת הקובץ',
    });
  }
  next(err);
});

export default router;
