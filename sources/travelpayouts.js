import axios from 'axios';
import { FlightSourceInterface } from './FlightSourceInterface.js';

const TRAVELPAYOUTS_API_URL = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
const AVIASALES_BASE_URL = 'https://www.aviasales.com';
const REQUEST_TIMEOUT_MS = 10000;

/** מוסיף דקות לזמן ISO ומחזיר ISO חדש. מחזיר null אם אחד מהקלטים לא תקין — לא ממציא זמן הגעה */
function addMinutesToIso(isoString, minutes) {
  if (!isoString || !Number.isFinite(minutes)) return null;
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + minutes * 60000).toISOString();
}

/**
 * TravelpayoutsAdapter — אינטגרציה רשמית עם Travelpayouts Flight Data API (מבוסס Aviasales).
 * אין web scraping — רק קריאת API רשמית עם טוקן שותפים (Partner API token).
 *
 * חשוב: כל לינק רכישה שמוחזר כולל את ה-Marker ID של השותף (`marker=`), כי בלעדיו לא
 * נזקפת עמלת אפיליאייט על הזמנות שמתבצעות דרך הלינק.
 *
 * Official Travelpayouts Flight Data API integration (Aviasales-backed). No scraping —
 * partner API token only. Every booking link includes the affiliate marker so commission
 * is correctly attributed.
 */
export class TravelpayoutsAdapter extends FlightSourceInterface {
  constructor({ apiToken, marker } = {}) {
    super();
    this.apiToken = apiToken;
    this.marker = marker;
  }

  get name() {
    return 'travelpayouts';
  }

  /** האם הוגדרו טוקן API ו-Marker — בלי שניהם אין טעם לקרוא ל-Travelpayouts */
  isConfigured() {
    return Boolean(this.apiToken && this.marker);
  }

  async searchFlights(origin, destination, date) {
    if (!this.isConfigured()) {
      throw new Error('TravelpayoutsAdapter is not configured: missing TRAVELPAYOUTS_API_TOKEN / TRAVELPAYOUTS_MARKER');
    }

    let response;
    try {
      response = await axios.get(TRAVELPAYOUTS_API_URL, {
        params: {
          origin,
          destination,
          departure_at: date,
          currency: 'usd',
          token: this.apiToken,
          limit: 20,
          sorting: 'price',
          one_way: true,
        },
        timeout: REQUEST_TIMEOUT_MS,
      });
    } catch (err) {
      // Rate limit (429) הוא מצב צפוי בשימוש תקין — מטפלים בו בעדינות ולא מפילים את הסריקה
      if (err.response?.status === 429) {
        return [];
      }
      // כל כשלון רשת/שרת אחר — נכשל בנימוס; SourceRegistry.searchAll מתעלם ממקור שנכשל
      throw new Error(`TravelpayoutsAdapter request failed: ${err.message}`);
    }

    const offers = response?.data?.data;

    // תשובה ריקה או לא תקנית — אין הצעות למסלול הזה, לא שגיאה
    if (!Array.isArray(offers) || offers.length === 0) {
      return [];
    }

    const currency = response.data.currency || 'usd';

    return offers
      .filter((offer) => offer && typeof offer.price === 'number')
      .map((offer) => this._normalize(offer, origin, destination, date, currency));
  }

  /**
   * חיפוש טיסה הלוך-חזור (round trip) — לצורך מנוע החבילות. נפרד מ-searchFlights() הרגיל
   * (one-way) כדי לא לשנות התנהגות קיימת של סריקת האנומליות. אותו endpoint, רק עם תאריך
   * חזור ו-one_way=false.
   */
  async searchRoundTripFlights(origin, destination, departureDate, returnDate) {
    if (!this.isConfigured()) {
      throw new Error('TravelpayoutsAdapter is not configured: missing TRAVELPAYOUTS_API_TOKEN / TRAVELPAYOUTS_MARKER');
    }

    let response;
    try {
      response = await axios.get(TRAVELPAYOUTS_API_URL, {
        params: {
          origin,
          destination,
          departure_at: departureDate,
          return_at: returnDate,
          currency: 'usd',
          token: this.apiToken,
          limit: 10,
          sorting: 'price',
          one_way: false,
        },
        timeout: REQUEST_TIMEOUT_MS,
      });
    } catch (err) {
      if (err.response?.status === 429) return [];
      throw new Error(`TravelpayoutsAdapter round-trip request failed: ${err.message}`);
    }

    const offers = response?.data?.data;
    if (!Array.isArray(offers) || offers.length === 0) return [];

    const currency = response.data.currency || 'usd';

    return offers
      .filter((offer) => offer && typeof offer.price === 'number')
      .map((offer) => this._normalizeRoundTrip(offer, origin, destination, departureDate, returnDate, currency));
  }

  /** מתרגם הצעת הלוך-חזור גולמית — שדות return_* נוספים מעבר ל-_normalize() הרגיל */
  _normalizeRoundTrip(offer, origin, destination, departureDate, returnDate, currency) {
    const base = this._normalize(offer, origin, destination, departureDate, currency);
    return {
      ...base,
      returnDate: offer.return_at ? offer.return_at.slice(0, 10) : returnDate,
      returnDepartureTime: offer.return_at || null,
      // אין לנו משך זמן אמין למקטע החזור מה-API — לא ממציאים זמן הגעה
      returnArrivalTime: null,
      returnStops: Number(offer.return_transfers ?? 0),
    };
  }

  /** מתרגם הצעת מחיר גולמית מ-Travelpayouts למבנה האחיד שמשותף לכל מקורות הנתונים */
  _normalize(offer, origin, destination, date, currency) {
    const durationMinutes = Number.isFinite(offer.duration) ? offer.duration : null;

    return {
      source: this.name,
      origin,
      destination,
      departureDate: offer.departure_at ? offer.departure_at.slice(0, 10) : date,
      departureTime: offer.departure_at || null,
      arrivalTime: addMinutesToIso(offer.departure_at, durationMinutes),
      durationMinutes,
      price: Number(offer.price),
      currency: currency.toUpperCase(),
      stops: Number(offer.transfers ?? 0),
      carrier: offer.airline || 'XX',
      bookingUrl: this._buildBookingUrl(offer.link),
      rawId: `${offer.airline || 'XX'}${offer.flight_number || ''}-${offer.departure_at || date}`,
    };
  }

  /**
   * בונה לינק רכישה עם ה-Marker ID של השותף, כדי שעמלת האפיליאייט תיזקף כראוי.
   * Builds the purchase link with the partner's marker so affiliate commission is tracked.
   */
  _buildBookingUrl(link) {
    if (!link) return '';
    const separator = link.includes('?') ? '&' : '?';
    return `${AVIASALES_BASE_URL}${link}${separator}marker=${this.marker}`;
  }
}
