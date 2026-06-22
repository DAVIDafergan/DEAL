import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';

const GLITCH_DURATION_MS = 2000;

/**
 * GlitchDropOverlay — אפקט "תקלה דיגיטלית" קצר (2 שניות) שמופיע פעם אחת לכרטיס (לא בלופ,
 * לא חוזר אם גוללים אחורה-קדימה). הטקסט ("LIVE — דיל פעיל ברגע זה") הוא אפקט עיצובי/
 * אווירה, לא טענת עובדה על ירידת מחיר/מלאי שאין לנו נתון אמיתי עליה (ראו vibeFeedNarrative.js).
 */
export function GlitchDropOverlay({ caption }) {
  const { t } = useLanguage();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setIsVisible(false), GLITCH_DURATION_MS);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="glitch-drop"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.85, 1, 0.7, 1] }}
          exit={{ opacity: 0 }}
          transition={{ duration: GLITCH_DURATION_MS / 1000, times: [0, 0.1, 0.3, 0.45, 0.6, 1] }}
        >
          <span className="glitch-drop__line glitch-drop__line--1" />
          <span className="glitch-drop__line glitch-drop__line--2" />
          <span className="glitch-drop__badge">🔴 {t.glitchDropLabel}</span>
          <span className="glitch-drop__caption">{caption}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
