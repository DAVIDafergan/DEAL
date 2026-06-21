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
