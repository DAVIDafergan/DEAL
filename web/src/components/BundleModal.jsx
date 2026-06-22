import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DealBreakdown } from './DealBreakdown.jsx';

/**
 * BundleModal — דיאלוג "קנה חבילה" גנרי: breakdown אופציונלי (רק כש-יש מחיר אמיתי לכל
 * הרכיבים שמוצגים בו) + כפתור אחד לכל רכיב (טיסה/מלון/רכב/eSIM), כולם באותו עיצוב/צבע
 * אחיד (לא צבעוני-לפי-סוג — פשוט ומקצועי) — מובחנים רק ב-icon+label. כל לחיצה פותחת
 * deep link אמיתי בטאב חדש ומסומנת ב-✓. "All set" מוצג כשכולם נלחצו.
 * כל רכיב הוא הזמנה נפרדת אצל הספק שלו — לא רכישה אחת מאוחדת (ראו ה-disclaimer בתחתית).
 */
export function BundleModal({ title, breakdown = null, items, onClose }) {
  const { t } = useLanguage();
  const [clickedKeys, setClickedKeys] = useState(() => new Set());
  const allDone = items.length > 0 && items.every((item) => clickedKeys.has(item.key));

  function handleItemClick(item) {
    console.log(`[BundleModal] Opening ${item.key} deep link:`, item.url);
    window.open(item.url, '_blank', 'noopener,noreferrer');
    setClickedKeys((prev) => new Set(prev).add(item.key));
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
      </motion.div>
    </motion.div>
  );
}
