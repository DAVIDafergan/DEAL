const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

export function fetchDeals(lang, { sorted = false } = {}) {
  return getJson(`/deals?lang=${lang}${sorted ? '&sorted=true' : ''}`);
}

export function fetchVibeFeed(vibe, lang) {
  return getJson(`/deals/feed?vibe=${vibe}&lang=${lang}`);
}

export function fetchStats() {
  return getJson('/stats');
}

/** מחזיר null בעדינות אם אין תמונה (404) — לא נחשב שגיאה, פשוט נופלים ל-gradient placeholder */
export async function fetchDestinationImage(iataCode) {
  const res = await fetch(`${API_BASE}/images/${iataCode}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request to /images/${iataCode} failed with status ${res.status}`);
  return res.json();
}

export function fetchPublicConfig() {
  return getJson('/config');
}

export function fetchPopularPackages() {
  return getJson('/packages/popular');
}

/** בדיקה חיה ממש לפני לחיצת "הזמן" — ראו core/validation/dealValidator.js למגבלות האמיתיות */
export function validateDealLive({ origin, destination, departureDate, returnDate, price }) {
  const params = new URLSearchParams({ origin, destination, departureDate, price: String(price) });
  if (returnDate) params.set('returnDate', returnDate);
  return getJson(`/deals/validate-live?${params.toString()}`);
}

/** "Live Deal Engine" — בונה דיל מלא בזמן אמת. ראו core/validation/liveDealBuilder.js */
export function buildLiveDeal({ origin, destination, departureDate, returnDate, peopleCount = 2 }) {
  const params = new URLSearchParams({ origin, destination, departureDate, peopleCount: String(peopleCount) });
  if (returnDate) params.set('returnDate', returnDate);
  return getJson(`/deals/build-live?${params.toString()}`);
}

export async function submitQuestionnaire(answers) {
  const res = await fetch(`${API_BASE}/packages/personalized`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answers),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate personalized packages (status ${res.status})`);
  }
  return res.json();
}

export async function createPersonalRadar(payload) {
  const res = await fetch(`${API_BASE}/personal-radar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Failed to create personal radar (status ${res.status})`);
  }
  return res.json();
}
