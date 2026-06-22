import { getPool } from '../../core/db/index.js';

/**
 * VibeFeedStore — מאגר כרטיסי ה"ווייב פיד" בטבלת vibe_feed_cards. כל כרטיס הוא יעד אחד
 * שמתאים לווייב נתון (urban/beach/nature/romantic), עם טיסה+מלון אמיתיים (אותה לוגיקה
 * כמו core/packages/packageEngine.js) + media (video/music) ונרטיב תלת-לשוני.
 */

const FRESHNESS_WINDOW_MS = 5 * 60 * 60 * 1000; // קצת יותר ממחזור רענון אחד (4 שעות)

export async function upsertVibeFeedCard(card) {
  const pool = getPool();
  const now = new Date();

  try {
    await pool.query(
      `INSERT INTO vibe_feed_cards (
         id, vibe, origin, destination, departure_date, return_date, nights, people_count,
         flight_price, flight_booking_url, flight_stops, flight_return_stops,
         hotel_name, hotel_stars, hotel_total_price, hotel_booking_url,
         total_price, price_per_person, currency, video_url, music_url, is_glitch_drop,
         narrative_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         departure_date = VALUES(departure_date), return_date = VALUES(return_date),
         flight_price = VALUES(flight_price), flight_booking_url = VALUES(flight_booking_url),
         flight_stops = VALUES(flight_stops), flight_return_stops = VALUES(flight_return_stops),
         hotel_name = VALUES(hotel_name), hotel_stars = VALUES(hotel_stars),
         hotel_total_price = VALUES(hotel_total_price), hotel_booking_url = VALUES(hotel_booking_url),
         total_price = VALUES(total_price), price_per_person = VALUES(price_per_person),
         video_url = VALUES(video_url), music_url = VALUES(music_url),
         narrative_json = VALUES(narrative_json), updated_at = VALUES(updated_at)`,
      [
        card.id,
        card.vibe,
        card.origin,
        card.destination,
        card.departureDate,
        card.returnDate,
        card.nights,
        card.peopleCount,
        card.flightPrice,
        card.flightBookingUrl || null,
        card.flightStops ?? null,
        card.flightReturnStops ?? null,
        card.hotelName || null,
        card.hotelStars ?? null,
        card.hotelTotalPrice ?? null,
        card.hotelBookingUrl || null,
        card.totalPrice,
        card.pricePerPerson,
        card.currency || 'USD',
        card.videoUrl || null,
        card.musicUrl || null,
        card.isGlitchDrop ? 1 : 0,
        JSON.stringify(card.narrative),
        now,
        now,
      ]
    );
  } catch (err) {
    console.error(`[vibeFeedStore] Failed to save feed card ${card.id}:`, err.message);
  }

  return projectRow({ ...card, narrative_json: card.narrative, created_at: now, updated_at: now });
}

/** מחזיר כרטיסי פיד לווייב נתון — רק כאלה שרוענו בחלון הטריות (לא תקוע עם מחיר ישן) */
export async function listVibeFeedCards(vibe, lang = 'en') {
  try {
    const pool = getPool();
    const cutoff = new Date(Date.now() - FRESHNESS_WINDOW_MS);
    const [rows] = await pool.query(
      'SELECT * FROM vibe_feed_cards WHERE vibe = ? AND updated_at >= ? ORDER BY price_per_person ASC',
      [vibe, cutoff]
    );
    return rows.map((row) => projectRow(row, lang));
  } catch (err) {
    console.error('[vibeFeedStore] Failed to list feed cards:', err.message);
    return [];
  }
}

function projectRow(row, lang = 'en') {
  const narrative = parseNarrative(row.narrative_json);
  const localized = narrative?.[lang] || narrative?.en || {};

  return {
    id: row.id,
    vibe: row.vibe,
    origin: row.origin,
    destination: row.destination,
    departureDate: toDateOnly(row.departure_date),
    returnDate: toDateOnly(row.return_date),
    nights: row.nights,
    peopleCount: row.people_count,
    flightPrice: numOrNull(row.flight_price),
    flightBookingUrl: row.flight_booking_url || '',
    flightStops: row.flight_stops ?? null,
    flightReturnStops: row.flight_return_stops ?? null,
    hotelName: row.hotel_name || null,
    hotelStars: row.hotel_stars ?? null,
    hotelTotalPrice: numOrNull(row.hotel_total_price),
    hotelBookingUrl: row.hotel_booking_url || '',
    totalPrice: numOrNull(row.total_price),
    pricePerPerson: numOrNull(row.price_per_person),
    currency: row.currency || 'USD',
    videoUrl: row.video_url || null,
    musicUrl: row.music_url || null,
    isGlitchDrop: Boolean(row.is_glitch_drop),
    updatedAt: toIso(row.updated_at),
    title: localized.title,
    subtitle: localized.subtitle,
    glitchCaption: localized.glitchCaption,
  };
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

function numOrNull(value) {
  return value === null || value === undefined ? null : Number(value);
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
