import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Same file-cache shape as engine/fetcher/htmlCache.js, separate directory — caches a search
// provider's *results* (not page HTML) so re-running the same query within 30 days doesn't pay
// for it twice (8.1: "הוסף מטמון תוצאות (30 יום) כדי לא לשלם פעמיים על אותה שאילתה").
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '..', 'cache-search');
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cacheKeyFor(query) {
  return crypto.createHash('sha256').update(query).digest('hex');
}

export function getCachedResults(query) {
  const file = path.join(CACHE_DIR, `${cacheKeyFor(query)}.json`);
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file);
  if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) {
    fs.unlinkSync(file);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function setCachedResults(query, results) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(path.join(CACHE_DIR, `${cacheKeyFor(query)}.json`), JSON.stringify(results), 'utf8');
}

export function pruneExpiredSearchCache() {
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
