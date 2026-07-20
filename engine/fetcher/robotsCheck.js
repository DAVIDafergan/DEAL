import robotsParser from 'robots-parser';

export const USER_AGENT = 'DealimBot/1.0 (+https://dealim.org/bot)';

const ROBOTS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // robots.txt itself, not the page cache (30d)
const robotsCache = new Map(); // host -> { parser, fetchedAt }

/**
 * Robots.txt compliance is mandatory and enforced in code (Step 5.5), not just a guideline.
 * `fetchImpl` is injectable so dry-run tests can point this at a local fixture server instead
 * of the real internet.
 */
export async function isAllowedByRobots(pageUrl, fetchImpl = fetch) {
  const url = new URL(pageUrl);
  const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
  const cacheKey = url.host;

  let entry = robotsCache.get(cacheKey);
  if (!entry || Date.now() - entry.fetchedAt > ROBOTS_CACHE_TTL_MS) {
    let body = '';
    try {
      const res = await fetchImpl(robotsUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(10000) });
      if (res.ok) body = await res.text();
    } catch {
      // Unreachable robots.txt is treated as "allow all" (standard convention) — a domain that
      // blocks us at the network level entirely will fail the page fetch itself regardless.
      body = '';
    }
    entry = { parser: robotsParser(robotsUrl, body), fetchedAt: Date.now() };
    robotsCache.set(cacheKey, entry);
  }

  return entry.parser.isAllowed(pageUrl, USER_AGENT) !== false;
}

export function _clearRobotsCache() {
  robotsCache.clear();
}
