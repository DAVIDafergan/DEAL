// 11.5: switched from JPEG/2000px to webp/1600px — webp compresses noticeably smaller than
// JPEG at the same visual quality, which matters more now that the default storage backend is
// the app's own MySQL database (no CDN, no external service) rather than Cloudinary.
const MAX_DIMENSION = 1600;
const THUMB_DIMENSION = 400;
const WEBP_QUALITY = 0.8;
const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024; // 2MB, matches server/routes/uploads.js

function resizeToBlob(bitmap, maxDimension, quality) {
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve({ blob, width, height }), 'image/webp', quality));
}

/** compressImageFile — downscales + re-encodes as webp client-side (max 1600px, ~80% quality),
 * and also produces a separate 400px "thumb" copy so cards never have to load the full image
 * (see PropertyPhotoUploader.jsx / server/routes/uploads.js). Throws a friendly Hebrew message
 * — not a raw error — if the file still doesn't fit under 2MB after compression, so the
 * uploader can show it directly without a translation layer at the call site. */
export async function compressImageFile(file) {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // Some browsers can't decode HEIC/HEIF via createImageBitmap — fall back to sending the
    // original rather than silently failing; the server still enforces the 2MB/mimetype limits.
    return { file, thumbFile: null, width: null, height: null };
  }

  const [main, thumb] = await Promise.all([
    resizeToBlob(bitmap, MAX_DIMENSION, WEBP_QUALITY),
    resizeToBlob(bitmap, THUMB_DIMENSION, WEBP_QUALITY),
  ]);
  bitmap.close?.();

  if (!main.blob) return { file, thumbFile: null, width: null, height: null }; // webp encoding unsupported — fall back to original
  if (main.blob.size > MAX_COMPRESSED_BYTES) {
    throw new Error(`התמונה גדולה מדי גם אחרי דחיסה (${(main.blob.size / 1024 / 1024).toFixed(1)}MB). נסו תמונה אחרת או ברזולוציה נמוכה יותר.`);
  }

  const baseName = file.name.replace(/\.\w+$/, '');
  return {
    file: new File([main.blob], `${baseName}.webp`, { type: 'image/webp' }),
    thumbFile: thumb.blob ? new File([thumb.blob], `${baseName}-thumb.webp`, { type: 'image/webp' }) : null,
    width: main.width,
    height: main.height,
  };
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // pre-compression cap on what we'll even attempt to read
