import { motion } from 'framer-motion';

const PLANE_PATH = 'M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V18l-2.5 2v1.5l4-1.2 4 1.2V20l-2.5-2v-4.5z';

const LINE_START = 4;
const LINE_END = 96;

/** מחזיר את מיקומי X (ב-viewBox 0-100) של נקודות העצירה, מרווחות שווה בין המוצא ליעד */
function getStopPositions(stops) {
  if (!stops || stops <= 0) return [];
  return Array.from({ length: stops }, (_, i) => LINE_START + ((LINE_END - LINE_START) * (i + 1)) / (stops + 1));
}

/**
 * RouteAnimation — קו שמצייר את עצמו בין המוצא ליעד (SVG pathLength), עיגולים מהבהבים
 * בנקודות העצירה (ממשיכים כל עוד הכרטיס פתוח), ומטוס שעובר פעם אחת מעל הקו. עדין ומקצועי,
 * לא קיטשי — בלי לופ אינסופי על האנימציות העיקריות, רק על ההבהוב העדין של נקודות העצירה.
 */
export function RouteAnimation({ stops = 0 }) {
  const stopPositions = getStopPositions(stops);

  return (
    <svg className="route-animation" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
      <motion.line
        x1={LINE_START}
        y1="10"
        x2={LINE_END}
        y2="10"
        className="route-animation__line"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
      />

      {stopPositions.map((x, i) => (
        <motion.circle
          key={i}
          cx={x}
          cy="10"
          r="2.2"
          className="route-animation__stop-dot"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0.35, 1], scale: 1 }}
          transition={{
            scale: { delay: 0.5 + i * 0.15, duration: 0.3 },
            opacity: { delay: 0.5 + i * 0.15, duration: 1.6, repeat: Infinity, repeatDelay: 0.8 },
          }}
        />
      ))}

      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.3, ease: 'easeInOut', times: [0, 0.15, 0.85, 1] }}
      >
        <motion.g initial={{ x: LINE_START }} animate={{ x: LINE_END }} transition={{ duration: 1.3, ease: 'easeInOut' }}>
          <g className="route-animation__plane" transform="translate(-2,8) scale(0.17) rotate(90 12 12)">
            <path d={PLANE_PATH} />
          </g>
        </motion.g>
      </motion.g>

      <circle cx={LINE_START} cy="10" r="2.6" className="route-animation__dot route-animation__dot--start" />
      <circle cx={LINE_END} cy="10" r="2.6" className="route-animation__dot route-animation__dot--end" />
    </svg>
  );
}
