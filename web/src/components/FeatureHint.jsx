import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHintSeen } from '../context/HintsContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** FeatureHint — 11.22: a subtle, dismiss-once explanation shown exactly where/when a visitor
 * first encounters a feature, instead of a general "how it works" block on the homepage. Shows
 * until dismissed (✕) or until whatever it's explaining is actually used (call sites that have
 * their own CTA should also call markSeen from useHintSeen on that CTA's click — see
 * FavoritesPage.jsx/PropertyEmptyState.jsx) — never reappears after that, for that visitor
 * (localStorage anonymously, the account once logged in — see HintsContext.jsx). Never blocks
 * anything underneath it; renders nothing once seen, so no persistent layout reservation. */
export function FeatureHint({ id, children, className = '' }) {
  const { seen, markSeen } = useHintSeen(id);
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {!seen && (
        <motion.div
          className={`feature-hint ${className}`}
          role="status"
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, transition: { duration: 0.15 } }}
          transition={{ duration: 0.3 }}
        >
          <span className="feature-hint__text">{children}</span>
          <button type="button" className="feature-hint__dismiss" onClick={markSeen} aria-label={t.hintDismissLabel}>
            <X size={12} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
