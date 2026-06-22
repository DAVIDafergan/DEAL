import crypto from 'node:crypto';
import { getPool } from '../../core/db/index.js';

/**
 * DealsStore — מאגר הדילים בטבלת deals (MySQL). שורד restart של השרת — זו הסיבה שעברנו ל-MySQL.
 *
 * שני סוגי דיל, מסומנים בבירור בשדה type:
 *   - 'anomaly': חריגת מחיר מוכחת מול היסטוריה (מזהה ייחודי לכל גילוי, מצטבר כפיד).
 *   - 'live_price': המחיר הזול ביותר שנמצא כרגע למסלול, ללא תלות בהיסטוריה — מזהה דטרמיניסטי
 *     לפי מסלול (live_<origin>_<destination>), כך שכל סריקה מרעננת (UPSERT) את אותה שורה
 *     במקום לצבור כפילויות.
 *
 * Persists to the `deals` MySQL table — survives server restarts. Two deal types, explicitly
 * tagged via `type`: 'anomaly' (proven historical deviation, accumulates over time) vs.
 * 'live_price' (current cheapest price per route, upserted on every scan refresh).
 */

function buildLivePriceId(origin, destination) {
  return `live_${origin}_${destination}`.toUpperCase();
}

/**
 * @param {{type: 'anomaly'|'live_price', offer: object, analysis: object|null, narrative: {he,en,es}}} dealData
 */
export async function addDeal({ type, offer, analysis = null, narrative }) {
  const id = type === 'live_price' ? buildLivePriceId(offer.origin, offer.destination) : crypto.randomUUID();
  const now = new Date();
  const pool = getPool();

  try {
    await pool.query(
      `INSERT INTO deals (
         id, type, origin, destination, departure_date, departure_at, arrival_at, duration_minutes,
         return_date, return_departure_at, return_stops,
         price, currency, carrier, stops, source,
         booking_url, moving_average, z_score, enforcement_likelihood, narrative_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         departure_at = VALUES(departure_at), arrival_at = VALUES(arrival_at),
         duration_minutes = VALUES(duration_minutes),
         return_date = VALUES(return_date), return_departure_at = VALUES(return_departure_at),
         return_stops = VALUES(return_stops),
         price = VALUES(price), currency = VALUES(currency), carrier = VALUES(carrier), stops = VALUES(stops),
         source = VALUES(source), booking_url = VALUES(booking_url), moving_average = VALUES(moving_average),
         z_score = VALUES(z_score), enforcement_likelihood = VALUES(enforcement_likelihood),
         narrative_json = VALUES(narrative_json), updated_at = VALUES(updated_at)`,
      [
        id,
        type,
        offer.origin,
        offer.destination,
        offer.departureDate || null,
        offer.departureTime ? new Date(offer.departureTime) : null,
        offer.arrivalTime ? new Date(offer.arrivalTime) : null,
        offer.durationMinutes ?? null,
        offer.returnDate || null,
        offer.returnDepartureTime ? new Date(offer.returnDepartureTime) : null,
        offer.returnStops ?? null,
        offer.price,
        offer.currency,
        offer.carrier || null,
        offer.stops ?? null,
        offer.source || null,
        offer.bookingUrl || null,
        analysis?.movingAverage ?? null,
        analysis?.zScore ?? null,
        analysis?.enforcementLikelihood ?? null,
        JSON.stringify(narrative),
        now,
        now,
      ]
    );
  } catch (err) {
    console.error(`[dealsStore] Failed to save deal ${id}:`, err.message);
  }

  // מחזירים מבנה תקין גם אם השמירה ל-DB נכשלה, כדי שצינור ה-AI/הפצה לא ייפול בגלל זה
  return projectRawDeal({
    id,
    type,
    origin: offer.origin,
    destination: offer.destination,
    departure_date: offer.departureDate,
    departure_at: offer.departureTime,
    arrival_at: offer.arrivalTime,
    duration_minutes: offer.durationMinutes,
    return_date: offer.returnDate,
    return_departure_at: offer.returnDepartureTime,
    return_stops: offer.returnStops,
    price: offer.price,
    currency: offer.currency,
    carrier: offer.carrier,
    stops: offer.stops,
    source: offer.source,
    booking_url: offer.bookingUrl,
    moving_average: analysis?.movingAverage ?? null,
    z_score: analysis?.zScore ?? null,
    enforcement_likelihood: analysis?.enforcementLikelihood ?? null,
    narrative_json: narrative,
    created_at: now,
    updated_at: now,
  });
}

/** מחזיר את כל הדילים (שני הסוגים), עם הנרטיב מתורגם לשפה המבוקשת בלבד, מהעדכני ביותר */
export async function listDeals(lang = 'en') {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM deals ORDER BY updated_at DESC LIMIT 500');
    return rows.map((row) => projectRow(row, lang));
  } catch (err) {
    console.error('[dealsStore] Failed to list deals:', err.message);
    return [];
  }
}

export async function getDealById(id, lang = 'en') {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM deals WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? projectRow(rows[0], lang) : null;
  } catch (err) {
    console.error(`[dealsStore] Failed to load deal ${id}:`, err.message);
    return null;
  }
}

/** ממיר שורת DB גולמית (snake_case, narrative JSON גולמי) למבנה הציבורי */
function projectRow(row, lang) {
  const narrative = parseNarrative(row.narrative_json);
  return projectRawDeal({ ...row, narrative_json: narrative }, lang);
}

function parseNarrative(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

/** ממיר דיל גולמי (עם נרטיב בכל השפות) למבנה ציבורי עם שפה אחת נבחרת */
function projectRawDeal(deal, lang = 'en') {
  const narrative = deal.narrative_json?.[lang] || deal.narrative_json?.en;

  return {
    id: deal.id,
    type: deal.type,
    createdAt: toIso(deal.created_at),
    updatedAt: toIso(deal.updated_at),
    origin: deal.origin,
    destination: deal.destination,
    departureDate: toDateOnly(deal.departure_date),
    departureTime: toIso(deal.departure_at),
    arrivalTime: toIso(deal.arrival_at),
    durationMinutes: deal.duration_minutes === null || deal.duration_minutes === undefined ? null : Number(deal.duration_minutes),
    returnDate: toDateOnly(deal.return_date),
    returnDepartureTime: toIso(deal.return_departure_at),
    returnStops: deal.return_stops === null || deal.return_stops === undefined ? null : Number(deal.return_stops),
    price: Number(deal.price),
    currency: deal.currency,
    carrier: deal.carrier,
    stops: deal.stops,
    source: deal.source,
    bookingUrl: deal.booking_url || '',
    movingAverage: deal.moving_average === null || deal.moving_average === undefined ? null : Number(deal.moving_average),
    zScore: deal.z_score === null || deal.z_score === undefined ? null : Number(deal.z_score),
    enforcementLikelihood:
      deal.enforcement_likelihood === null || deal.enforcement_likelihood === undefined
        ? null
        : Number(deal.enforcement_likelihood),
    lang,
    title: narrative?.title,
    description: narrative?.description,
    riskWarning: narrative?.riskWarning,
  };
}

function toIso(value) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}
