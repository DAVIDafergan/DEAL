/** 10.1: tiny in-memory TTL cache for hot, read-heavy, cheap-to-serve-stale endpoints (property
 * search, facet counts) — every visitor to the homepage triggers both, and they're identical
 * for identical query params. Deliberately simple: no explicit invalidation on writes, a short
 * TTL (default 30s) is the safety valve instead — a new/edited property becoming visible up to
 * 30s late is an acceptable, conservative tradeoff for not having to wire cache-busting into
 * every property/unit mutation path (see DECISIONS.md 10.1). Not shared across server instances
 * — fine at this scale, revisit with Redis only if the app actually runs multi-instance. */
const store = new Map();

export function ttlCached(keyPrefix, ttlMs = 30_000) {
  return async function withCache(key, compute) {
    const fullKey = `${keyPrefix}:${key}`;
    const hit = store.get(fullKey);
    const now = Date.now();
    if (hit && hit.expiresAt > now) return hit.value;
    const value = await compute();
    store.set(fullKey, { value, expiresAt: now + ttlMs });
    return value;
  };
}

// Periodic sweep so the map doesn't grow unbounded from ever-changing query strings (long-tail
// filter combinations each get their own key) — runs independently of any request.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}, 60_000).unref();
