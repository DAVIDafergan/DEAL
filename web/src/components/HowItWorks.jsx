import { motion } from 'framer-motion';
import { Upload, Sparkles, Award } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    title: 'סוכנים מעלים דילים',
    sub: 'כל יום מוסיפים סוכני הנסיעות הטובים בישראל עסקאות ייחודיות',
  },
  {
    icon: Sparkles,
    title: 'המערכת מדרגת ומסננת',
    sub: 'אלגוריתם חכם בוחר רק את הדילים הטובים ביותר ומאמת אותם',
  },
  {
    icon: Award,
    title: 'אתה מקבל רק את הטוב ביותר',
    sub: 'עסקאות מדהימות מסוכנים מאומתים — ישירות אליך',
  },
];

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.2 } },
};

const stepVariant = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export function HowItWorks() {
  return (
    <section className="how-it-works container">
      <motion.div
        className="how-it-works__grid"
        variants={container}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-40px' }}
      >
        {steps.map(({ icon: Icon, title, sub }, i) => (
          <motion.div key={i} className="how-it-works__step" variants={stepVariant}>
            <div className="how-it-works__icon-wrap">
              <svg className="how-it-works__ring" viewBox="0 0 68 68" fill="none">
                <defs>
                  <linearGradient id={`hiw-grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-accent-from)" />
                    <stop offset="100%" stopColor="#17c3b2" />
                  </linearGradient>
                </defs>
                <motion.circle
                  cx="34"
                  cy="34"
                  r="32"
                  stroke={`url(#hiw-grad-${i})`}
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.22, ease: 'easeOut' }}
                />
              </svg>
              <div className="how-it-works__icon-inner">
                <Icon size={26} strokeWidth={1.5} />
              </div>
            </div>
            <div className="how-it-works__body">
              <h3 className="how-it-works__title">{title}</h3>
              <p className="how-it-works__sub">{sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
