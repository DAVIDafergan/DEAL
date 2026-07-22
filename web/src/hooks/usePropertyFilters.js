import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

// Query-param keys — kept human-readable so a shared/back-button URL is legible, not just functional.
const KEYS = {
  region: 'region', city: 'city', checkIn: 'checkin', checkOut: 'checkout',
  guests: 'guests', bedrooms: 'bedrooms', minPrice: 'minprice', maxPrice: 'maxprice',
  propertyType: 'type', kosherLevel: 'kosher', viewType: 'view', amenities: 'amenities', sort: 'sort',
};

const EMPTY = {
  region: '', city: '', checkIn: '', checkOut: '',
  guests: '', bedrooms: '', minPrice: '', maxPrice: '',
  propertyType: '', kosherLevel: '', viewType: '', amenities: [], sort: 'recommended',
};

/** Filter state lives entirely in the URL query string (7.2: "מצב הסינון נשמר ב-query params")
 * so a search is shareable and survives the browser back button. */
export function usePropertyFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const amenitiesRaw = searchParams.get(KEYS.amenities);
    return {
      region: searchParams.get(KEYS.region) || '',
      city: searchParams.get(KEYS.city) || '',
      checkIn: searchParams.get(KEYS.checkIn) || '',
      checkOut: searchParams.get(KEYS.checkOut) || '',
      guests: searchParams.get(KEYS.guests) || '',
      bedrooms: searchParams.get(KEYS.bedrooms) || '',
      minPrice: searchParams.get(KEYS.minPrice) || '',
      maxPrice: searchParams.get(KEYS.maxPrice) || '',
      propertyType: searchParams.get(KEYS.propertyType) || '',
      kosherLevel: searchParams.get(KEYS.kosherLevel) || '',
      viewType: searchParams.get(KEYS.viewType) || '',
      amenities: amenitiesRaw ? amenitiesRaw.split(',').filter(Boolean) : [],
      sort: searchParams.get(KEYS.sort) || 'recommended',
    };
  }, [searchParams]);

  const setFilter = useCallback((patch) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [field, value] of Object.entries(patch)) {
        const key = KEYS[field];
        if (!key) continue;
        // Selecting a new region invalidates a city chosen under the old one.
        if (field === 'region' && next.get(KEYS.city) && value !== next.get(KEYS.region)) {
          next.delete(KEYS.city);
        }
        if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
          next.delete(key);
        } else {
          next.set(key, Array.isArray(value) ? value.join(',') : String(value));
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const toggleAmenity = useCallback((value) => {
    const current = filters.amenities;
    const next = current.includes(value) ? current.filter((a) => a !== value) : [...current, value];
    setFilter({ amenities: next });
  }, [filters.amenities, setFilter]);

  const clearAll = useCallback(() => setSearchParams(new URLSearchParams(), { replace: true }), [setSearchParams]);

  const clearField = useCallback((field) => setFilter({ [field]: EMPTY[field] }), [setFilter]);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.region) n++;
    if (filters.city) n++;
    if (filters.checkIn && filters.checkOut) n++;
    if (filters.guests) n++;
    if (filters.bedrooms) n++;
    if (filters.minPrice || filters.maxPrice) n++;
    if (filters.propertyType) n++;
    if (filters.kosherLevel) n++;
    if (filters.viewType) n++;
    n += filters.amenities.length;
    return n;
  }, [filters]);

  const apiFilters = useMemo(() => ({
    region: filters.region || undefined,
    city: filters.city || undefined,
    property_type: filters.propertyType || undefined,
    min_guests: filters.guests || undefined,
    bedrooms: filters.bedrooms || undefined,
    min_price: filters.minPrice || undefined,
    max_price: filters.maxPrice || undefined,
    kosher_level: filters.kosherLevel || undefined,
    view_type: filters.viewType || undefined,
    amenities: filters.amenities,
    check_in: filters.checkIn && filters.checkOut ? filters.checkIn : undefined,
    check_out: filters.checkIn && filters.checkOut ? filters.checkOut : undefined,
    sort: filters.sort && filters.sort !== 'recommended' ? filters.sort : undefined,
  }), [filters]);

  return { filters, setFilter, toggleAmenity, clearAll, clearField, activeCount, apiFilters, hasActiveFilters: activeCount > 0 };
}
