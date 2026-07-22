import { useEffect, useState } from 'react';
import { propertyApi } from '../api/client.js';

/** usePropertyDetails — fetches current, live data for a list of property ids in parallel.
 * Used by FavoritesPage/ComparePage instead of trusting a stale localStorage snapshot — a
 * saved favorite's price/photos/status may have changed, or it may have been unpublished
 * (fetch failures for individual ids are silently dropped, not surfaced as a page-level error). */
export function usePropertyDetails(ids) {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = ids.join(',');

  useEffect(() => {
    if (ids.length === 0) { setProperties([]); setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    Promise.all(ids.map((id) => propertyApi.get(id).then((r) => r.property).catch(() => null)))
      .then((results) => { if (!cancelled) setProperties(results.filter(Boolean)); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { properties, isLoading };
}
