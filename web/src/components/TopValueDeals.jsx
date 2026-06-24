import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { agentApi } from '../api/client.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { DestinationImage } from './DestinationImage.jsx';
import { DealDetailModal } from './DealDetailModal.jsx';

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

      <div className="top-value-deals__track">
        {loading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="tvc tvc--skeleton" />
            ))
          : deals.map((deal) => (
              <motion.div
                key={`${deal.deal_source}-${deal.id}`}
                className="tvc"
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                onClick={() => setSelected(deal)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelected(deal)}
              >
                {/* ── Image fills the card ──────────────── */}
                <div className="tvc__media">
                  <DestinationImage iataCode={deal.destination} />
                  <div className="tvc__gradient" />

                  {/* Discount badge — top-right corner */}
                  {deal.value_score > 0 && (
                    <span className="tvc__discount">-{Math.round(deal.value_score)}%</span>
                  )}

                  {/* Caption — bottom of image */}
                  <div className="tvc__caption">
                    <p className="tvc__dest">{deal.destination_name || deal.destination}</p>
                    <p className="tvc__price">
                      {Math.round(deal.price)}
                      <span className="tvc__currency"> {getCurrencySymbol(deal.currency)}</span>
                    </p>
                  </div>
                </div>

                {/* Agent badge — below image */}
                {deal.business_name && (
                  <div className="tvc__agent">✓ {deal.business_name}</div>
                )}
              </motion.div>
            ))}
      </div>

      <AnimatePresence>
        {selected && (
          <DealDetailModal deal={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}
