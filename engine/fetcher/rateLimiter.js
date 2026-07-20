const MAX_CONCURRENT_PER_DOMAIN = 2;
const MIN_DELAY_MS = 2000;
const MAX_DELAY_MS = 5000;

const domainState = new Map(); // domain -> { active, lastRequestAt }

function getState(domain) {
  if (!domainState.has(domain)) domainState.set(domain, { active: 0, lastRequestAt: 0 });
  return domainState.get(domain);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Blocks until it's safe to issue a request to `domain`: at most 2 concurrent, and a random
 * 2-5s courtesy delay since the last request to that same domain (Step 3.2 "התנהגות מכבדת"). */
export async function acquireSlot(domain) {
  const state = getState(domain);
  while (state.active >= MAX_CONCURRENT_PER_DOMAIN) {
    await sleep(200);
  }
  const elapsed = Date.now() - state.lastRequestAt;
  const requiredDelay = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
  if (state.lastRequestAt > 0 && elapsed < requiredDelay) {
    await sleep(requiredDelay - elapsed);
  }
  state.active += 1;
  state.lastRequestAt = Date.now();
}

export function releaseSlot(domain) {
  const state = getState(domain);
  state.active = Math.max(0, state.active - 1);
}

export function _resetRateLimiter() {
  domainState.clear();
}
