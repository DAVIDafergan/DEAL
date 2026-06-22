import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { PackageCard } from './PackageCard.jsx';

const stripVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/** רצועת דילים פופולריים עם גלילה אופקית — "מוקדי הדילים" */
export function PackagesStrip({ title, packages, emptyLabel }) {
  const { t } = useLanguage();

  return (
    <section className="packages-strip-section container">
      <h2 className="packages-strip__title">{title}</h2>

      {packages.length === 0 ? (
        <p className="packages-strip__empty">{emptyLabel || t.packageStripEmptyLabel}</p>
      ) : (
        <motion.div className="packages-strip" variants={stripVariants} initial="hidden" animate="visible">
          <AnimatePresence>
            {packages.map((pkg) => (
              <div key={pkg.id} className="packages-strip__item">
                <PackageCard pkg={pkg} compact />
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </section>
  );
}
