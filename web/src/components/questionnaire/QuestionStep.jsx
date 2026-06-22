import { motion } from 'framer-motion';

const stepVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { x: -60, opacity: 0, transition: { duration: 0.2 } },
};

/** שאלה בודדת בשאלון — נכנסת ב-slide חלק משמאל (RTL/LTR מתהפך אוטומטית כי X יחסי לכיוון) */
export function QuestionStep({ title, children }) {
  return (
    <motion.div className="question-step" variants={stepVariants} initial="enter" animate="center" exit="exit">
      <h3 className="question-step__title">{title}</h3>
      <div className="question-step__options">{children}</div>
    </motion.div>
  );
}
