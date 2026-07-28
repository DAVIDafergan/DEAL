import { useState, useEffect, useCallback, useRef } from 'react';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { userApi } from '../api/client.js';

const STORAGE_KEY = 'deal_radar_favorites';

function readFavs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function writeFavs(favs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

/** 11.21: favorites move from device-local (localStorage, anonymous) to account-backed the
 * moment a customer is logged in — same saved list on any device, instead of "whichever browser
 * happened to save it". Anything favorited anonymously before login is merged into the account
 * once per login (server-side INSERT IGNORE makes repeat merges harmless, so no "did we already
 * merge" flag is needed). Logged-out visitors keep the exact previous localStorage-only
 * behavior. Only property favorites (the only thing favoritable on the live site — see
 * DECISIONS.md 9.3/9.6) go through the account; nothing here changes for other deal_source
 * values, though none exist in practice anymore. */
export function useFavorites() {
  const { travelerToken } = useTravelerAuth();
  const [favorites, setFavorites] = useState(readFavs);
  const mergedForToken = useRef(null);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY && !travelerToken) setFavorites(readFavs());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [travelerToken]);

  useEffect(() => {
    if (!travelerToken) { setFavorites(readFavs()); return; }
    let cancelled = false;
    (async () => {
      if (mergedForToken.current !== travelerToken) {
        const localPropertyFavs = readFavs().filter((f) => (f.deal_source || 'property') === 'property');
        await Promise.all(localPropertyFavs.map((f) => userApi.addFavorite(travelerToken, f.id).catch(() => {})));
        mergedForToken.current = travelerToken;
      }
      try {
        const { favorites: ids } = await userApi.getFavorites(travelerToken);
        if (!cancelled) setFavorites((ids || []).map((id) => ({ id, deal_source: 'property' })));
      } catch { /* keep whatever we had — best-effort, matches the rest of this app's optional-network patterns */ }
    })();
    return () => { cancelled = true; };
  }, [travelerToken]);

  const toggleFavorite = useCallback((deal) => {
    const dealSource = deal.deal_source || 'property';
    const key = `${dealSource}_${deal.id}`;

    if (travelerToken) {
      const exists = favorites.some((f) => `${f.deal_source || 'property'}_${f.id}` === key);
      setFavorites((prev) => exists
        ? prev.filter((f) => `${f.deal_source || 'property'}_${f.id}` !== key)
        : [...prev, { id: deal.id, deal_source: dealSource }]);
      const call = exists ? userApi.removeFavorite : userApi.addFavorite;
      call(travelerToken, deal.id).catch(() => {});
      return;
    }

    setFavorites(prev => {
      const exists = prev.some(f => `${f.deal_source || 'agent'}_${f.id}` === key);
      const next = exists
        ? prev.filter(f => `${f.deal_source || 'agent'}_${f.id}` !== key)
        : [...prev, { ...deal, saved_at: Date.now() }];
      writeFavs(next);
      return next;
    });
  }, [travelerToken, favorites]);

  const isFavorite = useCallback((deal) => {
    const dealSourceFallback = travelerToken ? 'property' : 'agent';
    const key = `${deal.deal_source || dealSourceFallback}_${deal.id}`;
    return favorites.some(f => `${f.deal_source || dealSourceFallback}_${f.id}` === key);
  }, [favorites, travelerToken]);

  return { favorites, toggleFavorite, isFavorite };
}
