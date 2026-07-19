import { motion } from 'framer-motion';

/** RegionTooltip — same glass-panel tooltip shell as DealTooltip, region content instead of a single deal. */
export function RegionTooltip({ region, x, y, onClose, onView }) {
  return (
    <motion.div
      className="deal-tooltip glass-panel"
      style={{ left: x, top: y, marginInlineStart: '16px', marginTop: '-60px' }}
      initial={{ opacity: 0, scale: 0.92, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      role="tooltip"
    >
      <div className="deal-tooltip__route">{region.label}</div>
      <div className="deal-tooltip__row">
        <span>נכסים באזור</span>
        <strong>{region.count}</strong>
      </div>
      <button type="button" className="deal-tooltip__cta" onClick={() => { onView?.(region.value); onClose?.(); }}>
        הצג נכסים באזור
      </button>
    </motion.div>
  );
}
