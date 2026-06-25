import { useEffect, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { agentApi } from './api/client.js';
import { TopValueDeals } from './components/TopValueDeals.jsx';
import { HowItWorks } from './components/HowItWorks.jsx';
import { AgentDealCard } from './components/agent/AgentDealCard.jsx';
import { ReelsStrip } from './components/ReelsStrip.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const cardIn = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function App() {
  const { t } = useLanguage();
  const [agentDeals, setAgentDeals] = useState([]);

  useEffect(() => {
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => setAgentDeals([]));
  }, []);

  return (
    <NowProvider>
      {/* Animated explainer: agents → system → best deal */}
      <HowItWorks />

      {/* Top 5 most valuable deals — hero section */}
      <TopValueDeals hero />

      {/* Reels preview strip */}
      <ReelsStrip deals={agentDeals} />

      {/* Agent deals grid */}
      {agentDeals.length > 0 && (
        <section className="agent-deals-section container">
          <h2 className="agent-deals-section__title">
            <Briefcase size={20} color="var(--color-accent-from)" />
            {t.agentDealsSectionTitle || 'דילים מסוכנים'}
          </h2>
          <p className="agent-deals-section__subtitle">
            {t.agentDealsSectionSubtitle || 'עסקאות ייחודיות ישירות מסוכנים מאומתים — לחץ לפרטים מלאים'}
          </p>
          <motion.div
            className="agent-deals-carousel"
            variants={gridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            {agentDeals.map(deal => (
              <motion.div key={deal.id} variants={cardIn} className="agent-deals-carousel__item">
                <AgentDealCard deal={deal} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      <SiteFooter />
    </NowProvider>
  );
}
