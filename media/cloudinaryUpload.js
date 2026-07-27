import crypto from 'node:crypto';

/**
 * Real Cloudinary upload, extending the persistMediaUrl stub in cloudStorage.js — that one only
 * ever passes AI-generated media URLs through unchanged; this one actually uploads a browser
 * file buffer. No `cloudinary` SDK dependency: a signed upload is a single HTTP POST, and Node
 * 20's built-in fetch/FormData/Blob cover it without adding a package.
 */
// 11.18 — accepts either the single combined CLOUDINARY_URL (cloudinary://<key>:<secret>@<cloud>,
// the format Cloudinary's own dashboard shows) or three separate CLOUDINARY_CLOUD_NAME/
// CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET vars (the format some hosting UIs — Railway included —
// nudge people toward when pasting one credential per field). CLOUDINARY_URL wins if both are
// set, since it's the single source of truth Cloudinary itself documents.
function parseCloudinaryUrl(env) {
  const urlMatch = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(env.CLOUDINARY_URL || '');
  if (urlMatch) return { apiKey: urlMatch[1], apiSecret: urlMatch[2], cloudName: urlMatch[3] };

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    return { apiKey: CLOUDINARY_API_KEY, apiSecret: CLOUDINARY_API_SECRET, cloudName: CLOUDINARY_CLOUD_NAME };
  }
  return null;
}

export function isCloudinaryConfigured(env = process.env) {
  return Boolean(parseCloudinaryUrl(env));
}

// 11.18 — incoming transformation applied at upload time (not just at delivery): caps any
// original at 2400px on the long edge before it's even stored. A 12MP phone photo (4032×3024)
// gets stored at a sane size instead of Cloudinary having to re-derive every delivery variant
// from a multi-thousand-pixel original forever. c_limit never *upscales* a smaller image.
const UPLOAD_WIDTH_CAP = 'w_2400,h_2400,c_limit';

/** Uploads a single image buffer to Cloudinary under `folder`. HEIC/HEIF originals are accepted
 * as-is — Cloudinary decodes them server-side; browsers then get a real jpg/webp at delivery
 * time via f_auto (see web/src/utils/imageUrl.js), never the raw HEIC. Returns the secure_url,
 * or throws if Cloudinary isn't configured (caller should check isCloudinaryConfigured() first
 * to give a clean 503 instead of a stack trace). */
export async function uploadImageToCloudinary(buffer, { folder = 'dealim/properties', env = process.env } = {}) {
  const config = parseCloudinaryUrl(env);
  if (!config) throw new Error('Cloudinary is not configured (set CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)');

  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signature: sha1 of the params sorted alphabetically by key (excluding file/api_key) + api_secret.
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}&transformation=${UPLOAD_WIDTH_CAP}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([buffer]));
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('transformation', UPLOAD_WIDTH_CAP);
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
  const config = parseCloudinaryUrl(env);
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

// 11.18 — video upload. Same signed-POST approach as images, but resource_type=video (both the
// upload path and the destroy path — Cloudinary indexes video assets separately from images, so
// hitting /image/destroy on a video public_id silently no-ops instead of deleting it). No size
// cap transform at upload time the way images get one — video transformations are billed
// differently and eager-transcoding on upload adds real latency; the size/duration limits are
// enforced before upload instead (see server/routes/uploads.js MAX_VIDEO_BYTES).
export async function uploadVideoToCloudinary(buffer, { folder = 'dealim/properties', env = process.env } = {}) {
  const config = parseCloudinaryUrl(env);
  if (!config) throw new Error('Cloudinary is not configured (set CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)');

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([buffer]));
  form.append('api_key', config.apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/video/upload`, {
    method: 'POST',
    body: form,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cloudinary video upload failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  // Cloudinary auto-extracts a poster frame from any video public_id by requesting the same
  // path with a still-image extension instead of the video's own — no separate upload needed.
  const posterUrl = data.secure_url.replace(/\.\w+$/, '.jpg');
  return { url: data.secure_url, posterUrl, duration: data.duration ?? null };
}

export async function deleteVideoFromCloudinary(url, { env = process.env } = {}) {
  const config = parseCloudinaryUrl(env);
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

  await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/video/destroy`, {
    method: 'POST',
    body: form,
  }).catch(() => {});
}
