import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getCityName } from '../data/cityNames.js';
import { buildHotelUrl, getHotelStayDates } from '../utils/packageLinks.js';
import { DestinationImage } from './DestinationImage.jsx';

/** הופך מחרוזת מסלול לגוון צבע יציב — אותה לוגיקה כמו DealCard, לעקביות ויזואלית */
function hueFromRoute(route) {
  let hash = 0;
  for (let i = 0; i < route.length; i += 1) {
    hash = (hash * 31 + route.charCodeAt(i)) % 360;
  }
  return hash;
}

/**
 * AddHotelDialog — דיאלוג ממוקד: תמונת היעד, תאריכי צ'ק-אין/אאוט (אמיתיים אם יש returnDate,
 * אחרת הערכה מסומנת), וכפתור חיפוש שלוקח ל-Hotellook עם התאריכים האלה ב-URL.
 */
export function AddHotelDialog({ deal, marker, onClose }) {
  const { t, lang } = useLanguage();
  const hue = hueFromRoute(`${deal.origin}${deal.destination}`);
  const hotelUrl = buildHotelUrl(deal, marker);
  const { checkIn, checkOut, isEstimate } = getHotelStayDates(deal);

  return (
    <motion.div
      className="questionnaire-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="hotel-dialog glass-panel"
        onClick={(event) => event.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="questionnaire-modal__header">
          <span className="questionnaire-modal__step-label">{t.addHotelDialogTitle}</span>
          <button type="button" className="questionnaire-modal__close" onClick={onClose} aria-label={t.questionnaireCloseButton}>
            ×
          </button>
        </div>

        <div
          className="hotel-dialog__media"
          style={{ background: `linear-gradient(135deg, hsl(${hue}, 65%, 38%), hsl(${(hue + 50) % 360}, 70%, 22%))` }}
        >
          <DestinationImage iataCode={deal.destination} />
          <span className="hotel-dialog__city">{getCityName(deal.destination, lang)}</span>
        </div>

        <div className="hotel-dialog__dates">
          <div className="hotel-dialog__date-cell">
            <span className="hotel-dialog__date-label">{t.checkInLabel}</span>
            <span className="hotel-dialog__date-value">{checkIn || '—'}</span>
          </div>
          <div className="hotel-dialog__date-cell">
            <span className="hotel-dialog__date-label">{t.checkOutLabel}</span>
            <span className="hotel-dialog__date-value">{checkOut || '—'}</span>
          </div>
        </div>

        {isEstimate && <p className="hotel-dialog__note">{t.packageHotelDatesNote}</p>}

        {hotelUrl && (
          <a href={hotelUrl} target="_blank" rel="noopener noreferrer" className="hotel-dialog__search-button">
            {t.searchHotelsButton}
          </a>
        )}
      </motion.div>
    </motion.div>
  );
}
