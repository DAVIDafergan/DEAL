import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { fetchPopularPackages, agentApi } from './api/client.js';
import { Header } from './components/Header.jsx';
import { PackagesStrip } from './components/PackagesStrip.jsx';
import { TopValueDeals } from './components/TopValueDeals.jsx';
import { AgentDealCard } from './components/agent/AgentDealCard.jsx';
import { ReelsStrip } from './components/ReelsStrip.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';

// Feature flags — set to true to re-enable hidden sections
const SHOW_RADAR = false;
const POPULAR_PACKAGES_POLL_MS = 5 * 60 * 1000;

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const cardIn = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function App() {
  const { t } = useLanguage();
  const [agentDeals, setAgentDeals] = useState([]);
  const [popularPackages, setPopularPackages] = useState([]);

  useEffect(() => {
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => setAgentDeals([]));
  }, []);

  useEffect(() => {
    let isMounted = true;
    function loadPackages() {
      fetchPopularPackages()
        .then(res => { if (isMounted) setPopularPackages(res.packages || []); })
        .catch(() => { if (isMounted) setPopularPackages([]); });
    }
    loadPackages();
    const id = setInterval(loadPackages, POPULAR_PACKAGES_POLL_MS);
    return () => { isMounted = false; clearInterval(id); };
  }, []);

  return (
    <NowProvider>
      <Header />

      {/* Top 5 most valuable deals — hero section */}
      <TopValueDeals hero />

      {/* Reels preview strip */}
      <ReelsStrip deals={agentDeals} />

      {/* Popular packages */}
      <PackagesStrip title={t.popularPackagesTitle} packages={popularPackages} />

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
