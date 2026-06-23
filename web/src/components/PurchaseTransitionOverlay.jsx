import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * PurchaseTransitionOverlay — מסך מעבר קצר (לא ספינר גנרי) לפני פתיחת לינק חיצוני אמיתי.
 * הטקסט הוא תיאור עובדתי של מה שקורה בפועל ("מעבירים אותך...", "המחיר הסופי מאומת אצל
 * הספק") — לא טענת "נועלים מחיר" שמשתמע ממנה תהליך פעיל שלא קורה. משך קצר וקבוע
 * (BundleModal.jsx, ~900ms) — לא ממתינים לשום פעולה אמיתית כי הלינק כבר מוכן מראש, וזה
 * לא מתחזה לכך (בניגוד לגרסה קודמת שהוסרה בכוונה — ראו היסטוריית קומיטים).
 */
export function PurchaseTransitionOverlay() {
  const { t } = useLanguage();

  return (
    <motion.div
      className="purchase-transition"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="purchase-transition__icon"
        animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ShieldCheck size={34} strokeWidth={1.8} />
      </motion.div>
      <p className="purchase-transition__message">{t.redirectingMessage}</p>
      <p className="purchase-transition__trust">{t.priceTrustNote}</p>
    </motion.div>
  );
}
