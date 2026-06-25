import { motion } from 'framer-motion';
import { Upload, Sparkles, Trophy } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    num: '01',
    title: 'סוכנים מעלים דילים',
    sub: 'סוכני הנסיעות הטובים בישראל מעלים עסקאות ייחודיות כל יום — ישירות מהשדה',
    color: 'var(--color-accent-from)',
    glow: 'rgba(37,99,235,0.20)',
  },
  {
    icon: Sparkles,
    num: '02',
    title: 'המערכת מדרגת ומסננת',
    sub: 'אלגוריתם חכם בוחר רק את הדילים הכי טובים, מאמת אותם ומוודא שהם אמיתיים',
    color: '#17c3b2',
    glow: 'rgba(23,195,178,0.20)',
  },
  {
    icon: Trophy,
    num: '03',
    title: 'אתה מקבל רק את הטוב ביותר',
    sub: 'עסקאות מדהימות מסוכנים מאומתים — ישירות אליך, בלי רעש',
    color: '#f5a623',
    glow: 'rgba(245,166,35,0.20)',
  },
];

// Parent triggers children stagger
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.28 } },
};

// Each step: whole block slides+fades in
const stepVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.55, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Ring draws after step appears
const ringVariant = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i) => ({
    pathLength: 1, opacity: 1,
    transition: { duration: 1.1, delay: i * 0.28 + 0.15, ease: [0.4, 0, 0.2, 1] },
  }),
};

// Icon pops in with spring after ring starts drawing
const iconVariant = {
  hidden: { scale: 0.5, opacity: 0 },
  visible: (i) => ({
    scale: 1, opacity: 1,
    transition: { type: 'spring', stiffness: 380, damping: 20, delay: i * 0.28 + 0.35 },
  }),
};

// Text slides up after icon
const textVariant = {
  hidden: { opacity: 0, y: 18 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.45, delay: i * 0.28 + 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

// Connector line draws (RTL: points LEFT — from step N toward step N+1)
const connectorVariant = {
  hidden: { pathLength: 0 },
  visible: (i) => ({
    pathLength: 1,
    transition: { duration: 0.45, delay: i * 0.28 + 0.55, ease: 'easeOut' },
  }),
};

export function HowItWorks() {
  return (
    <section className="hiw-section" dir="rtl">
      <div className="hiw-inner container">
        <motion.p
          className="hiw-eyebrow"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
        >
          איך זה עובד?
        </motion.p>
        <motion.h2
          className="hiw-heading"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.06 }}
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
              whileHover="hover"
            >
              {/* Animated ring + icon */}
              <div className="hiw-icon-wrap" style={{ '--hiw-glow': glow }}>
                <svg className="hiw-ring" viewBox="0 0 96 96" fill="none">
                  <defs>
                    <linearGradient id={`hiw-g-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  {/* Static background ring */}
                  <circle cx="48" cy="48" r="44" stroke={color} strokeWidth="1" opacity="0.14" />
                  {/* Animated stroke-draw ring */}
                  <motion.circle
                    cx="48" cy="48" r="44"
                    stroke={`url(#hiw-g-${i})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    custom={i}
                    variants={ringVariant}
                  />
                </svg>

                {/* Icon bounces in via spring */}
                <motion.div className="hiw-icon-inner" custom={i} variants={iconVariant}>
                  <Icon size={36} strokeWidth={1.4} color={color} />
                </motion.div>

                {/* Continuous pulsing glow dot */}
                <motion.div
                  className="hiw-pulse"
                  style={{ background: color }}
                  animate={{ scale: [1, 1.65, 1], opacity: [0.65, 0, 0.65] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.6, ease: 'easeInOut' }}
                />
              </div>

              {/* Step content animates after icon */}
              <motion.div custom={i} variants={textVariant}>
                <div className="hiw-step-num" style={{ color }}>{num}</div>
                <h3 className="hiw-step-title">{title}</h3>
                <p className="hiw-step-sub">{sub}</p>
              </motion.div>

              {/* RTL-correct connector: arrow points LEFT (→ toward next step in RTL layout) */}
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
