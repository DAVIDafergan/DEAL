const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function getJson(path, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

async function postJson(path, data, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(data) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `POST to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

async function patchJson(path, data, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'PATCH', headers, body: JSON.stringify(data) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `PATCH to ${path} failed with status ${res.status}`);
  }
  return res.json();
}

async function deleteReq(path, token = null) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(`DELETE to ${path} failed with status ${res.status}`);
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

// ── Agent API ────────────────────────────────────────────────────────────────

export const agentApi = {
  register: (data) => postJson('/agents/register', data),
  login: (email, password) => postJson('/agents/login', { email, password }),
  googleAuth: (credential) => postJson('/agents/google', { credential }),
  getMe: (token) => getJson('/agents/me', token),
  updateMe: (token, data) => patchJson('/agents/me', data, token),
  getDeals: (token) => getJson('/agents/me/deals', token),
  createDeal: (token, data) => postJson('/agents/me/deals', data, token),
  updateDeal: (token, id, data) => patchJson(`/agents/me/deals/${id}`, data, token),
  deleteDeal: (token, id) => deleteReq(`/agents/me/deals/${id}`, token),
  getMedia: (token, iataCode) => getJson(`/agents/media/${iataCode}`, token),
  getPublicProfile: (slug) => getJson(`/agents/profile/${slug}`),
  getApprovedDeals: () => getJson('/agents/deals/approved'),
  getTopValueDeals: (limit = 5) => getJson(`/agents/deals/top-value?limit=${limit}`),
  trackClick: (id) => postJson(`/agents/deals/${id}/click`, {}),
  getRatings: (agentId) => getJson(`/agents/${agentId}/ratings`),
  getMyRating: (agentId, sessionId) => getJson(`/agents/${agentId}/my-rating?session_id=${encodeURIComponent(sessionId)}`),
  rateAgent: (agentId, sessionId, rating) => postJson(`/agents/${agentId}/rate`, { session_id: sessionId, rating }),
  getMyRatings: (sessionId) => getJson(`/agents/my-ratings?session_id=${encodeURIComponent(sessionId)}`),
};

export const billingApi = {
  getPlans: () => getJson('/billing/plans'),
  checkout: (token, tier) => postJson('/billing/checkout', { tier }, token),
  portal: (token) => postJson('/billing/portal', {}, token),
};

const ADMIN_TOKEN_KEY = 'deal_radar_admin_token';

export const adminApi = {
  getToken: () => sessionStorage.getItem(ADMIN_TOKEN_KEY),
  setToken: (t) => sessionStorage.setItem(ADMIN_TOKEN_KEY, t),
  clearToken: () => sessionStorage.removeItem(ADMIN_TOKEN_KEY),
  login: (username, password) => postJson('/admin/auth/login', { username, password }),
  getPendingAgents: (tok) => getJson('/admin/agents/pending', tok),
  getAllAgents: (tok) => getJson('/admin/agents', tok),
  approveAgent: (tok, id) => postJson(`/admin/agents/${id}/approve`, {}, tok),
  rejectAgent: (tok, id, reason) => postJson(`/admin/agents/${id}/reject`, { reason }, tok),
  getPendingDeals: (tok) => getJson('/admin/deals/pending', tok),
  getApprovedDeals: (tok) => getJson('/admin/deals/approved', tok),
  approveDeal: (tok, id) => postJson(`/admin/deals/${id}/approve`, {}, tok),
  rejectDeal: (tok, id, reason) => postJson(`/admin/deals/${id}/reject`, { reason }, tok),
  deleteDeal: (tok, id) => deleteReq(`/admin/deals/${id}`, tok),
};
