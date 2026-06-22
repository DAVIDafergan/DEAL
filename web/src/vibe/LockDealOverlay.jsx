import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';

const LOCK_DURATION_MS = 2000;
const CONFETTI_COUNT = 16;
const CONFETTI_COLORS = ['#f97316', '#ef4444', '#fbbf24', '#f3f4f8'];

/** מסיבוב זוויות+מרחקים יציבים לחלקיקי הקונפטי (לא Math.random בכל רנדור, רק פעם אחת) */
function useConfettiParticles() {
  return useMemo(
    () =>
      Array.from({ length: CONFETTI_COUNT }, (_, i) => {
        const angle = (i / CONFETTI_COUNT) * Math.PI * 2;
        const distance = 90 + (i % 3) * 30;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          delay: (i % 5) * 0.03,
        };
      }),
    []
  );
}

/**
 * LockDealOverlay — "נועל את המחיר מול הספקים..." למשך ~2 שניות, ואז קונפטי עדין (לא
 * שמוצי) — כמה עשרות חלקיקים קטנים שמתפזרים מהמרכז ונמוגים. אחרי שהאנימציה מסתיימת
 * קורא ל-onComplete, שמנווט בפועל ללינקים האמיתיים (טיסה/מלון).
 */
export function LockDealOverlay({ onComplete }) {
  const { t } = useLanguage();
  const particles = useConfettiParticles();

  useEffect(() => {
    const timeout = setTimeout(onComplete, LOCK_DURATION_MS);
    return () => clearTimeout(timeout);
  }, [onComplete]);

  return (
    <motion.div className="lock-deal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="lock-deal-overlay__confetti">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="lock-deal-overlay__particle"
            style={{ background: p.color }}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{ x: p.x, y: p.y, opacity: [0, 1, 0], scale: 1 }}
            transition={{ duration: 1.3, delay: 0.5 + p.delay, ease: 'easeOut' }}
          />
        ))}
      </div>

      <motion.div
        className="lock-deal-overlay__spinner"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
      />
      <p className="lock-deal-overlay__message">{t.lockingDealMessage}</p>
    </motion.div>
  );
}
