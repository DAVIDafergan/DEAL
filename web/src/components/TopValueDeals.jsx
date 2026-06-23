import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { agentApi } from '../api/client.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { DestinationImage } from './DestinationImage.jsx';
import { DealDetailModal } from './DealDetailModal.jsx';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.94 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
};

const badgePulse = {
  animate: {
    scale: [1, 1.08, 1],
    boxShadow: [
      '0 0 12px rgba(249,115,22,0.4)',
      '0 0 28px rgba(249,115,22,0.75)',
      '0 0 12px rgba(249,115,22,0.4)',
    ],
  },
  transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' },
};

export function TopValueDeals({ hero }) {
  const { t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    agentApi.getTopValueDeals(5)
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && deals.length === 0) return null;

  return (
    <section className={`top-value-deals container${hero ? ' top-value-deals--hero' : ''}`}>
      <h2 className="top-value-deals__title">
        <Flame size={22} color="var(--color-accent-from)" />
        {t.topValueDealsTitle || '5 Most Valuable Deals Today'}
      </h2>

      {loading && (
        <div className="top-value-deals__grid">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="top-value-card top-value-card--skeleton" />
          ))}
        </div>
      )}

      {!loading && (
        <motion.div
          className="top-value-deals__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {deals.map((deal) => (
            <motion.div
              key={`${deal.deal_source}-${deal.id}`}
              className="top-value-card"
              variants={cardVariants}
              whileHover={{ scale: 1.04, y: -4 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={() => setSelected(deal)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setSelected(deal)}
            >
              <div className="top-value-card__media">
                <DestinationImage iataCode={deal.destination} />
                <div className="top-value-card__media-overlay" />
                {deal.value_score > 0 && (
                  <motion.div
                    className="top-value-card__badge-wrap"
                    animate={badgePulse.animate}
                    transition={badgePulse.transition}
                  >
                    <span className="top-value-card__badge">
                      <span className="icon-draw icon-draw--once"><TrendingDown size={15} strokeWidth={2.5} /></span>
                      -{Math.round(deal.value_score)}%
                    </span>
                  </motion.div>
                )}
              </div>

              <div className="top-value-card__body">
                <p className="top-value-card__dest">
                  {deal.destination_name || deal.destination || deal.origin}
                </p>
                <p className="top-value-card__price">
                  {Math.round(deal.price)}{' '}
                  <span className="top-value-card__currency">{getCurrencySymbol(deal.currency)}</span>
                </p>
                {deal.business_name && (
                  <span className="top-value-card__agent-label">✓ {deal.business_name}</span>
                )}
                <span className="top-value-card__tap-hint">{t.tapForDetails || 'לפרטים ←'}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {selected && (
          <DealDetailModal deal={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
