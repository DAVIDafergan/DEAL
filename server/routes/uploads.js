import { Router } from 'express';
import multer from 'multer';
import { isCloudinaryConfigured, uploadImageToCloudinary } from '../../media/cloudinaryUpload.js';
import { requireAgentAuth } from '../middleware/agentAuth.js';

const ALLOWED_MIMETYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — matches 7.4's client-side limit
  fileFilter: (req, file, cb) => cb(null, ALLOWED_MIMETYPES.has(file.mimetype)),
});

const router = Router();

/** POST /api/uploads/property-image — multipart "file" field, owner auth required. Used by the
 * property wizard's photo step (7.4). The client is expected to have already downscaled the
 * image to <=2000px before sending (see web/src/utils/imageCompress.js) — this endpoint doesn't
 * re-process, just forwards the bytes to Cloudinary. */
router.post('/property-image', requireAgentAuth, upload.single('file'), async (req, res) => {
  if (!isCloudinaryConfigured()) {
    return res.status(503).json({ error: 'Image upload is not configured on this server (CLOUDINARY_URL missing)' });
  }
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  try {
    const url = await uploadImageToCloudinary(req.file.buffer, { folder: `dealim/properties/${req.agentId}` });
    res.json({ url });
  } catch (err) {
    console.error('[uploads] property-image error:', err.message);
    res.status(502).json({ error: 'Image upload failed' });
  }
});

// multer errors (oversized file, rejected mimetype) land here instead of the generic error handler.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 10MB)' : err.message });
  }
  next(err);
});

export default router;
