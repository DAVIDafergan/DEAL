import crypto from 'node:crypto';

/**
 * Real Cloudinary upload, extending the persistMediaUrl stub in cloudStorage.js — that one only
 * ever passes AI-generated media URLs through unchanged; this one actually uploads a browser
 * file buffer. No `cloudinary` SDK dependency: a signed upload is a single HTTP POST, and Node
 * 20's built-in fetch/FormData/Blob cover it without adding a package.
 */
function parseCloudinaryUrl(url) {
  // Format: cloudinary://<api_key>:<api_secret>@<cloud_name>
  const match = /^cloudinary:\/\/(\d+):([^@]+)@(.+)$/.exec(url || '');
  if (!match) return null;
  return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
}

export function isCloudinaryConfigured(env = process.env) {
  return Boolean(parseCloudinaryUrl(env.CLOUDINARY_URL));
}

/** Uploads a single image buffer to Cloudinary under `folder`. Returns the secure_url, or throws
 * if CLOUDINARY_URL isn't configured (caller should check isCloudinaryConfigured() first to give
 * a clean 503 instead of a stack trace). */
export async function uploadImageToCloudinary(buffer, { folder = 'dealim/properties', env = process.env } = {}) {
  const config = parseCloudinaryUrl(env.CLOUDINARY_URL);
  if (!config) throw new Error('CLOUDINARY_URL is not configured');

  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signature: sha1 of the sorted param string (excluding file/api_key) + api_secret.
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([buffer]));
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.secure_url;
}

/** Extracts the Cloudinary public_id (folder/filename, no extension, no version prefix) from a
 * secure_url — needed for the signed destroy call, since Cloudinary deletes by public_id, not URL. */
function publicIdFromUrl(url) {
  const match = /\/upload\/(?:v\d+\/)?(.+?)\.\w+$/.exec(url || '');
  return match ? match[1] : null;
}

/** Deletes an image from Cloudinary by its secure_url (11.5 — ImageStorage interface parity
 * with the db backend, which can always delete its own rows). No-ops on a URL that isn't
 * actually a Cloudinary URL or that Cloudinary already doesn't have. */
export async function deleteImageFromCloudinary(url, { env = process.env } = {}) {
  const config = parseCloudinaryUrl(env.CLOUDINARY_URL);
  const publicId = publicIdFromUrl(url);
  if (!config || !publicId) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const form = new FormData();
  form.append('public_id', publicId);
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('signature', signature);

  await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`, {
    method: 'POST',
    body: form,
  }).catch(() => {}); // best-effort — a failed remote delete shouldn't block the local property/image row delete
}
