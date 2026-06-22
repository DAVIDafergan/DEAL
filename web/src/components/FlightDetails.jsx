import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getCityName } from '../data/cityNames.js';
import { formatFlightDate, formatFlightTime, formatDurationMinutes } from '../utils/flightFormat.js';
import { RouteAnimation } from './RouteAnimation.jsx';

/**
 * FlightDetails — האזור שנפתח בתוך כרטיס הטיסה: מסלול עם שמות מלאים, תאריכים/שעות קריאים
 * (בזמן המקומי של כל שדה תעופה), חניות, ומשך טיסה כולל. כל שדה שלא קיים בנתון המקור מוצג
 * כ-"—" או נופל לתאריך-בלבד — לא ממציאים שעה/משך שאין לנו.
 */
export function FlightDetails({ deal }) {
  const { t, lang } = useLanguage();

  const departureDateLabel = formatFlightDate(deal.departureTime, lang, deal.origin);
  const departureTimeLabel = formatFlightTime(deal.departureTime, lang, deal.origin);
  const arrivalDateLabel = formatFlightDate(deal.arrivalTime, lang, deal.destination);
  const arrivalTimeLabel = formatFlightTime(deal.arrivalTime, lang, deal.destination);
  const durationLabel = formatDurationMinutes(deal.durationMinutes, t);

  // הלוך-חזור: רק אם יש returnDate אמיתי (כרגע live_price בלבד, ראו DealScanner) — לא ממציאים
  const isRoundTrip = Boolean(deal.returnDate);
  const returnDateLabel = formatFlightDate(deal.returnDepartureTime, lang, deal.destination) || deal.returnDate;

  return (
    <motion.div
      className="flight-details"
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="flight-details__route">
        <div className="flight-details__endpoint">
          <strong>{deal.origin}</strong>
          <span>{getCityName(deal.origin, lang)}</span>
        </div>
        <RouteAnimation stops={deal.stops ?? 0} />
        <div className="flight-details__endpoint flight-details__endpoint--end">
          <strong>{deal.destination}</strong>
          <span>{getCityName(deal.destination, lang)}</span>
        </div>
      </div>

      <div className="flight-details__grid">
        <div className="flight-details__cell">
          <span className="flight-details__cell-label">{t.departureLabel}</span>
          {departureTimeLabel ? (
            <>
              <span className="flight-details__cell-value">{departureTimeLabel}</span>
              <span className="flight-details__cell-sub">{departureDateLabel}</span>
            </>
          ) : (
            <span className="flight-details__cell-value">{deal.departureDate || '—'}</span>
          )}
        </div>

        <div className="flight-details__cell">
          <span className="flight-details__cell-label">{t.arrivalLabel}</span>
          {arrivalTimeLabel ? (
            <>
              <span className="flight-details__cell-value">{arrivalTimeLabel}</span>
              <span className="flight-details__cell-sub">{arrivalDateLabel}</span>
            </>
          ) : (
            <span className="flight-details__cell-value">—</span>
          )}
        </div>

        <div className="flight-details__cell">
          <span className="flight-details__cell-label">{t.stopsTitle}</span>
          <span className="flight-details__cell-value">{t.stopsLabel(deal.stops ?? 0)}</span>
        </div>

        <div className="flight-details__cell">
          <span className="flight-details__cell-label">{t.flightDurationTitle}</span>
          <span className="flight-details__cell-value">{durationLabel || '—'}</span>
        </div>

        {isRoundTrip && (
          <div className="flight-details__cell flight-details__cell--full">
            <span className="flight-details__cell-label">{t.tripReturnLabel}</span>
            <span className="flight-details__cell-value">{returnDateLabel}</span>
            {deal.returnStops !== null && deal.returnStops !== undefined && (
              <span className="flight-details__cell-sub">{t.stopsLabel(deal.returnStops)}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
