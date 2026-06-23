import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useLiveDeal } from '../hooks/useLiveDeal.js';
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
 *     (תצוגה מקדימה מהירה, לא מחויבות — לא עובר דרך ה-Live Deal Engine בכוונה, וגם לא
 *     עושה קריאה חיה בכלל היום — אין כאן את הבעיה של "המחיר משתנה בלחיצה").
 *   - מלא (אחרי שאלון): **המחיר נקבע לפני ההצגה** — useLiveDeal נטען בעת ה-mount (רשימה
 *     קטנה, 2-3 תוצאות, בטוח לטעון בלי gating), skeleton עד שמוכן, ואז זה המחיר הנעול.
 *     הכפתור פותח LiveDealModal עם **אותו** liveDeal שכבר מוצג, בלי קריאה נוספת.
 */
export function PackageCard({ pkg, compact = false }) {
  const { t, lang } = useLanguage();
  const [isLiveDealOpen, setIsLiveDealOpen] = useState(false);

  const { liveDeal, status, priceFlash } = useLiveDeal({
    origin: pkg.origin,
    destination: pkg.destination,
    departureDate: pkg.departureDate,
    returnDate: pkg.returnDate,
    peopleCount: pkg.peopleCount,
    isActive: !compact,
  });

  const currencySymbol = getCurrencySymbol(pkg.currency);

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

        {compact && (
          <>
            <div className="package-card__price-row">
              <span className="package-card__price">
                {t.priceFromPrefix}
                {Math.round(pkg.pricePerPerson)}
                {currencySymbol}
              </span>
              <span className="package-card__price-label">{t.packagePerPersonLabel}</span>
            </div>
            {pkg.updatedAt && (
              <p className="package-card__freshness">
                {t.priceFreshnessLabel(new Date(pkg.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
              </p>
            )}
            <p className="package-card__compact-hint">{t.packageOpenAllButton}</p>
          </>
        )}

        {!compact && status === 'loading' && (
          <div className="package-card__price-skeleton">
            <div className="package-card__price-skeleton-bar" />
          </div>
        )}

        {!compact && status === 'ready' && liveDeal && (
          <>
            <div className="package-card__price-row">
              <span className={`package-card__price ${priceFlash ? `package-card__price--flash-${priceFlash}` : ''}`}>
                {t.priceFromPrefix}
                {Math.round(liveDeal.pricePerPerson)}
                {currencySymbol}
              </span>
              <span className="package-card__price-label">{t.packagePerPersonLabel}</span>
            </div>
            <p className="package-card__freshness">
              {t.priceFreshnessLabel(new Date(liveDeal.builtAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
            </p>
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
          </>
        )}

        {!compact && (status === 'notFound' || status === 'error') && (
          <p className="package-card__price-unavailable">{t.dealNoLongerAvailableMessage}</p>
        )}

        <p className="package-card__disclaimer">{t.packageDisclaimer}</p>
      </div>

      <AnimatePresence>{isLiveDealOpen && <LiveDealModal liveDeal={liveDeal} onClose={() => setIsLiveDealOpen(false)} />}</AnimatePresence>
    </motion.article>
  );
}
