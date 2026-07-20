/**
 * SearchProvider interface: async search(query) -> [{ url, title, snippet }]
 *
 * LocalFixtureSearchProvider is the ONLY provider wired up in this repo — it never makes a
 * network request. It exists purely so the Discovery module's real logic (query matrix,
 * domain extraction, portal filtering, dedup) can be exercised end-to-end in dry-run mode
 * without ever touching a real search engine, per this session's hard constraint against
 * scraping/querying real sites.
 *
 * To go live: implement a RealSearchProvider here backed by a real search API (Google
 * Programmable Search / Bing Web Search / SerpAPI all work) and swap it in
 * engine/pipeline.js. See SESSION-REPORT.md for exactly what that involves.
 */
export class LocalFixtureSearchProvider {
  /** @param {Record<string, {url:string,title:string,snippet:string}[]>} fixtureIndex */
  constructor(fixtureIndex = {}) {
    this.fixtureIndex = fixtureIndex;
    this.queriesRun = [];
  }

  async search(query) {
    this.queriesRun.push(query);
    // Deterministic fallback: any query containing a fixture's keyword returns that fixture.
    // Keeps the matrix's ~324 real query strings flowing through the pipeline even though only
    // a handful of keywords have canned results — mirrors "some queries return nothing" in reality.
    const results = [];
    for (const [keyword, fixtureResults] of Object.entries(this.fixtureIndex)) {
      if (query.includes(keyword)) results.push(...fixtureResults);
    }
    return results;
  }
}
