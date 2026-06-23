import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plane, Hotel, Car } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getCurrencySymbol } from '../utils/currency.js';

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const squareVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 14 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 24 } },
};

/**
 * DealBreakdown — ריבוע נפרד לכל רכיב, אנימציית stagger entrance, lucide icons.
 *
 * מלון: ריבוע מוצג **רק אם יש מחיר אמיתי** (hotelTotalPrice לא null) — לא "פרטים באתר" בלי
 * מחיר. שונה במכוון לפי דיווח על "מלון בלי מחיר נראה כמו דיל לא שלם, מבלבל": אם אין מחיר
 * מלון, לא מציגים ריבוע מלון בכלל (לא placeholder), במקום זה לינק חיפוש המלון (כש-קיים)
 * נשאר זמין בנפרד ב-BundleModal'ים items list — לא חלק מה-breakdown המספרי. נכון להיום זה
 * תמיד המקרה (Hotellook מאומת לא פעיל — ראו core/validation/liveDealBuilder.js), אבל
 * הקומפוננטה נשארת מוכנה לחזרה של מקור מחיר מלון אמיתי בעתיד (DealSlide.jsx עדיין מעביר
 * hotelTotalPrice מ-vibeFeedEngine.js, מערכת נפרדת שלא נערכה).
 *
 * רכב הוא **אופציה עם toggle**, לא מחיר מומצא: אין לנו מחיר אמיתי לרכב (לינק בלבד), אז
 * ה-toggle לא משנה את הסכום המספרי — הוא מוסיף שורת הערה טקסטואלית ("+ רכב — מחיר באתר
 * ההזמנה") ומסמן את הריבוע כ"נוסף לתוכנית".
 */
export function DealBreakdown({
  flightTotal,
  hotelName = null,
  hotelTotalPrice = null,
  hotelStars = null,
  nights,
  currency,
  peopleCount = 1,
  hasCarOption = false,
  hasEsimOption = false,
}) {
  const { t } = useLanguage();
  const [carIncluded, setCarIncluded] = useState(false);
  const symbol = getCurrencySymbol(currency);
  const hasHotel = hotelTotalPrice !== null && hotelTotalPrice !== undefined;
  const hotelPerNight = hasHotel && nights ? hotelTotalPrice / nights : null;
  const totalPrice = flightTotal + (hasHotel ? hotelTotalPrice : 0);

  return (
    <div className="deal-breakdown">
      <motion.div className="deal-breakdown__grid" variants={gridVariants} initial="hidden" animate="visible">
        <motion.div className="deal-breakdown__square" variants={squareVariants}>
          <Plane className="deal-breakdown__square-icon" size={24} strokeWidth={1.8} />
          <span className="deal-breakdown__square-label">{t.breakdownFlightLabel}</span>
          <span className="deal-breakdown__square-price">
            {Math.round(flightTotal)}
            {symbol}
          </span>
        </motion.div>

        {hasHotel && (
          <motion.div className="deal-breakdown__square" variants={squareVariants}>
            <Hotel className="deal-breakdown__square-icon" size={24} strokeWidth={1.8} />
            <span className="deal-breakdown__square-label">
              {hotelName || t.breakdownHotelGenericLabel}
              {hotelStars ? ` · ${hotelStars}★` : ''}
            </span>
            <span className="deal-breakdown__square-price">
              {Math.round(hotelPerNight)}
              {symbol}
              <small>{t.perNightSuffix}</small>
            </span>
          </motion.div>
        )}

        {hasCarOption && (
          <motion.button
            type="button"
            className={`deal-breakdown__square deal-breakdown__square--toggle ${carIncluded ? 'is-included' : ''}`}
            variants={squareVariants}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCarIncluded((prev) => !prev)}
          >
            <Car className="deal-breakdown__square-icon" size={24} strokeWidth={1.8} />
            <span className="deal-breakdown__square-label">{t.breakdownCarLabel}</span>
            <span className="deal-breakdown__square-tag">{carIncluded ? t.carIncludedLabel : t.carAddToPlanLabel}</span>
          </motion.button>
        )}

        {hasEsimOption && (
          <motion.div className="deal-breakdown__square" variants={squareVariants}>
            <span className="deal-breakdown__square-icon deal-breakdown__square-icon--emoji">📱</span>
            <span className="deal-breakdown__square-label">{t.breakdownEsimLabel}</span>
            <span className="deal-breakdown__square-tag">{t.breakdownEstimateTag}</span>
          </motion.div>
        )}
      </motion.div>

      <div className="deal-breakdown__total">
        <strong>
          {t.breakdownTotalLabel}: {Math.round(totalPrice)}
          {symbol}
        </strong>
        {carIncluded && <small className="deal-breakdown__total-note">{t.carInPlanNote}</small>}
        {peopleCount > 1 && (
          <small>
            ({Math.round(totalPrice / peopleCount)} {symbol} {t.vibePerPersonLabel})
          </small>
        )}
      </div>
    </div>
  );
}
