import { motion } from 'framer-motion';
import { Marker } from 'react-simple-maps';
import { HEAT_TIER_CONFIG } from '../../utils/dealHeat.js';

const config = HEAT_TIER_CONFIG.live; // neutral teal-ish accent — same token used for live_price flight markers

/** RegionMarker — same three-layer glow/pulse/core marker as DealMarker, keyed to a region instead of a single deal. */
export function RegionMarker({ region, coordinates, count, onHover, onLeave, onSelect }) {
  return (
    <Marker coordinates={coordinates}>
      <motion.g
        className="deal-marker deal-marker--live"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16 }}
        onMouseEnter={(event) => onHover?.(region, event)}
        onMouseMove={(event) => onHover?.(region, event)}
        onMouseLeave={() => onLeave?.()}
        onClick={(event) => onSelect?.(region, event)}
      >
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
          r={count > 0 ? config.radius : config.radius * 0.7}
          fill="none"
          stroke={config.color}
          style={{ animationDuration: `${config.pulseDuration}s` }}
        />
        <circle className="deal-marker__core" r={config.radius * 0.55} fill={config.color} />
      </motion.g>
    </Marker>
  );
}
