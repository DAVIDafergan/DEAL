import { propertyApi } from '../api/client.js';

const SESSION_KEY = 'deal_radar_session_id';

/** A random, non-identifying per-browser token — never sent anywhere except this tracking
 * call, and hashed again server-side before storage (see propertyEventStore.js). Persists in
 * localStorage so "unique views" means unique browsers, not unique page loads. */
function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** 'search' (came from our own site), 'direct' (typed URL / no referrer, e.g. a bookmark or
 * a WhatsApp-shared link), or 'external' (Google, Facebook, someone else's site). */
function detectSource() {
  const ref = document.referrer;
  if (!ref) return 'direct';
  try {
    const refHost = new URL(ref).host;
    return refHost === window.location.host ? 'search' : 'external';
  } catch {
    return 'direct';
  }
}

/** 10.5: fire-and-forget — never awaited by callers, never blocks rendering or navigation.
 * Failures are swallowed silently (analytics is not part of the visitor's task). */
export function trackPropertyEvent(propertyId, eventType, { unitId } = {}) {
  propertyApi.trackEvent(propertyId, {
    eventType,
    unitId: unitId || undefined,
    sessionId: getSessionId(),
    source: detectSource(),
  }).catch(() => {});
}
