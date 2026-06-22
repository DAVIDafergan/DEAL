const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

export function fetchDeals(lang) {
  return getJson(`/deals?lang=${lang}`);
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
