import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { agentApi } from '../api/client.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { DestinationImage } from './DestinationImage.jsx';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function TopValueDeals() {
  const { t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    agentApi.getTopValueDeals(5)
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && deals.length === 0) return null;

  return (
    <section className="top-value-deals container">
      <h2 className="top-value-deals__title">
        <Flame size={20} color="var(--color-accent-from)" />
        {t.topValueDealsTitle || '5 Most Valuable Deals Today'}
      </h2>

      {loading && (
        <div className="top-value-deals__strip">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="top-value-card top-value-card--skeleton" />
          ))}
        </div>
      )}

      {!loading && (
        <motion.div
          className="top-value-deals__strip"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {deals.map((deal) => (
            <motion.div
              key={`${deal.deal_source}-${deal.id}`}
              className="top-value-card"
              variants={cardVariants}
              whileHover={{ scale: 1.04 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            >
              <div className="top-value-card__media">
                <DestinationImage iataCode={deal.destination} />
              </div>
              <div className="top-value-card__body">
                <p className="top-value-card__dest">{deal.destination}</p>
                <p className="top-value-card__price">
                  {Math.round(deal.price)} {getCurrencySymbol(deal.currency)}
                </p>
                <motion.div
                  className="top-value-card__badge"
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <TrendingDown size={12} />
                  {Math.round(deal.value_score)}% {t.savingsLabel || 'off avg'}
                </motion.div>
                {deal.business_name && (
                  <span className="top-value-card__agent-label">{deal.business_name}</span>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </section>
  );
}
