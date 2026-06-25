import { motion } from 'framer-motion';
import { Upload, Sparkles, Trophy } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    num: '01',
    title: 'סוכנים מעלים דילים',
    sub: 'סוכני הנסיעות הטובים בישראל מעלים עסקאות ייחודיות כל יום — ישירות מהשדה',
    color: 'var(--color-accent-from)',
    glow: 'rgba(37,99,235,0.18)',
  },
  {
    icon: Sparkles,
    num: '02',
    title: 'המערכת מדרגת ומסננת',
    sub: 'אלגוריתם חכם בוחר רק את הדילים הכי טובים, מאמת אותם ומוודא שהם אמיתיים',
    color: '#17c3b2',
    glow: 'rgba(23,195,178,0.18)',
  },
  {
    icon: Trophy,
    num: '03',
    title: 'אתה מקבל רק את הטוב ביותר',
    sub: 'עסקאות מדהימות מסוכנים מאומתים — ישירות אליך, בלי רעש',
    color: '#f5a623',
    glow: 'rgba(245,166,35,0.18)',
  },
];

const stepVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.22, ease: [0.22, 1, 0.36, 1] },
  }),
};

const ringVariant = {
  hidden: { pathLength: 0 },
  visible: (i) => ({
    pathLength: 1,
    transition: { duration: 1.1, delay: i * 0.22 + 0.1, ease: 'easeOut' },
  }),
};

const iconVariant = {
  rest: { scale: 1, rotate: 0 },
  hover: { scale: 1.12, rotate: [0, -8, 8, 0], transition: { duration: 0.4 } },
};

export function HowItWorks() {
  return (
    <section className="hiw-section">
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
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.06 }}
        >
          הדרך הכי חכמה למצוא דיל
        </motion.h2>

        <div className="hiw-grid">
          {steps.map(({ icon: Icon, num, title, sub, color, glow }, i) => (
            <motion.div
              key={i}
              className="hiw-step"
              custom={i}
              variants={stepVariant}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-30px' }}
              whileHover="hover"
            >
              {/* Animated ring + icon */}
              <div className="hiw-icon-wrap" style={{ '--hiw-glow': glow }}>
                <svg className="hiw-ring" viewBox="0 0 96 96" fill="none">
                  <defs>
                    <linearGradient id={`hiw-g-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={color} stopOpacity="0.9" />
                      <stop offset="100%" stopColor={color} stopOpacity="0.35" />
                    </linearGradient>
                  </defs>
                  {/* Background circle */}
                  <circle cx="48" cy="48" r="44" stroke={color} strokeWidth="1" opacity="0.15" />
                  {/* Animated draw circle */}
                  <motion.circle
                    cx="48" cy="48" r="44"
                    stroke={`url(#hiw-g-${i})`}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    custom={i}
                    variants={ringVariant}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                  />
                </svg>

                <motion.div className="hiw-icon-inner" variants={iconVariant}>
                  <Icon size={36} strokeWidth={1.4} color={color} />
                </motion.div>

                {/* Pulsing glow dot */}
                <motion.div
                  className="hiw-pulse"
                  style={{ background: color }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.5 }}
                />
              </div>

              <div className="hiw-step-num" style={{ color }}>{num}</div>
              <h3 className="hiw-step-title">{title}</h3>
              <p className="hiw-step-sub">{sub}</p>

              {/* Connector arrow (not on last item) */}
              {i < steps.length - 1 && (
                <div className="hiw-connector" aria-hidden="true">
                  <motion.svg viewBox="0 0 40 20" fill="none" className="hiw-arrow">
                    <motion.path
                      d="M0 10 L32 10 M26 4 L32 10 L26 16"
                      stroke="var(--color-border)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      whileInView={{ pathLength: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.22 + 0.7 }}
                    />
                  </motion.svg>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
