const MAX_DIMENSION = 2000; // 7.4: "דחיסה בצד הלקוח לפני העלאה (רוחב מרבי 2000px)"
const JPEG_QUALITY = 0.85;

/** Downscales an image file to fit within MAX_DIMENSION and re-encodes as JPEG, client-side —
 * keeps upload size (and Cloudinary storage) down without needing a server-side image pipeline. */
export async function compressImageFile(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) return file; // canvas encoding failed (e.g. HEIC the browser can't decode) — fall back to the original
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB, matches server/routes/uploads.js
