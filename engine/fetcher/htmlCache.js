import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'cache');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // internal only, auto-deleted after 30 days (Step 3.2)

function cacheKeyFor(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

export function getCached(url) {
  const file = path.join(CACHE_DIR, `${cacheKeyFor(url)}.html`);
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) {
    fs.unlinkSync(file);
    return null;
  }
  return fs.readFileSync(file, 'utf8');
}

export function setCached(url, html) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${cacheKeyFor(url)}.html`), html, 'utf8');
}

/** Called at the start of each pipeline run — sweeps anything past the 30-day TTL. */
export function pruneExpiredCache() {
  if (!fs.existsSync(CACHE_DIR)) return 0;
  let removed = 0;
  for (const f of fs.readdirSync(CACHE_DIR)) {
    const full = path.join(CACHE_DIR, f);
    if (Date.now() - fs.statSync(full).mtimeMs > CACHE_TTL_MS) {
      fs.unlinkSync(full);
      removed += 1;
    }
  }
  return removed;
}
