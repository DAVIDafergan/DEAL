import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';

const VIBES = [
  { key: 'urban', emoji: '🏙️', labelKey: 'vibeUrban' },
  { key: 'beach', emoji: '🏖️', labelKey: 'vibeBeach' },
  { key: 'nature', emoji: '🏔️', labelKey: 'vibeNature' },
  { key: 'romantic', emoji: '🍷', labelKey: 'vibeRomantic' },
];

const containerVariants = {
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.4, ease: 'easeIn' } },
};

const buttonVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.92 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
};

/**
 * VibeOnboarding — מסך הכניסה ל"ווייב פיד" (/feed): שאלה אחת, ארבעה כפתורי ענק, Fade Out
 * חלק ומעבר לפיד (/feed/:vibe). Zero friction בכוונה — בלי טקסט מסביר, בלי שדות קלט.
 */
export function VibeOnboarding() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedVibe, setSelectedVibe] = useState(null);

  function handleSelect(vibeKey) {
    setSelectedVibe(vibeKey);
    setTimeout(() => navigate(`/feed/${vibeKey}`), 380);
  }

  return (
    <motion.div
      className="vibe-onboarding"
      variants={containerVariants}
      initial="visible"
      animate={selectedVibe ? 'exit' : 'visible'}
    >
      <h1 className="vibe-onboarding__title">{t.vibeOnboardingTitle}</h1>

      <div className="vibe-onboarding__grid">
        {VIBES.map((vibe) => (
          <motion.button
            key={vibe.key}
            type="button"
            className="vibe-onboarding__button"
            variants={buttonVariants}
            whileTap={{ scale: 0.94 }}
            onClick={() => handleSelect(vibe.key)}
            disabled={Boolean(selectedVibe)}
          >
            <span className="vibe-onboarding__emoji">{vibe.emoji}</span>
            <span className="vibe-onboarding__label">{t[vibe.labelKey]}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
