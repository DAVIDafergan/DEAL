import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { BundleModal } from './BundleModal.jsx';

/**
 * LiveDealModal — שכבת תצוגה בלבד, **לא מבצעת קריאת רשת**. המחיר נקבע *לפני* ההצגה (ראו
 * useLiveDeal.js, שרץ ברמת הכרטיס/שקף כשהוא נכנס למסך) — עד שהמשתמש לוחץ "הזמן", liveDeal
 * כבר קיים ונעול. פותחים את ה-modal הזה רק כש-status==='ready' (הכפתור עצמו disabled לפני
 * זה, ראו DealSlide.jsx/DealCard.jsx/PackageCard.jsx) — אז אין כאן "searching" state בכלל:
 * המחיר שמוצג כאן הוא **בדיוק** המחיר שהמשתמש כבר ראה לפני הלחיצה, לא קריאה חדשה שעלולה
 * להחזיר מספר אחר.
 */
export function LiveDealModal({ liveDeal, onClose }) {
  const { t } = useLanguage();

  if (!liveDeal) {
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
    nights: liveDeal.nights,
    currency: liveDeal.currency,
    peopleCount: liveDeal.peopleCount,
    hasCarOption: Boolean(liveDeal.carRentalUrl),
    hasEsimOption: Boolean(liveDeal.esimUrl),
  };

  return <BundleModal title={t.lockDealButton} breakdown={breakdown} items={items} onClose={onClose} />;
}
