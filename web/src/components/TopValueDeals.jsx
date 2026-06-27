import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, CheckCircle, Share2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { agentApi } from '../api/client.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { DestinationImage } from './DestinationImage.jsx';
import { DealDetailModal } from './DealDetailModal.jsx';

const trackVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 36, scale: 0.93 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring', stiffness: 240, damping: 20 },
  },
};

function AgentAvatar({ logoUrl, name }) {
  const initial = name ? name[0].toUpperCase() : '?';
  return (
    <div className="tvc__avatar">
      {logoUrl
        ? <img src={logoUrl} alt={name} className="tvc__avatar-img" />
        : <span className="tvc__avatar-initial">{initial}</span>}
    </div>
  );
}

async function shareCard(e, deal) {
  e.stopPropagation();
  const url = deal.id
    ? `https://dealim.org/deal/${deal.id}`
    : `https://dealim.org/agent/${deal.agent_slug || ''}`;
  const title = `דיל ל${deal.destination_name || deal.destination} — ${deal.price} ${deal.currency}`;
  if (navigator.share) {
    try { await navigator.share({ title, url }); return; } catch {}
  }
  try { await navigator.clipboard.writeText(url); } catch {}
}

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

  return (
    <section className={`top-value-deals container${hero ? ' top-value-deals--hero' : ''}`}>
      <h2 className="top-value-deals__title">
        <Flame size={22} color="var(--color-accent-from)" />
        {t.topValueDealsTitle || '5 הדילים המשתלמים ביותר היום'}
      </h2>

      {!loading && deals.length === 0 ? (
        <p className="top-value-deals__empty">
          {t.noTopDealsYet || 'הדילים המשתלמים ביותר יופיעו כאן בקרוב ✈️'}
        </p>
      ) : (
        <motion.div
          className="top-value-deals__track"
          variants={trackVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
        >
          {loading
            ? [...Array(5)].map((_, i) => <div key={i} className="tvc tvc--skeleton" />)
            : deals.map((deal) => (
                <motion.div
                  key={`${deal.deal_source}-${deal.id}`}
                  className="tvc"
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.025 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  onClick={() => setSelected(deal)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setSelected(deal)}
                >
                  {/* Image area */}
                  <div className="tvc__media">
                    <DestinationImage iataCode={deal.destination} />
                    <div className="tvc__gradient" />

                    {deal.value_score > 0 && (
                      <span className="tvc__discount tvc__discount--pulse">
                        🔥 -{Math.round(deal.value_score)}%
                      </span>
                    )}

                    {/* Price overlay — glassmorphism pill */}
                    <div className="tvc__price-chip">
                      <span className="tvc__price-num">{Math.round(deal.price)}</span>
                      <span className="tvc__price-cur">{getCurrencySymbol(deal.currency)}</span>
                    </div>

                    <p className="tvc__dest">{deal.destination_name || deal.destination}</p>
                  </div>

                  {/* Agent footer */}
                  {deal.business_name && (
                    <div className="tvc__agent-row">
                      <AgentAvatar
                        logoUrl={deal.agent_logo_url}
                        name={deal.business_name}
                      />
                      <div className="tvc__agent-info">
                        <span className="tvc__agent-name">{deal.business_name}</span>
                        <span className="tvc__agent-verified">
                          <CheckCircle size={10} /> מאומת
                        </span>
                      </div>
                      <motion.button
                        className="tvc__share-btn"
                        whileTap={{ scale: 0.88 }}
                        onClick={(e) => shareCard(e, deal)}
                        aria-label="שתף דיל"
                      >
                        <Share2 size={13} />
                      </motion.button>
                    </div>
                  )}
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
