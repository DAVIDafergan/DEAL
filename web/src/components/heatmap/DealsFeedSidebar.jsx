import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useNow } from '../../context/NowContext.jsx';
import { getDiscountPercent } from '../../utils/dealHeat.js';
import { isRecentlyAdded } from '../../utils/countdown.js';
import { NewBadge } from './NewBadge.jsx';
import { CountdownTimer } from './CountdownTimer.jsx';

const FEED_LIMIT = 8;

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

/** פיד צד עם הדילים האחרונים שנכנסו — נתונים כבר ממוינים מהחדש לישן ע"י ה-API */
export function DealsFeedSidebar({ deals }) {
  const { t } = useLanguage();
  const now = useNow(); // מאלץ רענון תקופתי כדי שבאדג' "חדש" יתעדכן ויתכבה אוטומטית
  const recent = deals.slice(0, FEED_LIMIT);

  return (
    <aside className="deals-feed glass-panel">
      <h2 className="deals-feed__title">{t.feedTitle}</h2>

      {recent.length === 0 ? (
        <p className="deals-feed__empty">{t.feedEmpty}</p>
      ) : (
        <motion.ul className="deals-feed__list" variants={listVariants} initial="hidden" animate="visible">
          {recent.map((deal) => {
            const discountPercent = getDiscountPercent(deal);
            return (
              <motion.li key={deal.id} className="deals-feed__item" variants={itemVariants}>
                <div className="deals-feed__item-top">
                  <span className="deals-feed__route">
                    {deal.origin} → {deal.destination}
                  </span>
                  {isRecentlyAdded(deal.createdAt, now) && <NewBadge />}
                </div>
                <div className="deals-feed__item-bottom">
                  <span className="deals-feed__price">
                    {Math.round(deal.price)} {deal.currency}
                  </span>
                  <span className="deals-feed__discount">-{discountPercent}%</span>
                </div>
                <CountdownTimer createdAt={deal.createdAt} className="deals-feed__countdown" />
              </motion.li>
            );
          })}
        </motion.ul>
      )}
    </aside>
  );
}
