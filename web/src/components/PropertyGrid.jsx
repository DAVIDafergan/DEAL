import { motion, AnimatePresence } from 'framer-motion';
import { PropertyCard } from './PropertyCard.jsx';
import { SkeletonCard } from './SkeletonCard.jsx';

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export function PropertyGrid({ properties, isLoading, hasActiveFilters = false }) {
  if (isLoading) {
    return (
      <div className="deals-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (properties.length === 0) {
    return <p className="deal-card__desc">{hasActiveFilters ? 'לא נמצאו נכסים התואמים את הסינון' : 'אין עדיין נכסים להצגה'}</p>;
  }

  return (
    <motion.div className="deals-grid" variants={gridVariants} initial="hidden" animate="visible">
      <AnimatePresence>
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
