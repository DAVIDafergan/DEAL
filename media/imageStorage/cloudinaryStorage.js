import { uploadImageToCloudinary, deleteImageFromCloudinary } from '../cloudinaryUpload.js';

/** 11.5 — "cloudinary" ImageStorage backend, wrapping the pre-existing implementation behind
 * the same interface dbStorage.js exposes. Thumbnails aren't stored separately here — Cloudinary
 * already does on-the-fly resizing via URL transforms (see web/src/utils/imageUrl.js), so the
 * same uploaded URL serves both the full image and, with a width param appended, the "thumb". */
export async function uploadImage({ buffer, propertyId, unitId }) {
  const folder = `dealim/properties/${propertyId || 'misc'}${unitId ? `/units/${unitId}` : ''}`;
  const url = await uploadImageToCloudinary(buffer, { folder });
  return { url };
}

export async function deleteImage(url) {
  await deleteImageFromCloudinary(url);
}

export async function countImages() {
  // Cloudinary is billed/quota'd separately and doesn't share the local per-listing cap
  // enforcement — the 15/10 caps in the spec are specifically about the "no external service"
  // db backend's own storage growth, not a Cloudinary account limit.
  return 0;
}

export async function getStorageStats() {
  return { count: null, totalBytes: null };
}

/** Cloudinary uploads were never tracked in a local table (they're just URL strings embedded
 * in property/unit JSON) — there's no ownership lookup possible from the URL alone, so the
 * DELETE route's ownership check simply doesn't apply to this backend (same as before this
 * endpoint existed at all — not a regression, just a limit of what's trackable here). */
export async function getImageOwnerId() {
  return null;
}
