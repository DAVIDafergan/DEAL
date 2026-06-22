import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { getCityName } from '../data/cityNames.js';
import { formatShortDate } from '../utils/flightFormat.js';
import { openAllPackageLinks } from '../utils/openAllPackageLinks.js';
import { DestinationImage } from './DestinationImage.jsx';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.22, ease: 'easeIn' } },
};

/**
 * PackageCard — חבילה משולבת (טיסה+מלון+רכב+SIM). שני מצבי תצוגה:
 *   - compact (ברצועת הדילים הפופולריים): לחיצה בכל מקום על הכרטיס פותחת את כל הלינקים.
 *   - מלא (אחרי שאלון): 4 כפתורי קנייה נפרדים, כל אחד עם הלינק שלו.
 * חשוב: זו לא רכישה אחת ממוזגת — 4 לינקים נפרדים, כל אחד מזכה עמלה בנפרד.
 */
export function PackageCard({ pkg, compact = false }) {
  const { t, lang } = useLanguage();
  const animatedPrice = useCountUp(Math.round(pkg.pricePerPerson));

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
        <p className="package-card__summary">{t.packageSummaryLabel(pkg.nights)}</p>
        <p className="package-card__people">{t.packageForPeopleLabel(pkg.peopleCount)}</p>

        <div className="package-card__price-row">
          <span className="package-card__price">
            {animatedPrice} {pkg.currency}
          </span>
          <span className="package-card__price-label">{t.packagePerPersonLabel}</span>
        </div>

        {compact ? (
          <p className="package-card__compact-hint">{t.packageOpenAllButton}</p>
        ) : (
          <div className="package-card__actions">
            <motion.a
              href={pkg.flightBookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="package-card__action"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.03 }}
            >
              {t.packageBuyFlightButton}
            </motion.a>
            {pkg.hotelBookingUrl && (
              <motion.a
                href={pkg.hotelBookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="package-card__action"
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
              >
                {t.packageBuyHotelButton}
              </motion.a>
            )}
            {pkg.carRentalUrl && (
              <motion.a
                href={pkg.carRentalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="package-card__action"
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
              >
                {t.packageBuyCarButton}
              </motion.a>
            )}
            {pkg.esimUrl && (
              <motion.a
                href={pkg.esimUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="package-card__action"
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
              >
                {t.packageBuySimButton}
              </motion.a>
            )}
          </div>
        )}

        <p className="package-card__disclaimer">{t.packageDisclaimer}</p>
      </div>
    </motion.article>
  );
}
