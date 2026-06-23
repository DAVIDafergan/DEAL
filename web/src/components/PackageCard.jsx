import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { getCityName } from '../data/cityNames.js';
import { formatShortDate } from '../utils/flightFormat.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { openAllPackageLinks } from '../utils/openAllPackageLinks.js';
import { DestinationImage } from './DestinationImage.jsx';
import { LiveDealModal } from './LiveDealModal.jsx';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.22, ease: 'easeIn' } },
};

/**
 * PackageCard — חבילה משולבת (טיסה+מלון+רכב+SIM). שני מצבי תצוגה:
 *   - compact (ברצועת הדילים הפופולריים): לחיצה בכל מקום על הכרטיס פותחת את כל הלינקים
 *     (תצוגה מקדימה מהירה, לא מחויבות — לא עובר דרך ה-Live Deal Engine בכוונה).
 *   - מלא (אחרי שאלון): כפתור יחיד שפותח LiveDealModal — בונה דיל טרי (טיסה+מלון+רכב/eSIM)
 *     עם ה-peopleCount **האמיתי** שהמשתמש בחר בשאלון (לא ברירת מחדל), ומציג breakdown
 *     בריבועים. זה מחליף את שורת 4 הכפתורים הקודמת — לא רכישה אחת ממוזגת, כל לינק עדיין
 *     נפרד, רק התצוגה התאחדה לאותה חוויה כמו DealCard/DealSlide.
 */
export function PackageCard({ pkg, compact = false }) {
  const { t, lang } = useLanguage();
  const [isLiveDealOpen, setIsLiveDealOpen] = useState(false);
  const animatedPrice = useCountUp(Math.round(pkg.pricePerPerson));
  const currencySymbol = getCurrencySymbol(pkg.currency);
  const updatedTime = pkg.updatedAt
    ? new Date(pkg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const departLabel = formatShortDate(pkg.departureDate, lang);
  const returnLabel = formatShortDate(pkg.returnDate, lang);
  const routeLine = t.packageRoundTripFormat(pkg.origin, pkg.destination, departLabel, returnLabel);

  function handleCardClick() {
    if (compact) openAllPackageLinks(pkg);
  }

  return (
    <motion.article
      className={`package-card ${compact ? 'package-card--compact' : ''}`}
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      whileTap={compact ? { scale: 0.98 } : undefined}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      onClick={compact ? handleCardClick : undefined}
      role={compact ? 'button' : undefined}
      tabIndex={compact ? 0 : undefined}
    >
      <div className="package-card__media">
        <DestinationImage iataCode={pkg.destination} />
        <span className="package-card__city">{getCityName(pkg.destination, lang)}</span>
      </div>

      <div className="package-card__body">
        <p className="package-card__route">{routeLine}</p>

        <div className="package-card__includes">
          <p className="package-card__includes-item">
            ✈️ {t.stopsLabel(pkg.flightStops ?? 0)} · {t.nightsLabel(pkg.nights)}
          </p>
          {pkg.hotelName && <p className="package-card__includes-item">🏨 {pkg.hotelName}</p>}
          {pkg.carRentalUrl && <p className="package-card__includes-item">🚗 {t.carAvailableLabel}</p>}
        </div>

        <p className="package-card__people">{t.packageForPeopleLabel(pkg.peopleCount)}</p>

        <div className="package-card__price-row">
          <span className="package-card__price">
            {t.priceFromPrefix}
            {animatedPrice}
            {currencySymbol}
          </span>
          <span className="package-card__price-label">{t.packagePerPersonLabel}</span>
        </div>
        {updatedTime && <p className="package-card__freshness">{t.priceFreshnessLabel(updatedTime)}</p>}

        {compact ? (
          <p className="package-card__compact-hint">{t.packageOpenAllButton}</p>
        ) : (
          <div className="package-card__actions">
            <motion.button
              type="button"
              className="package-card__action package-card__action--primary"
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsLiveDealOpen(true)}
            >
              {t.lockDealButton}
            </motion.button>
          </div>
        )}

        <p className="package-card__disclaimer">{t.packageDisclaimer}</p>
      </div>

      <AnimatePresence>
        {isLiveDealOpen && (
          <LiveDealModal
            origin={pkg.origin}
            destination={pkg.destination}
            departureDate={pkg.departureDate}
            returnDate={pkg.returnDate}
            peopleCount={pkg.peopleCount}
            onClose={() => setIsLiveDealOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.article>
  );
}
