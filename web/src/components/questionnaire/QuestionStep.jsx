import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * QuestionStep — שאלה בודדת, 100vh מלא. ה"קדימה" של slide הוא transform פיזי (translateX)
 * — לא מתהפך אוטומטית לפי dir כמו logical properties, אז הופך אותו ידנית: ב-RTL "קדימה"
 * (לכיוון הקריאה) הוא שמאלה, ב-LTR ימינה. בלי ההיפוך הזה, ב-RTL השאלה החדשה הייתה נכנסת
 * "אחורה" מבחינת כיוון הקריאה — מרגיש הפוך.
 */
export function QuestionStep({ title, children }) {
  const { dir } = useLanguage();
  const forward = dir === 'rtl' ? -1 : 1;

  const stepVariants = {
    enter: { x: `${100 * forward}%`, opacity: 0 },
    center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 28 } },
    exit: { x: `${-100 * forward}%`, opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } },
  };

  return (
    <motion.div className="question-step" variants={stepVariants} initial="enter" animate="center" exit="exit">
      <h3 className="question-step__title">{title}</h3>
      <div className="question-step__options">{children}</div>
    </motion.div>
  );
}
