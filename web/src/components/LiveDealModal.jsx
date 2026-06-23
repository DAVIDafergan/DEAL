import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plane } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { buildLiveDeal } from '../api/client.js';
import { BundleModal } from './BundleModal.jsx';

/**
 * LiveDealModal — ה-"Live Deal Engine": לחיצה על "הזמן" לא פותחת ישר לינק (אולי אזל) — בונה
 * דיל **טרי** בזמן אמת (טיסה+מלון+רכב/eSIM, ראו core/validation/liveDealBuilder.js), מציגה
 * אנימציית חיפוש כנה (זה זמן רשת אמיתי, לא delay מזויף), ואז את ה-breakdown בריבועים
 * (DealBreakdown.jsx) עם הנתונים הטריים, בתוך BundleModal הקיים (לא משוכפל לוגיקה).
 * אם לא נמצא דיל כלל — הודעה כנה, לא לינק מת.
 */
export function LiveDealModal({ origin, destination, departureDate, returnDate, peopleCount = 2, onClose }) {
  const { t } = useLanguage();
  const [state, setState] = useState('searching'); // searching | ready | notFound | error
  const [liveDeal, setLiveDeal] = useState(null);

  useEffect(() => {
    let isMounted = true;
    buildLiveDeal({ origin, destination, departureDate, returnDate, peopleCount })
      .then((result) => {
        if (!isMounted) return;
        if (result.found) {
          setLiveDeal(result);
          setState('ready');
        } else {
          setState('notFound');
        }
      })
      .catch(() => {
        if (isMounted) setState('error');
      });
    return () => {
      isMounted = false;
    };
  }, [origin, destination, departureDate, returnDate, peopleCount]);

  if (state === 'searching') {
    return (
      <motion.div className="questionnaire-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div
          className="live-deal-search glass-panel"
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        >
          <motion.div
            className="live-deal-search__icon"
            animate={{ rotate: [0, 10, -10, 0], y: [0, -4, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Plane size={36} strokeWidth={1.6} />
          </motion.div>
          <p className="live-deal-search__message">{t.searchingBestDealMessage}</p>
        </motion.div>
      </motion.div>
    );
  }

  if (state === 'notFound' || state === 'error') {
    return (
      <motion.div className="questionnaire-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="live-deal-search glass-panel" onClick={(event) => event.stopPropagation()}>
          <p className="live-deal-search__message">{t.dealNoLongerAvailableMessage}</p>
          <button type="button" className="deal-grabbed-overlay__dismiss" onClick={onClose}>
            {t.questionnaireCloseButton}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  const items = [
    liveDeal.flightBookingUrl && { key: 'flight', icon: '✈️', labelKey: 'packageFlightLabel', url: liveDeal.flightBookingUrl },
    liveDeal.hotelBookingUrl && { key: 'hotel', icon: '🏨', labelKey: 'packageHotelButton', url: liveDeal.hotelBookingUrl },
    liveDeal.carRentalUrl && { key: 'car', icon: '🚗', labelKey: 'packageCarButton', url: liveDeal.carRentalUrl },
    liveDeal.esimUrl && { key: 'esim', icon: '📱', labelKey: 'packageEsimButton', url: liveDeal.esimUrl },
  ].filter(Boolean);

  const breakdown = {
    flightTotal: liveDeal.flightTotal,
    hotelName: liveDeal.hotelName,
    hotelTotalPrice: liveDeal.hotelTotalPrice,
    hotelStars: liveDeal.hotelStars,
    nights: liveDeal.nights,
    currency: liveDeal.currency,
    peopleCount: liveDeal.peopleCount,
    hasCarOption: Boolean(liveDeal.carRentalUrl),
    hasEsimOption: Boolean(liveDeal.esimUrl),
  };

  return <BundleModal title={t.lockDealButton} breakdown={breakdown} items={items} onClose={onClose} />;
}
