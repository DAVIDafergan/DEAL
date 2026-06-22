import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { PackageBuilder } from './PackageBuilder.jsx';

/** BuyPackageDialog — עוטף את PackageBuilder (4 הבחירות: טיסה+מלון+רכב+SIM) בדיאלוג מסודר */
export function BuyPackageDialog({ deal, packageConfig, onClose }) {
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
          <span className="questionnaire-modal__step-label">{t.buyPackageButton}</span>
          <button type="button" className="questionnaire-modal__close" onClick={onClose} aria-label={t.questionnaireCloseButton}>
            ×
          </button>
        </div>

        <PackageBuilder deal={deal} packageConfig={packageConfig} />
      </motion.div>
    </motion.div>
  );
}
