/**
 * FlightSourceInterface — the contract every flight-data source (adapter) must implement.
 * This is the "Strategy" interface in the Strategy Pattern: DealScanner depends only on this
 * shape, never on a concrete provider, so new sources (Duffel, Kiwi Tequila, ...) can be added
 * by writing a new adapter and registering it — no existing code needs to change.
 */
export class FlightSourceInterface {
  /** Unique, stable identifier for this source, e.g. "amadeus". */
  get name() {
    throw new Error('FlightSourceInterface.name must be implemented by subclass');
  }

  /**
   * Search flights and return a normalized array of offers.
   * @param {string} origin - IATA airport/city code, e.g. "TLV"
   * @param {string} destination - IATA airport/city code, e.g. "BCN"
   * @param {string} date - ISO date string "YYYY-MM-DD"
   * @returns {Promise<NormalizedFlightOffer[]>}
   */
  // eslint-disable-next-line no-unused-vars
  async searchFlights(origin, destination, date) {
    throw new Error('searchFlights() must be implemented by subclass');
  }
}

/**
 * @typedef {Object} NormalizedFlightOffer
 * @property {string} source        - adapter name that produced this offer
 * @property {string} origin
 * @property {string} destination
 * @property {string} departureDate - ISO date
 * @property {number} price         - total price as a plain number
 * @property {string} currency      - ISO currency code, e.g. "USD"
 * @property {number} stops
 * @property {string} carrier       - airline IATA code
 * @property {string} bookingUrl    - deep link / reference, if provided by the source
 * @property {string} rawId         - source-specific offer id (for audit/debug)
 */
