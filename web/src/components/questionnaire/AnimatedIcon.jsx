import { motion } from 'framer-motion';
import { ICON_PATHS } from './iconPaths.js';

const MOTION_TAGS = { path: motion.path, circle: motion.circle, rect: motion.rect };

/**
 * AnimatedIcon — "מצייר" אייקון בכניסה: כל path/circle מקבל pathLength מ-0 ל-1 (stroke
 * שמתמלא בהדרגה, לא fade רגיל), ברצף קצר (delay מצטבר). lucide-react עצמו לא חושף את
 * ה-path-ים שלו ל-motion ישירות (האייקון "סגור", מרכיב svg מוכן) — לכן ICON_PATHS.js
 * שומר את קואורדינטות ה-path בעצמן (לא קוד), והרכיב הזה בונה את ה-svg בעצמו עם motion.path.
 */
export function AnimatedIcon({ name, size = 32, delay = 0, className = '' }) {
  const nodes = ICON_PATHS[name] || [];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {nodes.map(([tag, attrs], index) => {
        const MotionTag = MOTION_TAGS[tag] || motion.path;
        return (
          <MotionTag
            key={index}
            {...attrs}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: delay + index * 0.12, ease: 'easeInOut' }}
          />
        );
      })}
    </svg>
  );
}
