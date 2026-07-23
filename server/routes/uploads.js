import { Router } from 'express';
import multer from 'multer';
import { getImageStorage } from '../../media/imageStorage/index.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';
import { getPropertyByIdForOwner, getUnitOwnedBy } from '../store/propertyStore.js';

const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
// 11.5: 2MB — matches the client-side compression target (web/src/utils/imageCompress.js
// rejects anything that doesn't fit under 2MB after webp re-encoding, before it's even sent).
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PROPERTY_IMAGE_LIMIT = 15;
const UNIT_IMAGE_LIMIT = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => cb(null, ALLOWED_MIMETYPES.has(file.mimetype)),
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

// multer errors (oversized file, rejected mimetype) land here instead of the generic error handler.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.code === 'LIMIT_FILE_SIZE' ? 'הקובץ גדול מדי (עד 2MB לאחר דחיסה)' : 'שגיאה בהעלאת הקובץ',
    });
  }
  next(err);
});

export default router;
