import { setPropertyCoordinatesIfMissing } from '../store/propertyStore.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

/** 9.1: replaces manual map-pin placement. Owners now only enter region/city/address text —
 * this best-effort background job resolves that into lat/lng via OpenStreetMap Nominatim
 * (free, no API key) so the schema still carries coordinates for future map/sort features.
 * Always fire-and-forget: never awaited by the request/response cycle, never throws outward,
 * and silently no-ops without network access (same degrade-gracefully pattern as
 * emailService.js / complianceMessaging.js elsewhere in this codebase). */
export async function geocodePropertyInBackground(propertyId, { city, region, address }) {
  if (!city && !address) return;
  const query = [address, city, region ? regionNameForQuery(region) : null, 'Israel']
    .filter(Boolean)
    .join(', ');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=il&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DealRadarPro/1.0 (property listing geocoding; contact: da@101.org.il)' },
    });
    clearTimeout(timeout);
    if (!res.ok) return;
    const results = await res.json();
    const first = results?.[0];
    if (!first) return;
    const lat = Number(first.lat);
    const lng = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    await setPropertyCoordinatesIfMissing(propertyId, lat, lng);
  } catch (err) {
    // Network unavailable, DNS blocked in sandboxed environments, rate-limited, etc. — a missing
    // lat/lng is a soft feature gap (future map/sort), never a user-facing failure.
    console.warn(`[geocode] best-effort geocoding failed for property ${propertyId}:`, err.message);
  }
}

const REGION_QUERY_NAMES = {
  north: 'הצפון', galilee: 'הגליל', golan: 'רמת הגולן', carmel: 'הכרמל', center: 'המרכז',
  jerusalem: 'ירושלים', south: 'הדרום', dead_sea: 'ים המלח', eilat: 'אילת',
};

function regionNameForQuery(region) {
  return REGION_QUERY_NAMES[region] || '';
}
