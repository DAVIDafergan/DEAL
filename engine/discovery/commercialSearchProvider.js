import { getCachedResults, setCachedResults } from './searchResultCache.js';

/**
 * Real SearchProvider implementations (Step 8.1). Every one of these makes a real HTTP call to
 * a commercial search API — none of them are ever invoked unless SEARCH_API_KEY is set (see
 * createCommercialSearchProvider below, and server/routes/admin.js's live-run route, which is
 * the only caller and refuses to start without a key). Until a key is provided, this file is
 * dead code by construction, not just by convention.
 */

class BraveSearchProvider {
  constructor(apiKey) { this.apiKey = apiKey; }

  async search(query, opts = {}) {
    const cached = getCachedResults(query);
    if (cached) return cached;

    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${opts.count || 10}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'X-Subscription-Token': this.apiKey },
    });
    if (!res.ok) throw new Error(`Brave Search API error: ${res.status} ${await res.text().catch(() => '')}`);
    const data = await res.json();
    const results = (data.web?.results || []).map((r) => ({ url: r.url, title: r.title || '', snippet: r.description || '' }));
    setCachedResults(query, results);
    return results;
  }
}

class SerperSearchProvider {
  constructor(apiKey) { this.apiKey = apiKey; }

  async search(query, opts = {}) {
    const cached = getCachedResults(query);
    if (cached) return cached;

    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': this.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: opts.count || 10, gl: 'il', hl: 'iw' }),
    });
    if (!res.ok) throw new Error(`Serper API error: ${res.status} ${await res.text().catch(() => '')}`);
    const data = await res.json();
    const results = (data.organic || []).map((r) => ({ url: r.link, title: r.title || '', snippet: r.snippet || '' }));
    setCachedResults(query, results);
    return results;
  }
}

class GoogleCseSearchProvider {
  constructor(apiKey, cx) { this.apiKey = apiKey; this.cx = cx; }

  async search(query, opts = {}) {
    if (!this.cx) throw new Error('GoogleCseSearchProvider requires SEARCH_CSE_ID');
    const cached = getCachedResults(query);
    if (cached) return cached;

    const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&cx=${this.cx}&num=${Math.min(opts.count || 10, 10)}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Google CSE error: ${res.status} ${await res.text().catch(() => '')}`);
    const data = await res.json();
    const results = (data.items || []).map((r) => ({ url: r.link, title: r.title || '', snippet: r.snippet || '' }));
    setCachedResults(query, results);
    return results;
  }
}

/** Returns null (not a provider that throws on first use) when SEARCH_API_KEY isn't configured
 * — every caller must treat null as "commercial search is unavailable" and either fall back to
 * SeedSourceProvider or refuse to start a live run. */
export function createCommercialSearchProvider(env = process.env) {
  const apiKey = env.SEARCH_API_KEY;
  if (!apiKey) return null;
  const provider = (env.SEARCH_PROVIDER || 'brave').toLowerCase();
  if (provider === 'serper') return new SerperSearchProvider(apiKey);
  if (provider === 'google_cse') return new GoogleCseSearchProvider(apiKey, env.SEARCH_CSE_ID);
  return new BraveSearchProvider(apiKey);
}

export const _internal = { BraveSearchProvider, SerperSearchProvider, GoogleCseSearchProvider };
