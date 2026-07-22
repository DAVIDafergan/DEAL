const STORAGE_KEY = 'deal_radar_recently_viewed';
const MAX_ITEMS = 8;

/** 10.8 — "recently viewed", separate from recentSearches.js (that's saved filter combos,
 * this is actual property ids) so a visitor can jump straight back to a listing they opened. */
export function saveRecentlyViewed(propertyId) {
  const list = listRecentlyViewed().filter((id) => id !== propertyId);
  list.unshift(propertyId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ITEMS)));
}

export function listRecentlyViewed() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
