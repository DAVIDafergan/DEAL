import { motion } from 'framer-motion';

/** אייקון מטוס SVG מינימלי — לא אמוג'י, כדי להישאר עדין ומקצועי */
function PlaneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V18l-2.5 2v1.5l4-1.2 4 1.2V20l-2.5-2v-4.5z" />
    </svg>
  );
}

/**
 * RouteAnimation — קו עדין בין שדה המוצא ליעד, עם מטוס שעובר ביניהם פעם אחת כשהכרטיס נפתח.
 * אנימציה חד-פעמית (לא בלופ אינסופי) — עדינה ומקצועית, לא קיטשית.
 */
export function RouteAnimation() {
  return (
    <div className="route-animation" aria-hidden="true">
      <span className="route-animation__dot route-animation__dot--start" />
      <span className="route-animation__line">
        <motion.span
          className="route-animation__plane"
          initial={{ left: '0%', opacity: 0 }}
          animate={{ left: '100%', opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.6, ease: 'easeInOut', times: [0, 0.15, 0.85, 1] }}
        >
          <PlaneIcon />
        </motion.span>
      </span>
      <span className="route-animation__dot route-animation__dot--end" />
    </div>
  );
}
