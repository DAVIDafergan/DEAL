import { getPool } from '../../core/db/index.js';

/**
 * PackagesStore — מאגר ה"חבילות המשולבות" (טיסה+מלון+רכב+SIM) בטבלת packages (MySQL).
 * שני סוגים: פופולריות (is_personalized=0, מזהה דטרמיניסטי לפי preset key, מתעדכנות) ו-
 * מותאמות-אישית (is_personalized=1, נשמרות לפי questionnaire_hash לצורך cache קצר-טווח).
 */

export async function upsertPackage(pkg) {
  const pool = getPool();
  const now = new Date();

  try {
    await pool.query(
      `INSERT INTO packages (
         id, origin, destination, departure_date, return_date, nights, people_count,
         destination_type, questionnaire_hash, is_personalized,
         flight_price, flight_booking_url, flight_stops, flight_return_stops,
         hotel_name, hotel_total_price, hotel_booking_url, car_rental_url, esim_url,
         total_price, price_per_person, currency, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         departure_date = VALUES(departure_date), return_date = VALUES(return_date),
         flight_price = VALUES(flight_price), flight_booking_url = VALUES(flight_booking_url),
         flight_stops = VALUES(flight_stops), flight_return_stops = VALUES(flight_return_stops),
         hotel_name = VALUES(hotel_name), hotel_total_price = VALUES(hotel_total_price),
         hotel_booking_url = VALUES(hotel_booking_url), car_rental_url = VALUES(car_rental_url),
         esim_url = VALUES(esim_url), total_price = VALUES(total_price),
         price_per_person = VALUES(price_per_person), updated_at = VALUES(updated_at)`,
      [
        pkg.id,
        pkg.origin,
        pkg.destination,
        pkg.departureDate,
        pkg.returnDate,
        pkg.nights,
        pkg.peopleCount,
        pkg.destinationType || null,
        pkg.questionnaireHash || null,
        pkg.isPersonalized ? 1 : 0,
        pkg.flightPrice,
        pkg.flightBookingUrl || null,
        pkg.flightStops ?? null,
        pkg.flightReturnStops ?? null,
        pkg.hotelName || null,
        pkg.hotelTotalPrice ?? null,
        pkg.hotelBookingUrl || null,
        pkg.carRentalUrl || null,
        pkg.esimUrl || null,
        pkg.totalPrice,
        pkg.pricePerPerson,
        pkg.currency || 'USD',
        now,
        now,
      ]
    );
  } catch (err) {
    console.error(`[packagesStore] Failed to save package ${pkg.id}:`, err.message);
  }

  return projectRow({ ...pkg, created_at: now, updated_at: now });
}

/** דילים פופולריים (לא מותאמים אישית) — לתצוגה כברירת מחדל למשתמש שלא ענה שאלון */
export async function listPopularPackages(limit = 8) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM packages WHERE is_personalized = 0 ORDER BY updated_at DESC LIMIT ?',
      [limit]
    );
    return rows.map(projectRow);
  } catch (err) {
    console.error('[packagesStore] Failed to list popular packages:', err.message);
    return [];
  }
}

/** מחזיר חבילות מותאמות-אישית טריות (לא ישנות מ-maxAgeMs) לפי hash השאלון — cache קצר-טווח */
export async function findFreshPersonalizedPackages(questionnaireHash, maxAgeMs) {
  try {
    const pool = getPool();
    const cutoff = new Date(Date.now() - maxAgeMs);
    const [rows] = await pool.query(
      'SELECT * FROM packages WHERE questionnaire_hash = ? AND is_personalized = 1 AND updated_at >= ? ORDER BY price_per_person ASC',
      [questionnaireHash, cutoff]
    );
    return rows.map(projectRow);
  } catch (err) {
    console.error('[packagesStore] Failed to read cached personalized packages:', err.message);
    return [];
  }
}

function projectRow(row) {
  return {
    id: row.id,
    origin: row.origin,
    destination: row.destination,
    departureDate: toDateOnly(row.departure_date),
    returnDate: toDateOnly(row.return_date),
    nights: row.nights,
    peopleCount: row.people_count,
    destinationType: row.destination_type,
    isPersonalized: Boolean(row.is_personalized ?? row.isPersonalized),
    flightPrice: numOrNull(row.flight_price ?? row.flightPrice),
    flightBookingUrl: row.flight_booking_url ?? row.flightBookingUrl ?? '',
    flightStops: row.flight_stops ?? row.flightStops ?? null,
    flightReturnStops: row.flight_return_stops ?? row.flightReturnStops ?? null,
    hotelName: row.hotel_name ?? row.hotelName ?? null,
    hotelTotalPrice: numOrNull(row.hotel_total_price ?? row.hotelTotalPrice),
    hotelBookingUrl: row.hotel_booking_url ?? row.hotelBookingUrl ?? '',
    carRentalUrl: row.car_rental_url ?? row.carRentalUrl ?? '',
    esimUrl: row.esim_url ?? row.esimUrl ?? '',
    totalPrice: numOrNull(row.total_price ?? row.totalPrice),
    pricePerPerson: numOrNull(row.price_per_person ?? row.pricePerPerson),
    currency: row.currency || 'USD',
    updatedAt: toIso(row.updated_at ?? row.updatedAt),
  };
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
