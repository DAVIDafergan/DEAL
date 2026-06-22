import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';
import { getDiscountPercent } from '../utils/dealHeat.js';
import { shareDeal } from '../utils/share.js';
import { RiskGauge } from './RiskGauge.jsx';
import { CountdownTimer } from './heatmap/CountdownTimer.jsx';
import { UpdatedAgoLabel } from './UpdatedAgoLabel.jsx';
import { FlightDetails } from './FlightDetails.jsx';
import { DestinationImage } from './DestinationImage.jsx';
import { PackageBuilder } from './PackageBuilder.jsx';

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
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.22, ease: 'easeIn' } },
};

/**
 * DealCard — כרטיס הדיל המרכזי. שני סוגי דיל מוצגים אחרת:
 *   - anomaly: badge הנחה בוער, Risk gauge, טיימר מעקב, אזהרת סיכון.
 *   - live_price: badge "מחיר הזול ביותר" רגוע יותר, "עודכן לפני X" במקום טיימר/אזהרה
 *     (אין כאן ניתוח סיכון אמיתי — זה פשוט המחיר הנוכחי).
 */
export function DealCard({ deal, packageConfig = null }) {
  const { t } = useLanguage();
  const [shareStatus, setShareStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPackageOpen, setIsPackageOpen] = useState(false);
  const animatedPrice = useCountUp(Math.round(deal.price));
  const hue = hueFromRoute(`${deal.origin}${deal.destination}`);
  const isAnomaly = deal.type === 'anomaly';
  const discountPercent = isAnomaly ? getDiscountPercent(deal) : 0;

  async function handleShare() {
    const result = await shareDeal(deal, t);
    if (result.method === 'clipboard') {
      setShareStatus('copied');
      setTimeout(() => setShareStatus(null), 2000);
    }
  }

  return (
    <motion.article
      id={`deal-${deal.id}`}
      className="deal-card"
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div
        className="deal-card__media"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 65%, 38%), hsl(${(hue + 50) % 360}, 70%, 22%))`,
        }}
      >
        <DestinationImage iataCode={deal.destination} />
        {isAnomaly && discountPercent > 0 && <span className="deal-card__badge deal-card__badge--hot">-{discountPercent}%</span>}
        {!isAnomaly && <span className="deal-card__badge deal-card__badge--calm">{t.bestPriceBadge}</span>}
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
          {isAnomaly && deal.movingAverage && (
            <span className="deal-card__price-avg">
              {t.avgPrice}: {Math.round(deal.movingAverage)} {deal.currency}
            </span>
          )}
        </div>

        {isAnomaly ? (
          <>
            <RiskGauge score={deal.enforcementLikelihood} />
            <CountdownTimer createdAt={deal.createdAt} />
            <p className="deal-card__risk">{deal.riskWarning}</p>
          </>
        ) : (
          <UpdatedAgoLabel updatedAt={deal.updatedAt} className="deal-card__updated" />
        )}

        <button
          type="button"
          className="deal-card__expand-toggle"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <span>{t.flightDetailsButton}</span>
          <motion.span
            className="deal-card__expand-chevron"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ⌄
          </motion.span>
        </button>

        <AnimatePresence initial={false}>{isExpanded && <FlightDetails deal={deal} />}</AnimatePresence>

        {packageConfig?.travelpayoutsMarker && (
          <>
            <button
              type="button"
              className="deal-card__expand-toggle deal-card__package-toggle"
              aria-expanded={isPackageOpen}
              onClick={() => setIsPackageOpen((prev) => !prev)}
            >
              <span>{t.packageToggleButton}</span>
              <motion.span
                className="deal-card__expand-chevron"
                animate={{ rotate: isPackageOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                ⌄
              </motion.span>
            </button>

            <AnimatePresence initial={false}>
              {isPackageOpen && <PackageBuilder deal={deal} packageConfig={packageConfig} />}
            </AnimatePresence>
          </>
        )}

        <div className="deal-card__actions">
          <motion.button
            type="button"
            className="deal-card__action deal-card__action--share"
            whileTap={{ scale: 0.96 }}
            onClick={handleShare}
          >
            {shareStatus === 'copied' ? t.copiedToClipboard : t.shareButton}
          </motion.button>

          {deal.bookingUrl && (
            <motion.a
              href={deal.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="deal-card__action deal-card__action--buy"
              whileTap={{ scale: 0.96 }}
            >
              {t.buyNowButton}
            </motion.a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
