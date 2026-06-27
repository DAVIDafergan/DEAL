import { motion } from 'framer-motion';

const EASE_EXPO = [0.16, 1, 0.3, 1];

export function Logo({ size = 36 }) {
  const scale = size / 44;

  return (
    <motion.span
      className="logo"
      initial={{ opacity: 0, scale: 0.88 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.55, ease: EASE_EXPO }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="logo__mark"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="lg-main" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#17c3b2" />
          </linearGradient>
          <linearGradient id="lg-slash" x1="30" y1="6" x2="16" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#17c3b2" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* D-spine: vertical left bar */}
        <motion.path
          d="M11 7 L11 37"
          stroke="url(#lg-main)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { duration: 0.45, ease: EASE_EXPO }, opacity: { duration: 0.1 } }}
        />

        {/* D-arc: the bow of the D */}
        <motion.path
          d="M11 7 C11 7 35 7 35 22 C35 37 11 37 11 37"
          stroke="url(#lg-main)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.65, delay: 0.2, ease: EASE_EXPO },
            opacity: { duration: 0.1, delay: 0.2 },
          }}
        />

        {/* Diagonal slash: the "deal-cut" signature mark */}
        <motion.path
          d="M30 9 L19 35"
          stroke="url(#lg-slash)"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{
            pathLength: { duration: 0.35, delay: 0.55, ease: EASE_EXPO },
            opacity: { duration: 0.1, delay: 0.55 },
          }}
        />

        {/* Glow dot — appears after draw completes */}
        <motion.circle
          cx="11"
          cy="22"
          r="2.2"
          fill="url(#lg-main)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 520, damping: 18, delay: 0.82 }}
        />
      </svg>

      <motion.span
        className="logo__wordmark"
        initial={{ opacity: 0, x: 6 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, delay: 0.7, ease: EASE_EXPO }}
      >
        Dealim
      </motion.span>
    </motion.span>
  );
}
