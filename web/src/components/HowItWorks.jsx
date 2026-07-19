import { motion } from 'framer-motion';
import { Upload, SlidersHorizontal, Trophy } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    num: '01',
    title: 'בעלי צימרים מוסיפים נכסים',
    sub: 'בעלי הצימרים והווילות הטובים בישראל מוסיפים את הנכס שלהם עם כל הפרטים',
    color: 'var(--color-accent-from)',
    glow: 'rgba(37,99,235,0.22)',
  },
  {
    icon: SlidersHorizontal,
    num: '02',
    title: 'המערכת מאמתת ומסננת',
    sub: 'כל נכס עובר בדיקה, ומקבל תג "מאומת" ברגע שהבעלים אישר את הפרטים',
    color: '#17c3b2',
    glow: 'rgba(23,195,178,0.22)',
  },
  {
    icon: Trophy,
    num: '03',
    title: 'אתה מוצא ומזמין ישירות',
    sub: 'פנייה ישירה לבעל הנכס — בלי מתווכים, בלי עמלות נסתרות',
    color: '#f5a623',
    glow: 'rgba(245,166,35,0.22)',
  },
];

const EASE_EXPO = [0.16, 1, 0.3, 1];   // exponential out — fast deceleration
const EASE_BACK = [0.34, 1.56, 0.64, 1]; // back-overshoot for spring feel

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.32 } },
};

const stepVariant = {
  hidden: { opacity: 0, y: 52, scale: 0.94 },
  visible: (i) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.65, delay: i * 0.06, ease: EASE_EXPO },
  }),
};

const ringVariant = {
  hidden: { pathLength: 0, opacity: 0, rotate: -30 },
  visible: (i) => ({
    pathLength: 1, opacity: 1, rotate: 0,
    transition: {
      pathLength: { duration: 1.2, delay: i * 0.32 + 0.18, ease: EASE_EXPO },
      opacity: { duration: 0.3, delay: i * 0.32 + 0.18 },
      rotate: { duration: 1.1, delay: i * 0.32 + 0.18, ease: EASE_EXPO },
    },
  }),
};

const iconVariant = {
  hidden: { scale: 0.4, opacity: 0, rotate: -12, y: 6 },
  visible: (i) => ({
    scale: 1, opacity: 1, rotate: 0, y: 0,
    transition: {
      type: 'spring', stiffness: 420, damping: 22,
      delay: i * 0.32 + 0.42,
    },
  }),
};

const textVariant = {
  hidden: { opacity: 0, y: 22, filter: 'blur(4px)' },
  visible: (i) => ({
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.52, delay: i * 0.32 + 0.58, ease: EASE_EXPO },
  }),
};

const connectorVariant = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i) => ({
    pathLength: 1, opacity: 1,
    transition: { duration: 0.5, delay: i * 0.32 + 0.72, ease: [0.4, 0, 0.2, 1] },
  }),
};

const hoverStep = {
  rest: { scale: 1, rotateX: 0, rotateY: 0 },
  hover: { scale: 1.03, rotateX: -2, rotateY: 2, transition: { duration: 0.25, ease: 'easeOut' } },
};

export function HowItWorks() {
  return (
    <section className="hiw-section" dir="rtl">
      <div className="hiw-inner container">
        <motion.p
          className="hiw-eyebrow"
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: EASE_EXPO }}
        >
          איך זה עובד?
        </motion.p>
        <motion.h2
          className="hiw-heading"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.07, ease: EASE_EXPO }}
        >
          הדרך הכי חכמה למצוא דיל
        </motion.h2>

        <motion.div
          className="hiw-grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-30px' }}
        >
          {steps.map(({ icon: Icon, num, title, sub, color, glow }, i) => (
            <motion.div
              key={i}
              className="hiw-step"
              custom={i}
              variants={stepVariant}
              whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.28, ease: 'easeOut' } }}
            >
              {/* Animated ring + icon */}
                <div className="hiw-icon-wrap" style={{ '--hiw-glow': glow }}>
                  <svg className="hiw-ring" viewBox="0 0 96 96" fill="none">
                    <defs>
                      <linearGradient id={`hiw-g-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={color} stopOpacity="0.95" />
                        <stop offset="100%" stopColor={color} stopOpacity="0.25" />
                      </linearGradient>
                    </defs>
                    <circle cx="48" cy="48" r="44" stroke={color} strokeWidth="1" opacity="0.12" />
                    <motion.circle
                      cx="48" cy="48" r="44"
                      stroke={`url(#hiw-g-${i})`}
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      custom={i}
                      variants={ringVariant}
                    />
                  </svg>

                  <motion.div className="hiw-icon-inner" custom={i} variants={iconVariant}>
                    <Icon size={36} strokeWidth={1.35} color={color} />
                  </motion.div>

                  <motion.div
                    className="hiw-pulse"
                    style={{ background: color }}
                    animate={{ scale: [1, 1.7, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.7, ease: 'easeInOut' }}
                  />
                </div>

                <motion.div custom={i} variants={textVariant}>
                  <div className="hiw-step-num" style={{ color }}>{num}</div>
                  <h3 className="hiw-step-title">{title}</h3>
                  <p className="hiw-step-sub">{sub}</p>
                </motion.div>

              {i < steps.length - 1 && (
                <div className="hiw-connector" aria-hidden="true">
                  <motion.svg viewBox="0 0 40 20" fill="none" className="hiw-arrow">
                    <motion.path
                      d="M32 10 L0 10 M6 4 L0 10 L6 16"
                      stroke="var(--color-border)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      custom={i}
                      variants={connectorVariant}
                    />
                  </motion.svg>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
