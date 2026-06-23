import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DealCard } from './DealCard.jsx';
import { SkeletonCard } from './SkeletonCard.jsx';

const PAGE_SIZE = 8;

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, ease: 'easeOut', delay: i * 0.05 },
  }),
};

export function RadarSection({ deals = [], isLoading = false, packageConfig = null, cheapestDealId = null }) {
  const { t } = useLanguage();
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = deals.slice(0, visibleCount);
  const hasMore = visibleCount < deals.length;

  function loadMore() {
    setVisibleCount((c) => Math.min(c + PAGE_SIZE, deals.length));
  }

  return (
    <section className="radar-section container">
      <div className="radar-section__header">
        <h2 className="radar-section__title">
          <Radio size={22} color="var(--color-accent-from)" />
          {t.radarSectionTitle || 'הרדאר שלנו 📡'}
        </h2>
        <p className="radar-section__subtitle">
          {t.radarSectionSubtitle || 'מחירי טיסות חריגים שהמערכת שלנו גילתה אוטומטית'}
        </p>
      </div>

      {isLoading ? (
        <div className="deals-grid">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="deals-grid">
            <AnimatePresence>
              {visible.map((deal, i) => (
                <motion.div
                  key={deal.id}
                  custom={i % PAGE_SIZE}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <DealCard
                    deal={deal}
                    packageConfig={packageConfig}
                    isCheapest={deal.id === cheapestDealId}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {hasMore && (
            <div className="radar-section__load-more">
              <motion.button
                type="button"
                className="radar-section__load-btn"
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.03 }}
                onClick={loadMore}
              >
                <ChevronDown size={18} />
                {t.loadMoreButton || 'טען עוד'}
              </motion.button>
            </div>
          )}

          {deals.length === 0 && (
            <p className="radar-section__empty">{t.radarEmptyMessage || 'אין דילים פעילים כרגע — הרדאר סורק...'}</p>
          )}
        </>
      )}
    </section>
  );
}
