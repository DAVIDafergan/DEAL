const STORAGE_KEY = 'deal_radar_my_bookings';

/** 9.6: local "my bookings" list — a guest never has to register to track a request (the
 * server keys status by an unguessable tracking_token), but we still want a personal list of
 * "requests I made" on this device/browser. Pure client-side convenience, not an account. */
export function saveTrackedBooking({ trackingToken, propertyName, checkIn, checkOut }) {
  const list = listTrackedBookings();
  const next = [{ trackingToken, propertyName, checkIn, checkOut, savedAt: Date.now() }, ...list.filter((b) => b.trackingToken !== trackingToken)];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 30)));
}

export function listTrackedBookings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
