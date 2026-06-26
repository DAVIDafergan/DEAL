import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { AgentDealCard } from '../agent/AgentDealCard.jsx';

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function PersonalizedResultsModal({ packages: deals, onClose }) {
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
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      >
        <div className="questionnaire-modal__header">
          <span className="questionnaire-modal__step-label">
            {t.questionnaireResultsTitle || 'דילים מתאימים לך'}
          </span>
          <button type="button" className="questionnaire-modal__close" onClick={onClose} aria-label={t.questionnaireCloseButton}>
            ×
          </button>
        </div>

        {!deals || deals.length === 0 ? (
          <p className="questionnaire-modal__error">
            {t.questionnaireNoResultsLabel || 'לא נמצאו דילים — נסה תקציב גבוה יותר'}
          </p>
        ) : (
          <motion.div
            className="results-modal__deals-grid"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence>
              {deals.map((deal) => (
                <motion.div key={deal.id} variants={itemVariant}>
                  <AgentDealCard deal={deal} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
