import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { RiskGauge } from './RiskGauge.jsx';

/** הופך מחרוזת מסלול לגוון צבע יציב, כדי שלכל מסלול יהיה placeholder גרדיאנט עקבי */
function hueFromRoute(route) {
  let hash = 0;
  for (let i = 0; i < route.length; i += 1) {
    hash = (hash * 31 + route.charCodeAt(i)) % 360;
  }
  return hash;
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

export function DealCard({ deal }) {
  const { t } = useLanguage();
  const animatedPrice = useCountUp(Math.round(deal.price));
  const hue = hueFromRoute(`${deal.origin}${deal.destination}`);
  const discountPercent = Math.max(
    0,
    Math.round(((deal.movingAverage - deal.price) / deal.movingAverage) * 100)
  );

  return (
    <motion.article
      className="deal-card"
      variants={cardVariants}
      whileHover={{ scale: 1.025 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div
        className="deal-card__media"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 65%, 38%), hsl(${(hue + 50) % 360}, 70%, 22%))`,
        }}
      >
        {discountPercent > 0 && <span className="deal-card__badge">-{discountPercent}%</span>}
        <span className="deal-card__route">
          {deal.origin} → {deal.destination}
        </span>
      </div>

      <div className="deal-card__body">
        <h3 className="deal-card__title">{deal.title}</h3>
        <p className="deal-card__desc">{deal.description}</p>

        <div className="deal-card__price-row">
          <span className="deal-card__price">
            {animatedPrice} {deal.currency}
          </span>
          {deal.movingAverage && (
            <span className="deal-card__price-avg">
              {t.avgPrice}: {Math.round(deal.movingAverage)} {deal.currency}
            </span>
          )}
        </div>

        <RiskGauge score={deal.enforcementLikelihood} />

        <p className="deal-card__risk">{deal.riskWarning}</p>
      </div>
    </motion.article>
  );
}
