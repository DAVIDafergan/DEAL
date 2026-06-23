import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { validateDealLive } from '../api/client.js';
import { DealBreakdown } from './DealBreakdown.jsx';
import { PurchaseTransitionOverlay } from './PurchaseTransitionOverlay.jsx';

const TRANSITION_DURATION_MS = 900; // קצר וקבוע, לא מתחזה לחכות לתהליך אמיתי — ראו PurchaseTransitionOverlay.jsx

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * BundleModal — דיאלוג "קנה חבילה" גנרי: breakdown אופציונלי (רק כש-יש מחיר אמיתי לכל
 * הרכיבים שמוצגים בו) + כפתור אחד לכל רכיב (טיסה/מלון/רכב/eSIM), כולם באותו עיצוב/צבע
 * אחיד (לא צבעוני-לפי-סוג — פשוט ומקצועי) — מובחנים רק ב-icon+label. לחיצה מציגה מסך מעבר
 * קצר (PurchaseTransitionOverlay) ואז פותחת deep link אמיתי בטאב חדש, ומסומנת ב-✓.
 * "All set" מוצג כשכולם נלחצו. כל רכיב הוא הזמנה נפרדת אצל הספק שלו — לא רכישה אחת
 * מאוחדת (ראו ה-disclaimer בתחתית).
 *
 * flightForValidation (אופציונלי): {origin, destination, departureDate, returnDate, price}.
 * אם קיים, לחיצה על רכיב ה-'flight' מבצעת בדיקה חיה (לא רק transition מדומה) לפני פתיחת
 * הלינק — ראו core/validation/dealValidator.js. מלון/רכב/eSIM נשארים בזרימת ה-transition
 * הפשוטה (אין להם מקור מחיר חי שאפשר לבדוק נגדו).
 */
export function BundleModal({ title, breakdown = null, items, onClose, flightForValidation = null }) {
  const { t } = useLanguage();
  const [clickedKeys, setClickedKeys] = useState(() => new Set());
  const [pendingItem, setPendingItem] = useState(null);
  const [grabbedItemKey, setGrabbedItemKey] = useState(null);
  const allDone = items.length > 0 && items.every((item) => clickedKeys.has(item.key));

  async function handleItemClick(item) {
    setPendingItem(item);

    if (item.key === 'flight' && flightForValidation) {
      try {
        const [result] = await Promise.all([validateDealLive(flightForValidation), wait(TRANSITION_DURATION_MS)]);
        if (!result.checkedLive || result.isValid) {
          window.open(result.bookingUrl || item.url, '_blank', 'noopener,noreferrer');
          setClickedKeys((prev) => new Set(prev).add(item.key));
        } else {
          setGrabbedItemKey(item.key);
        }
      } catch {
        // כשל ברשת שלנו (לא ב-Travelpayouts) — לא חוסמים את המשתמש בגלל תקלה בצד שלנו
        window.open(item.url, '_blank', 'noopener,noreferrer');
        setClickedKeys((prev) => new Set(prev).add(item.key));
      }
    } else {
      await wait(TRANSITION_DURATION_MS);
      window.open(item.url, '_blank', 'noopener,noreferrer');
      setClickedKeys((prev) => new Set(prev).add(item.key));
    }

    setPendingItem(null);
  }

  return (
    <motion.div
      className="questionnaire-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bundle-modal glass-panel"
        onClick={(event) => event.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="questionnaire-modal__header">
          <span className="questionnaire-modal__step-label">{title}</span>
          <button type="button" className="questionnaire-modal__close" onClick={onClose} aria-label={t.questionnaireCloseButton}>
            ×
          </button>
        </div>

        {breakdown && <DealBreakdown {...breakdown} />}

        <p className="bundle-modal__hint">{t.bundleModalHint}</p>

        <div className="bundle-modal__items">
          {items.map((item) => {
            const isDone = clickedKeys.has(item.key);
            return (
              <motion.button
                key={item.key}
                type="button"
                className={`bundle-modal__item ${isDone ? 'is-done' : ''}`}
                whileTap={{ scale: 0.96 }}
                disabled={Boolean(pendingItem)}
                onClick={() => handleItemClick(item)}
              >
                <span className="bundle-modal__item-icon">{item.icon}</span>
                <span className="bundle-modal__item-label">{t[item.labelKey]}</span>
                <span className="bundle-modal__item-check">{isDone ? '✓' : ''}</span>
              </motion.button>
            );
          })}
        </div>

        {allDone && <p className="bundle-modal__success">{t.bundleModalAllSet}</p>}

        <p className="bundle-modal__disclaimer">{t.packageDisclaimer}</p>

        <AnimatePresence>{pendingItem && <PurchaseTransitionOverlay />}</AnimatePresence>

        <AnimatePresence>
          {grabbedItemKey && (
            <motion.div className="deal-grabbed-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="deal-grabbed-overlay__message">{t.dealGrabbedMessage}</p>
              <button type="button" className="deal-grabbed-overlay__dismiss" onClick={() => setGrabbedItemKey(null)}>
                {t.questionnaireCloseButton}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
