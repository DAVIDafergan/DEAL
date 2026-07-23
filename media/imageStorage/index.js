import { isCloudinaryConfigured } from '../cloudinaryUpload.js';
import * as dbStorage from './dbStorage.js';
import * as cloudinaryStorage from './cloudinaryStorage.js';

/** 11.5 — ImageStorage: one interface (uploadImage/deleteImage/countImages/getStorageStats),
 * two backends. Every upload-handling route calls getImageStorage() and never imports a
 * backend module directly — swapping backends is an env var, not a code change.
 *
 * Mode resolution:
 *   IMAGE_STORAGE=db         -> always db, regardless of CLOUDINARY_URL
 *   IMAGE_STORAGE=cloudinary -> always cloudinary (will fail uploads if CLOUDINARY_URL is
 *                               actually missing — that's a deliberate misconfiguration, not
 *                               something to silently fall back from)
 *   unset                    -> cloudinary if CLOUDINARY_URL is configured, otherwise db
 * db is the default specifically so the app works with zero external setup out of the box. */
export function resolveImageStorageMode(env = process.env) {
  const explicit = (env.IMAGE_STORAGE || '').trim().toLowerCase();
  if (explicit === 'db' || explicit === 'cloudinary') return explicit;
  return isCloudinaryConfigured(env) ? 'cloudinary' : 'db';
}

export function getImageStorage(env = process.env) {
  return resolveImageStorageMode(env) === 'cloudinary' ? cloudinaryStorage : dbStorage;
}
