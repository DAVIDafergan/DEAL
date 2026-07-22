const STORAGE_KEY = 'deal_radar_recent_searches';
const MAX_ITEMS = 5;

/** 9.6 "חיפושים אחרונים בדף הבית" — stores a compact snapshot of filters whenever the visitor
 * runs a real search (at least one filter set), keyed by a dedupe signature so repeating the
 * same search just bumps it instead of piling up duplicates. */
export function saveRecentSearch(filters) {
  const hasAny = filters.region || filters.city || filters.checkIn || filters.guests;
  if (!hasAny) return;
  const signature = JSON.stringify([filters.region, filters.city, filters.checkIn, filters.checkOut, filters.guests]);
  const list = listRecentSearches().filter((s) => s.signature !== signature);
  list.unshift({ signature, ...filters, savedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
}

export function listRecentSearches() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
