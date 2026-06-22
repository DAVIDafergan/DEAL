import { motion } from 'framer-motion';

/** כרטיס בחירה ויזואלי בשאלון — מהבהב בעדינות כשנבחר */
export function ChoiceCard({ label, icon, isSelected, onSelect }) {
  return (
    <motion.button
      type="button"
      className={`choice-card ${isSelected ? 'is-selected' : ''}`}
      onClick={onSelect}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.03 }}
      animate={isSelected ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {icon && <span className="choice-card__icon">{icon}</span>}
      <span className="choice-card__label">{label}</span>
    </motion.button>
  );
}
