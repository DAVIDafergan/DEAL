import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * DealBreakdown — שורת icon+label+מחיר לכל רכיב עם **מחיר אמיתי**, וסה"כ בתחתית.
 * רק טיסה (תמיד) ומלון (אם נמצא, Hotellook best-effort) נכנסים לסכום — בדיוק העיקרון של
 * core/packages/packageEngine.js. רכב/eSIM לא מופיעים כאן בכוונה: יש לנו רק לינק להם, לא
 * מחיר אמיתי — להציג להם שורת "מחיר" היה ממציא נתון. הם מוצגים כלינקים נפרדים ב-BundleModal.
 */
export function DealBreakdown({ flightPrice, hotelName, hotelTotalPrice, hotelStars, currency, totalPrice, pricePerPerson, peopleCount = 1 }) {
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
