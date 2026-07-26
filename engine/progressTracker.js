// In-memory live-progress snapshot for the currently running engine pass — same pattern as
// costLogger.js's session counters. /admin/engine/status reads this while a run is in progress
// so the panel can show real numbers (domains discovered/classified/approved, pages fetched/
// extracted/rejected, properties saved) as they happen, not just a final snapshot once the whole
// run (which can take minutes against real sites) finishes.
let current = null;

export function startProgress({ domainsDiscovered = 0, classified = 0, approved = 0 } = {}) {
  current = {
    domainsDiscovered,
    classified,
    approved,
    pagesFetched: 0,
    pagesExtracted: 0,
    pagesRejected: 0,
    propertiesCreated: 0,
    propertiesUpdated: 0,
    propertiesRejected: 0,
    recentRejections: [], // { site, reason }, most recent first, capped
  };
}

export function updateProgress(patch) {
  if (!current) return;
  Object.assign(current, patch);
}

const MAX_RECENT_REJECTIONS = 12;

export function pushRejection(site, reason) {
  if (!current) return;
  current.recentRejections.unshift({ site, reason });
  if (current.recentRejections.length > MAX_RECENT_REJECTIONS) current.recentRejections.length = MAX_RECENT_REJECTIONS;
}

export function getProgress() {
  return current;
}

export function clearProgress() {
  current = null;
}
