import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { validateDealLive } from '../api/client.js';
import { PurchaseTransitionOverlay } from './PurchaseTransitionOverlay.jsx';

/**
 * LiveBookingButton — לפני פתיחת לינק רכישה, מבצע בדיקה **חיה** (HTTP ממש כרגע, לא מה-DB
 * שלנו) שהמסלול/תאריך עדיין מופיע בתשובת המקור. אם לא — לא פותחים לינק שכבר לא רלוונטי,
 * מציגים הודעה כנה במקום. ראו core/validation/dealValidator.js למגבלה האמיתית: זה לא
 * "מבטיח מקום בכיסא", זה הבדיקה הקרובה ביותר שיש לנו דרך ה-API שזמין לנו.
 * דורש הורה עם position:relative (כל .deal-card/.bundle-modal כבר כך) כדי שה-overlay יכסה
 * את הכרטיס/דיאלוג כולו, לא רק את הכפתור.
 */
export function LiveBookingButton({ deal, fallbackUrl, className, children }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState('idle'); // idle | checking | grabbed

  async function handleClick() {
    setStatus('checking');
    try {
      const result = await validateDealLive({
        origin: deal.origin,
        destination: deal.destination,
        departureDate: deal.departureDate,
        returnDate: deal.returnDate || null,
        price: deal.price,
      });
      if (!result.checkedLive || result.isValid) {
        window.open(result.bookingUrl || fallbackUrl, '_blank', 'noopener,noreferrer');
        setStatus('idle');
      } else {
        setStatus('grabbed');
      }
    } catch {
      // כשל ברשת שלנו (לא ב-Travelpayouts) — לא חוסמים את המשתמש בגלל תקלה בצד שלנו
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      setStatus('idle');
    }
  }

  return (
    <>
      <motion.button
        type="button"
        className={className}
        whileTap={{ scale: 0.96 }}
        disabled={status === 'checking'}
        onClick={handleClick}
      >
        {children}
      </motion.button>

      <AnimatePresence>{status === 'checking' && <PurchaseTransitionOverlay />}</AnimatePresence>

      <AnimatePresence>
        {status === 'grabbed' && (
          <motion.div
            className="deal-grabbed-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="deal-grabbed-overlay__message">{t.dealGrabbedMessage}</p>
            <button type="button" className="deal-grabbed-overlay__dismiss" onClick={() => setStatus('idle')}>
              {t.questionnaireCloseButton}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
