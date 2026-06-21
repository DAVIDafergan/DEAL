import { motion } from 'framer-motion';
import { Marker } from 'react-simple-maps';
import { HEAT_TIER_CONFIG, getHeatTier } from '../../utils/dealHeat.js';

/**
 * DealMarker — נקודה זוהרת על המפה לדיל בודד.
 * שלוש שכבות עיגולים: glow מטושטש (אווירה), טבעת פעימה רציפה (CSS, עוצמה לפי חום הדיל),
 * וגרעין מוצק במרכז. כניסה ראשונה למפה מאנימטת עם Framer Motion: scale-in + ripple חד-פעמי.
 * דילי live_price מקבלים שכבה ניטרלית ('live') ולא נכנסים לסקאלת החום (ראו utils/dealHeat.js).
 */
export function DealMarker({ deal, coordinates, onHover, onLeave, onSelect }) {
  const tier = getHeatTier(deal);
  const config = HEAT_TIER_CONFIG[tier];

  return (
    <Marker coordinates={coordinates}>
      <motion.g
        className={`deal-marker deal-marker--${tier}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        onMouseEnter={(event) => onHover?.(deal, event)}
        onMouseMove={(event) => onHover?.(deal, event)}
        onMouseLeave={() => onLeave?.()}
        onClick={(event) => onSelect?.(deal, event)}
      >
        {/* ripple חד-פעמי בכניסה — "התפוצצות" קצרה כשהדיל מופיע לראשונה */}
        <motion.circle
          className="deal-marker__ripple"
          r={config.radius}
          fill="none"
          stroke={config.color}
          strokeWidth={2}
          initial={{ scale: 0.6, opacity: 0.9 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut' }}
        />

        <circle
          className="deal-marker__glow"
          r={config.radius * 1.9}
          fill={config.color}
          style={{ animationDuration: `${config.pulseDuration}s`, filter: `blur(${config.glowBlur}px)` }}
        />
        <circle
          className="deal-marker__pulse-ring"
          r={config.radius}
          fill="none"
          stroke={config.color}
          style={{ animationDuration: `${config.pulseDuration}s` }}
        />
        <circle className="deal-marker__core" r={config.radius * 0.55} fill={config.color} />
      </motion.g>
    </Marker>
  );
}
