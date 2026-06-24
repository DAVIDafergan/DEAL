import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { agentApi } from '../api/client.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { DestinationImage } from './DestinationImage.jsx';
import { DealDetailModal } from './DealDetailModal.jsx';

const trackVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 28, scale: 0.95 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 260, damping: 22 } },
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
        <Flame size={20} color="var(--color-accent-from)" />
        {t.topValueDealsTitle || '5 Most Valuable Deals Today'}
      </h2>

      <motion.div
        className="top-value-deals__track"
        variants={trackVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        {loading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="tvc tvc--skeleton" />
            ))
          : deals.map((deal) => (
              <motion.div
                key={`${deal.deal_source}-${deal.id}`}
                className="tvc"
                variants={cardVariants}
                whileHover={{ y: -5, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                onClick={() => setSelected(deal)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelected(deal)}
              >
                <div className="tvc__media">
                  <DestinationImage iataCode={deal.destination} />
                  <div className="tvc__gradient" />

                  {/* Pulsing discount badge */}
                  {deal.value_score > 0 && (
                    <span className="tvc__discount tvc__discount--pulse">
                      -{Math.round(deal.value_score)}%
                    </span>
                  )}

                  <div className="tvc__caption">
                    <p className="tvc__dest">{deal.destination_name || deal.destination}</p>
                    <p className="tvc__price">
                      {Math.round(deal.price)}
                      <span className="tvc__currency"> {getCurrencySymbol(deal.currency)}</span>
                    </p>
                  </div>
                </div>

                {deal.business_name && (
                  <div className="tvc__agent">✓ {deal.business_name}</div>
                )}
              </motion.div>
            ))}
      </motion.div>

      <AnimatePresence>
        {selected && (
          <DealDetailModal deal={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
