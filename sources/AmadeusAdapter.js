import axios from 'axios';
import { FlightSourceInterface } from './FlightSourceInterface.js';

const AMADEUS_AUTH_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

/** מפענח משך זמן בפורמט ISO8601 ("PT3H45M") לדקות. מחזיר null אם הפורמט לא תקין — לא ממציא ערך */
function parseIso8601DurationToMinutes(iso) {
  if (!iso) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  return hours * 60 + minutes;
}

/**
 * AmadeusAdapter — official Amadeus Self-Service API integration (free tier, test environment).
 * Uses OAuth2 client-credentials flow. No scraping, no unofficial endpoints.
 */
export class AmadeusAdapter extends FlightSourceInterface {
  constructor({ apiKey, apiSecret } = {}) {
    super();
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this._token = null;
    this._tokenExpiresAt = 0;
  }

  get name() {
    return 'amadeus';
  }

  /** האם הוגדרו מפתחות API — בלי זה אין טעם לקרוא ל-Amadeus */
  isConfigured() {
    return Boolean(this.apiKey && this.apiSecret);
  }

  /** מימוש Client Credentials Grant, עם caching של הטוקן עד לפקיעתו */
  async _getAccessToken() {
    if (this._token && Date.now() < this._tokenExpiresAt) {
      return this._token;
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.apiKey,
      client_secret: this.apiSecret,
    });

    const { data } = await axios.post(AMADEUS_AUTH_URL, body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    this._token = data.access_token;
    // expires_in is in seconds; keep a 30s safety margin before renewing
    this._tokenExpiresAt = Date.now() + (data.expires_in - 30) * 1000;
    return this._token;
  }

  async searchFlights(origin, destination, date) {
    if (!this.isConfigured()) {
      throw new Error('AmadeusAdapter is not configured: missing AMADEUS_API_KEY / AMADEUS_API_SECRET');
    }

    const token = await this._getAccessToken();

    const { data } = await axios.get(AMADEUS_SEARCH_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: date,
        adults: 1,
        currencyCode: 'USD',
        max: 20,
      },
    });

    return (data.data || []).map((offer) => this._normalize(offer, origin, destination, date));
  }

  /** מתרגם תשובת Amadeus הגולמית למבנה האחיד שמשותף לכל מקורות הנתונים */
  _normalize(offer, origin, destination, date) {
    const firstItinerary = offer.itineraries?.[0];
    const segments = firstItinerary?.segments || [];
    const firstSegment = segments[0];
    const lastSegment = segments[segments.length - 1];
    const stops = (segments.length || 1) - 1;

    return {
      source: this.name,
      origin,
      destination,
      departureDate: date,
      departureTime: firstSegment?.departure?.at || null,
      arrivalTime: lastSegment?.arrival?.at || null,
      durationMinutes: parseIso8601DurationToMinutes(firstItinerary?.duration),
      price: Number(offer.price?.total ?? offer.price?.grandTotal ?? 0),
      currency: offer.price?.currency || 'USD',
      stops,
      carrier: firstSegment?.carrierCode || 'XX',
      bookingUrl: '',
      rawId: offer.id,
    };
  }
}
