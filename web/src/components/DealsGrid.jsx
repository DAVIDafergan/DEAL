import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DealCard } from './DealCard.jsx';
import { SkeletonCard } from './SkeletonCard.jsx';

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export function DealsGrid({ deals, isLoading }) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="deals-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (deals.length === 0) {
    return <p className="deal-card__desc">{t.empty}</p>;
  }

  return (
    <motion.div className="deals-grid" variants={gridVariants} initial="hidden" animate="visible">
      {deals.map((deal) => (
        <DealCard key={deal.id} deal={deal} />
      ))}
    </motion.div>
  );
}
