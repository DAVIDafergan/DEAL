import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'deal_radar_favorites';

function readFavs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

function writeFavs(favs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(readFavs);

  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) setFavorites(readFavs());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleFavorite = useCallback((deal) => {
    setFavorites(prev => {
      const key = `${deal.deal_source || 'agent'}_${deal.id}`;
      const exists = prev.some(f => `${f.deal_source || 'agent'}_${f.id}` === key);
      const next = exists
        ? prev.filter(f => `${f.deal_source || 'agent'}_${f.id}` !== key)
        : [...prev, { ...deal, saved_at: Date.now() }];
      writeFavs(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((deal) => {
    const key = `${deal.deal_source || 'agent'}_${deal.id}`;
    return favorites.some(f => `${f.deal_source || 'agent'}_${f.id}` === key);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
