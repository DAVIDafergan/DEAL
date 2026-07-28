import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useTravelerAuth } from './TravelerAuthContext.jsx';
import { userApi } from '../api/client.js';

const STORAGE_KEY = 'deal_radar_seen_hints';

function readLocal() {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')); }
  catch { return new Set(); }
}

function writeLocal(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

const HintsContext = createContext(null);

/** HintsProvider — 11.22: tracks which first-time contextual hints (FeatureHint.jsx) a visitor
 * has already dismissed, so they show exactly once. Fetched/merged once here (not per-hint) so
 * ten FeatureHint instances on a page don't each fire their own request. Same anonymous-vs-
 * account split as useFavorites.js: logged out, localStorage only; logged in, the account is the
 * source of truth (any hint dismissed anonymously before login is merged in once, then never
 * re-sent — server-side markHintSeen is idempotent). */
export function HintsProvider({ children }) {
  const { travelerToken } = useTravelerAuth();
  const [seen, setSeen] = useState(readLocal);
  const mergedForToken = useRef(null);

  useEffect(() => {
    if (!travelerToken) { setSeen(readLocal()); return; }
    let cancelled = false;
    (async () => {
      if (mergedForToken.current !== travelerToken) {
        const local = [...readLocal()];
        await Promise.all(local.map((id) => userApi.markHintSeen(travelerToken, id).catch(() => {})));
        mergedForToken.current = travelerToken;
      }
      try {
        const { seenHints } = await userApi.getSeenHints(travelerToken);
        if (!cancelled) setSeen(new Set(seenHints || []));
      } catch { /* keep whatever we had — best-effort, matches this app's other optional-network patterns */ }
    })();
    return () => { cancelled = true; };
  }, [travelerToken]);

  const markSeen = useCallback((hintId) => {
    setSeen((prev) => {
      if (prev.has(hintId)) return prev;
      const next = new Set(prev);
      next.add(hintId);
      if (!travelerToken) writeLocal(next);
      return next;
    });
    if (travelerToken) userApi.markHintSeen(travelerToken, hintId).catch(() => {});
  }, [travelerToken]);

  return (
    <HintsContext.Provider value={{ seen, markSeen }}>
      {children}
    </HintsContext.Provider>
  );
}

/** useHintSeen(id) — the per-FeatureHint hook. `seen` is stable/renders false-then-maybe-true
 * once the account fetch above resolves; FeatureHint itself only ever transitions visible→hidden,
 * never the reverse, so that resolution doesn't cause a hint to flash in and back out. */
export function useHintSeen(hintId) {
  const ctx = useContext(HintsContext);
  return { seen: ctx.seen.has(hintId), markSeen: () => ctx.markSeen(hintId) };
}
