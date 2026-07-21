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

/** XHR (not fetch) — fetch has no upload-progress event, and 7.4 wants a real progress bar. */
function uploadFileWithProgress(path, file, token, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body);
      else reject(new Error(body.error || `Upload failed with status ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Upload failed'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
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
  changePassword: (token, current_password, new_password) => patchJson('/agents/me/password', { current_password, new_password }, token),
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
  markPurchased: (token, id) => postJson(`/agents/me/deals/${id}/purchased`, {}, token),
  getMyStats: (token) => getJson('/agents/me/stats', token),
  deleteMe: (token) => deleteReq('/agents/me', token),
};

// ── Property API (zimmer/villa platform) ───────────────────────────────────────

function buildQuery(params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    q.set(k, Array.isArray(v) ? v.join(',') : String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const propertyApi = {
  search: (filters = {}) => getJson(`/properties${buildQuery(filters)}`),
  cities: (region) => getJson(`/properties/cities${buildQuery({ region })}`),
  get: (id) => getJson(`/properties/${id}`),
  getMine: (token) => getJson('/properties/mine', token),
  getOneMine: (token, id) => getJson(`/properties/${id}/mine`, token),
  create: (token, data) => postJson('/properties', data, token),
  update: (token, id, data) => patchJson(`/properties/${id}`, data, token),
  getAvailability: (id, range = {}) => getJson(`/properties/${id}/availability${buildQuery(range)}`),
  setAvailability: (token, id, dates) => patchJson(`/properties/${id}/availability`, { dates }, token),
  requestBooking: (id, data) => postJson(`/properties/${id}/booking-requests`, data),
  getBookingRequests: (token, id) => getJson(`/properties/${id}/booking-requests`, token),
  getMyBookingRequests: (token) => getJson('/properties/booking-requests/mine', token),
  setBookingRequestStatus: (token, bookingId, status) => patchJson(`/properties/booking-requests/${bookingId}/status`, { status }, token),
  getByOwnerSlug: (slug) => getJson(`/properties/by-owner/${slug}`),
  requestClaim: (token, id) => postJson(`/properties/${id}/claim/request`, {}, token),
  verifyClaim: (token, id, code) => postJson(`/properties/${id}/claim/verify`, { code }, token),
  createUnit: (token, propertyId, data) => postJson(`/properties/${propertyId}/units`, data, token),
  updateUnit: (token, propertyId, unitId, data) => patchJson(`/properties/${propertyId}/units/${unitId}`, data, token),
  duplicateUnit: (token, propertyId, unitId) => postJson(`/properties/${propertyId}/units/${unitId}/duplicate`, {}, token),
  deleteUnit: (token, propertyId, unitId) => deleteReq(`/properties/${propertyId}/units/${unitId}`, token),
  reorderUnits: (token, propertyId, orderedIds) => patchJson(`/properties/${propertyId}/units/reorder`, { orderedIds }, token),
  getPublishChecklist: (token, id) => getJson(`/properties/${id}/publish-checklist`, token),
  publish: (token, id) => postJson(`/properties/${id}/publish`, {}, token),
  delete: (token, id) => deleteReq(`/properties/${id}`, token),
  restore: (token, id) => postJson(`/properties/${id}/restore`, {}, token),
  getTrash: (token) => getJson('/properties/trash/mine', token),
};

export const uploadApi = {
  propertyImage: (token, file, onProgress) => uploadFileWithProgress('/uploads/property-image', file, token, onProgress),
};

export const removeApi = {
  request: (data) => postJson('/remove/request', data),
  verify: (data) => postJson('/remove/verify', data),
};

export const userApi = {
  register: (data) => postJson('/users/register', data),
  login: (email, password) => postJson('/users/login', { email, password }),
  googleAuth: (credential) => postJson('/users/google', { credential }),
  deleteMe: (token) => deleteReq('/users/me', token),
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
  getAnalytics: (tok, year, month) => getJson(`/admin/analytics?year=${year}&month=${month}`, tok),
  getPendingPropertyClaims: (tok) => getJson('/admin/properties/pending', tok),
  approvePropertyClaim: (tok, id) => postJson(`/admin/properties/${id}/approve`, {}, tok),
  rejectPropertyClaim: (tok, id) => postJson(`/admin/properties/${id}/reject`, {}, tok),
  getPropertyReviewQueue: (tok) => getJson('/admin/properties/review-queue', tok),
  approveAutoProperty: (tok, id) => postJson(`/admin/properties/${id}/approve-auto`, {}, tok),
  rejectAutoProperty: (tok, id) => postJson(`/admin/properties/${id}/reject-auto`, {}, tok),
  getPropertyStats: (tok) => getJson('/admin/properties/stats', tok),
  runEngine: (tok) => postJson('/admin/engine/run', {}, tok),
  runEngineLive: (tok, roundSize) => postJson('/admin/engine/run-live', { roundSize }, tok),
  getEngineStatus: (tok) => getJson('/admin/engine/status', tok),
  getEngineRuns: (tok) => getJson('/admin/engine/runs', tok),
  emergencyStopEngine: (tok) => postJson('/admin/engine/emergency-stop', {}, tok),
  clearEmergencyStopEngine: (tok) => postJson('/admin/engine/emergency-stop/clear', {}, tok),
  getEngineQueries: (tok, status) => getJson(`/admin/engine/queries${status ? `?status=${status}` : ''}`, tok),
  syncEngineQueries: (tok) => postJson('/admin/engine/queries/sync', {}, tok),
  getRefreshCandidates: (tok) => getJson('/admin/engine/refresh-candidates', tok),
  getUsers: (tok) => getJson('/admin/users', tok),
  deleteAgent: (tok, id) => deleteReq(`/admin/agents/${id}`, tok),
  deleteUser: (tok, id) => deleteReq(`/admin/users/${id}`, tok),
  hardDeleteProperty: (tok, id) => deleteReq(`/admin/properties/${id}`, tok),
};
