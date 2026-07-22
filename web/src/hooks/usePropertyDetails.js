import { useEffect, useState } from 'react';
import { propertyApi } from '../api/client.js';

/** usePropertyDetails — fetches current, live data for a list of property ids in one request.
 * Used by FavoritesPage/ComparePage instead of trusting a stale localStorage snapshot — a
 * saved favorite's price/photos/status may have changed, or it may have been unpublished.
 * 10.1: was N parallel GET /:id calls (one HTTP round trip per favorite); now a single
 * GET /properties/batch — same "one request instead of a waterfall" fix as the property page. */
export function usePropertyDetails(ids) {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const key = ids.join(',');

  useEffect(() => {
    if (ids.length === 0) { setProperties([]); setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    propertyApi.getBatch(ids)
      .then((r) => { if (!cancelled) setProperties(r.properties); })
      .catch(() => { if (!cancelled) setProperties([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { properties, isLoading };
}
