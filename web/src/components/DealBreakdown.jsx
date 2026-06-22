import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * DealBreakdown — שורת icon+label+מחיר לכל רכיב, וסה"כ בתחתית. הסה"כ כולל **רק** רכיבים
 * עם מחיר אמיתי (טיסה תמיד, מלון אם נמצא — Hotellook best-effort, נכון לעכשיו לא פעיל
 * בפועל, ראו sources/hotellookClient.js). רכב/eSIM, כשיש להם לינק (hasCarOption/hasEsimOption),
 * מוצגים כשורה **בלי מחיר** ומתויגים בבירור "הערכה — ראו מחיר בלינק" — לא ממציאים מספר.
 */
export function DealBreakdown({
  flightPrice,
  hotelName,
  hotelTotalPrice,
  hotelStars,
  currency,
  totalPrice,
  pricePerPerson,
  peopleCount = 1,
  hasCarOption = false,
  hasEsimOption = false,
}) {
  const { t } = useLanguage();
  const hasHotel = hotelTotalPrice !== null && hotelTotalPrice !== undefined;

  return (
    <div className="deal-breakdown">
      <div className="deal-breakdown__item">
        <span className="deal-breakdown__icon">✈️</span>
        <span className="deal-breakdown__label">{t.breakdownFlightLabel}</span>
        <span className="deal-breakdown__price">
          {Math.round(flightPrice)} {currency}
        </span>
      </div>

      {hasHotel && (
        <div className="deal-breakdown__item">
          <span className="deal-breakdown__icon">🏨</span>
          <span className="deal-breakdown__label">
            {hotelName || t.breakdownHotelGenericLabel}
            {hotelStars ? ` · ${hotelStars}★` : ''}
          </span>
          <span className="deal-breakdown__price">
            {Math.round(hotelTotalPrice)} {currency}
          </span>
        </div>
      )}

      {hasEsimOption && (
        <div className="deal-breakdown__item deal-breakdown__item--estimate">
          <span className="deal-breakdown__icon">📱</span>
          <span className="deal-breakdown__label">{t.breakdownEsimLabel}</span>
          <span className="deal-breakdown__estimate-tag">{t.breakdownEstimateTag}</span>
        </div>
      )}

      {hasCarOption && (
        <div className="deal-breakdown__item deal-breakdown__item--estimate">
          <span className="deal-breakdown__icon">🚗</span>
          <span className="deal-breakdown__label">{t.breakdownCarLabel}</span>
          <span className="deal-breakdown__estimate-tag">{t.breakdownEstimateTag}</span>
        </div>
      )}

      <div className="deal-breakdown__total">
        <strong>
          {t.breakdownTotalLabel}: {Math.round(totalPrice)} {currency}
        </strong>
        {peopleCount > 1 && (
          <small>
            ({Math.round(pricePerPerson)} {currency} {t.vibePerPersonLabel})
          </small>
        )}
      </div>
    </div>
  );
}
