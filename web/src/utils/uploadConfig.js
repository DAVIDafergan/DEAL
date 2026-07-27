import { uploadApi } from '../api/client.js';

// 11.19 — single source of truth for upload limits, read from the server instead of duplicated
// as hardcoded client constants (that duplication is exactly what caused the bug where a real
// 12-15MB phone photo got blocked client-side even after the server-side cap was raised to
// allow it — the two numbers had drifted apart). Fetched once and memoized; a stale/failed fetch
// falls back to conservative db-backend-shaped numbers so the uploader never crashes without it.
let cached = null;

export function getUploadConfig() {
  if (!cached) {
    cached = uploadApi.getConfig().catch(() => ({
      usingCloudinary: false,
      maxImageBytes: 2 * 1024 * 1024,
      maxVideoBytes: 60 * 1024 * 1024,
    }));
  }
  return cached;
}
