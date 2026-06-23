import { motion } from 'framer-motion';
import { AnimatedIcon } from './AnimatedIcon.jsx';

/**
 * ChoiceCard — אריח גדול (לא כפתור קטן) לבחירה בשאלון מסך-מלא. האייקון "נצבע" בכניסה
 * (AnimatedIcon, pathLength 0->1, delay לפי index כדי שהאריחים "יציירו" ברצף קצר, לא בבת
 * אחת). בחירה: scale-up + glow (gradient-accent). כרטיסים אחרים מתעמעמים (isDimmed) לרגע
 * קצר לפני שהשאלה הבאה נכנסת — משוב ויזואלי ברור על מה נבחר.
 */
export function ChoiceCard({ label, iconName, index = 0, isSelected, isDimmed, onSelect }) {
  return (
    <motion.button
      type="button"
      className={`choice-tile ${isSelected ? 'is-selected' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
      onClick={onSelect}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: isDimmed ? 1 : 1.03 }}
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: isDimmed ? 0.4 : 1,
        y: 0,
        scale: isSelected ? [1, 1.07, 1] : 1,
      }}
      transition={{ duration: 0.35, delay: 0.05 + index * 0.05, ease: 'easeOut' }}
    >
      <AnimatedIcon name={iconName} size={40} delay={0.2 + index * 0.08} className="choice-tile__icon" />
      <span className="choice-tile__label">{label}</span>
    </motion.button>
  );
}
