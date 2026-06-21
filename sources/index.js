import { AmadeusAdapter } from './AmadeusAdapter.js';

/**
 * SourceRegistry — implements the Strategy Pattern at the registry level.
 * DealScanner (and anything else) only ever talks to this registry, never to a concrete
 * adapter directly. Adding a new source (Duffel, Kiwi Tequila, ...):
 *   1. Create sources/DuffelAdapter.js implementing FlightSourceInterface
 *   2. register it below (or via registerSource() at runtime)
 * No existing code needs to change.
 */
class SourceRegistry {
  constructor() {
    /** @type {Map<string, import('./FlightSourceInterface.js').FlightSourceInterface>} */
    this._sources = new Map();
  }

  registerSource(adapter) {
    this._sources.set(adapter.name, adapter);
  }

  getSource(name) {
    return this._sources.get(name);
  }

  listSources() {
    return Array.from(this._sources.values());
  }

  /** מריץ חיפוש בכל המקורות המוגדרים במקביל, ומתעלם בעדינות ממקור שנכשל או לא מוגדר */
  async searchAll(origin, destination, date) {
    const results = await Promise.allSettled(
      this.listSources().map((source) => source.searchFlights(origin, destination, date))
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }
}

export const sourceRegistry = new SourceRegistry();

/** אתחול המקורות הזמינים על בסיס משתני סביבה */
export function initializeSources(env = process.env) {
  const amadeus = new AmadeusAdapter({
    apiKey: env.AMADEUS_API_KEY,
    apiSecret: env.AMADEUS_API_SECRET,
  });

  if (amadeus.isConfigured()) {
    sourceRegistry.registerSource(amadeus);
  }

  return sourceRegistry;
}

export { FlightSourceInterface } from './FlightSourceInterface.js';
export { AmadeusAdapter } from './AmadeusAdapter.js';
