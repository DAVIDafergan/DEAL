import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { fetchDeals, fetchPublicConfig, fetchPopularPackages, agentApi } from './api/client.js';
import { filterDeals } from './utils/filterDeals.js';
import { Header } from './components/Header.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { PackagesStrip } from './components/PackagesStrip.jsx';
import { WorldHeatmap } from './components/heatmap/WorldHeatmap.jsx';
import { TopValueDeals } from './components/TopValueDeals.jsx';
import { RadarSection } from './components/RadarSection.jsx';
import { AgentDealCard } from './components/agent/AgentDealCard.jsx';
import { motion } from 'framer-motion';
import { Briefcase } from 'lucide-react';

const POLL_INTERVAL_MS = 20000;
const POPULAR_PACKAGES_POLL_MS = 5 * 60 * 1000;

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardIn = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export function App() {
  const { lang, t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [sortedDeals, setSortedDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [packageConfig, setPackageConfig] = useState(null);
  const isFirstLoadRef = useRef(true);

  const [audienceFilter, setAudienceFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [budgetFilter, setBudgetFilter] = useState(null);
  const [agentDeals, setAgentDeals] = useState([]);

  const [popularPackages, setPopularPackages] = useState([]);

  useEffect(() => {
    fetchPublicConfig()
      .then(setPackageConfig)
      .catch(() => setPackageConfig(null));
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => setAgentDeals([]));
  }, []);

  useEffect(() => {
    let isMounted = true;
    function loadPackages() {
      fetchPopularPackages()
        .then((res) => { if (isMounted) setPopularPackages(res.packages || []); })
        .catch(() => { if (isMounted) setPopularPackages([]); });
    }
    loadPackages();
    const id = setInterval(loadPackages, POPULAR_PACKAGES_POLL_MS);
    return () => { isMounted = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    let isMounted = true;
    function load() {
      if (isFirstLoadRef.current) setIsLoading(true);
      return Promise.all([fetchDeals(lang), fetchDeals(lang, { sorted: true })])
        .then(([dealsRes, sortedRes]) => {
          if (!isMounted) return;
          setDeals(dealsRes.deals || []);
          setSortedDeals(sortedRes.deals || []);
        })
        .catch(() => {
          if (isMounted && isFirstLoadRef.current) { setDeals([]); setSortedDeals([]); }
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
          isFirstLoadRef.current = false;
        });
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => { isMounted = false; clearInterval(id); };
  }, [lang]);

  const filteredRadarDeals = useMemo(
    () => filterDeals(sortedDeals, { audience: audienceFilter, type: typeFilter, budget: budgetFilter }),
    [sortedDeals, audienceFilter, typeFilter, budgetFilter]
  );

  const cheapestDealId = filteredRadarDeals[0]?.id ?? null;

  function handleClearFilters() {
    setAudienceFilter(null);
    setTypeFilter(null);
    setBudgetFilter(null);
  }

  return (
    <NowProvider>
      <Header />

      {/* Map — live deals power the heatmap visualization */}
      <section className="heatmap-hero">
        <WorldHeatmap deals={deals} isLoading={isLoading} />
      </section>

      {/* Top 5 most valuable deals — big cards, blends live + agent by value_score */}
      <TopValueDeals />

      {/* Popular packages */}
      <PackagesStrip title={t.popularPackagesTitle} packages={popularPackages} />

      {/* Agent deals — verified by travel agents */}
      {agentDeals.length > 0 && (
        <section className="agent-deals-section container">
          <h2 className="agent-deals-section__title">
            <Briefcase size={20} color="var(--color-accent-from)" />
            {t.agentDealsSectionTitle || 'דילים מסוכנים מאומתים'}
          </h2>
          <p className="agent-deals-section__subtitle">
            {t.agentDealsSectionSubtitle || 'עסקאות ייחודיות שסוכני נסיעות מציעים ישירות דרך הפלטפורמה'}
          </p>
          <motion.div
            className="deals-grid"
            variants={gridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
          >
            {agentDeals.map((deal) => (
              <motion.div key={deal.id} variants={cardIn}>
                <AgentDealCard deal={deal} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Radar section — live engine deals, paginated */}
      <section className="filter-section container" style={{ marginBottom: 0 }}>
        <FilterBar
          audience={audienceFilter}
          type={typeFilter}
          budget={budgetFilter}
          source={null}
          onChangeAudience={setAudienceFilter}
          onChangeType={setTypeFilter}
          onChangeBudget={setBudgetFilter}
          onChangeSource={() => {}}
          onClear={handleClearFilters}
        />
      </section>

      <RadarSection
        deals={filteredRadarDeals}
        isLoading={isLoading}
        packageConfig={packageConfig}
        cheapestDealId={cheapestDealId}
      />
    </NowProvider>
  );
}
