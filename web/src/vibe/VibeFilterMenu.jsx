import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { ALL_VIBES_KEY } from './vibeConstants.js';

const VIBE_OPTIONS = [
  { key: ALL_VIBES_KEY, emoji: '⭐', labelKey: 'vibeFilterAll' },
  { key: 'urban', emoji: '🏙️', labelKey: 'vibeUrban' },
  { key: 'beach', emoji: '🏖️', labelKey: 'vibeBeach' },
  { key: 'nature', emoji: '🏔️', labelKey: 'vibeNature' },
  { key: 'romantic', emoji: '🍷', labelKey: 'vibeRomantic' },
];

/**
 * VibeFilterMenu — סינון ווייב **אופציונלי**, לא חוסם: כפתור קטן וצף שפותח תפריט. ברירת
 * המחדל בכניסה היא "all" (כל הווייבים, ממוין מחיר) — זה לא מסך-כניסה, רק פילטר בתוך הפיד.
 */
export function VibeFilterMenu({ activeVibe, onChange }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const activeOption = VIBE_OPTIONS.find((v) => v.key === activeVibe) || VIBE_OPTIONS[0];

  function handleSelect(key) {
    onChange(key);
    setIsOpen(false);
  }

  return (
    <div className="vibe-filter-menu">
      <button type="button" className="vibe-filter-menu__trigger" onClick={() => setIsOpen((prev) => !prev)}>
        <span>{activeOption.emoji}</span>
        <span className="vibe-filter-menu__trigger-label">
          {activeOption.key === ALL_VIBES_KEY ? t.vibeFilterAll : t[activeOption.labelKey]}
        </span>
        <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          ⌄
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="vibe-filter-menu__dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            {VIBE_OPTIONS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`vibe-filter-menu__option ${activeVibe === option.key ? 'is-active' : ''}`}
                onClick={() => handleSelect(option.key)}
              >
                <span>{option.emoji}</span>
                <span>{option.key === ALL_VIBES_KEY ? t.vibeFilterAll : t[option.labelKey]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
