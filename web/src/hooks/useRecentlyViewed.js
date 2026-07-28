import { useState, useEffect } from 'react';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { userApi } from '../api/client.js';
import { listRecentlyViewed } from '../utils/recentlyViewed.js';

/** 11.21: same account-vs-device split as useFavorites.js — a logged-in customer sees the
 * property ids they actually viewed while logged in (server-recorded, see PropertyPage.jsx),
 * not whatever happens to be in this specific browser's localStorage. Anonymous visitors keep
 * the pre-existing localStorage-only behavior unchanged. */
export function useRecentlyViewed() {
  const { travelerToken } = useTravelerAuth();
  const [propertyIds, setPropertyIds] = useState(() => listRecentlyViewed());

  useEffect(() => {
    if (!travelerToken) { setPropertyIds(listRecentlyViewed()); return; }
    let cancelled = false;
    userApi.getRecentlyViewed(travelerToken)
      .then(({ propertyIds: ids }) => { if (!cancelled) setPropertyIds(ids || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [travelerToken]);

  return propertyIds;
}
