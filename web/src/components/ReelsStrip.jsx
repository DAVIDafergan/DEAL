import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clapperboard, Play } from 'lucide-react';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const REELS_START_KEY = 'deal_radar_reels_start_id';

export function ReelsStrip({ deals: propDeals }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deals, setDeals] = useState(propDeals || []);

  useEffect(() => {
    if (propDeals && propDeals.length > 0) { setDeals(propDeals); return; }
    agentApi.getApprovedDeals()
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => {});
  }, [propDeals]);

  if (deals.length === 0) return null;

  const preview = deals.slice(0, 6);

  function openReel(deal, index) {
    sessionStorage.setItem(REELS_START_KEY, deal.id);
    navigate('/reels');
  }

  return (
    <section className="reels-strip container">
      <div className="reels-strip__header">
        <span className="reels-strip__icon-wrap">
          <Clapperboard size={18} color="var(--color-accent-from)" />
        </span>
        <h2 className="reels-strip__title">{t.reelsStripTitle || 'דילים בווידאו'}</h2>
        <motion.button
          className="reels-strip__see-all"
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/reels')}
        >
          {t.reelsSeeAll || 'כל הרילס →'}
        </motion.button>
      </div>

      <div className="reels-strip__scroll">
        {preview.map((deal, i) => (
          <motion.button
            key={deal.id}
            className="reels-strip__card"
            whileTap={{ scale: 0.96 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => openReel(deal, i)}
          >
            <div className="reels-strip__thumb">
              {deal.photo_url
                ? <img src={deal.photo_url} alt={deal.destination_name} className="reels-strip__img" />
                : <div className="reels-strip__img-placeholder" />}
              <div className="reels-strip__thumb-overlay" />
              <div className="reels-strip__play-icon">
                <Play size={20} fill="white" color="white" />
              </div>
            </div>
            <div className="reels-strip__dest">
              <span className="reels-strip__dest-name">{deal.destination_name || deal.destination}</span>
              {deal.price && (
                <span className="reels-strip__dest-price">{Math.round(deal.price)} {deal.currency}</span>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
