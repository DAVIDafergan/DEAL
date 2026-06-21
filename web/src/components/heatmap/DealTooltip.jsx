import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getDiscountPercent } from '../../utils/dealHeat.js';

/** טולטיפ Glassmorphism שעוקב אחרי המצביע — נפתח ב-hover/קליק על נקודה במפה */
export function DealTooltip({ deal, x, y, onClose }) {
  const { t } = useLanguage();
  const discountPercent = getDiscountPercent(deal);

  function handleViewDeal() {
    document.getElementById(`deal-${deal.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    onClose?.();
  }

  return (
    <motion.div
      className="deal-tooltip glass-panel"
      // מרווח לוגי (marginInlineStart) ולא transform — כדי לא להתנגש עם ה-transform שFramer
      // Motion עצמו מנהל על האלמנט (scale/y של אנימציית הכניסה), והופך כיוון אוטומטית ב-RTL
      style={{ left: x, top: y, marginInlineStart: '16px', marginTop: '-60px' }}
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      role="tooltip"
    >
      <div className="deal-tooltip__route">
        {deal.origin} → {deal.destination}
      </div>
      <div className="deal-tooltip__row">
        <span>{t.tooltipPriceLabel}</span>
        <strong>
          {Math.round(deal.price)} {deal.currency}
        </strong>
      </div>
      <div className="deal-tooltip__row">
        <span>{t.tooltipDiscountLabel}</span>
        <strong className="deal-tooltip__discount">-{discountPercent}%</strong>
      </div>
      <button type="button" className="deal-tooltip__cta" onClick={handleViewDeal}>
        {t.viewDealButton}
      </button>
    </motion.div>
  );
}
