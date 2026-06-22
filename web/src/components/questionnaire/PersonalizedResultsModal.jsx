import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { PackageCard } from '../PackageCard.jsx';

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/** מציג את תוצאות השאלון — חבילות מותאמות אישית, אחרי שהמשתמש סיים לענות */
export function PersonalizedResultsModal({ packages, onClose }) {
  const { t } = useLanguage();

  return (
    <motion.div
      className="questionnaire-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="results-modal glass-panel"
        onClick={(event) => event.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="questionnaire-modal__header">
          <span className="questionnaire-modal__step-label">{t.questionnaireResultsTitle}</span>
          <button type="button" className="questionnaire-modal__close" onClick={onClose} aria-label={t.questionnaireCloseButton}>
            ×
          </button>
        </div>

        {packages.length === 0 ? (
          <p className="questionnaire-modal__error">{t.questionnaireNoResultsLabel}</p>
        ) : (
          <motion.div className="results-modal__list" variants={listVariants} initial="hidden" animate="visible">
            <AnimatePresence>
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
