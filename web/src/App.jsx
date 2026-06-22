import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { fetchDeals, fetchPublicConfig } from './api/client.js';
import { filterDeals } from './utils/filterDeals.js';
import { Header } from './components/Header.jsx';
import { DealsGrid } from './components/DealsGrid.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { WorldHeatmap } from './components/heatmap/WorldHeatmap.jsx';
import { LiveDealsCounter } from './components/heatmap/LiveDealsCounter.jsx';
import { DealsFeedSidebar } from './components/heatmap/DealsFeedSidebar.jsx';

const POLL_INTERVAL_MS = 20000; // רענון תקופתי כדי שהמפה תרגיש "חיה" ולא תצלום קפוא

// אין כאן סטטיסטיקות פנימיות (כמה נסרק/נשלח) — הכל בעמוד מכוון ללחיצה, לא ל"דוח" על המערכת.
export function App() {
  const { lang, t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [packageConfig, setPackageConfig] = useState(null);
  const isFirstLoadRef = useRef(true);

  const [audienceFilter, setAudienceFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [budgetFilter, setBudgetFilter] = useState(null);

  useEffect(() => {
    fetchPublicConfig()
      .then(setPackageConfig)
      .catch(() => setPackageConfig(null));
  }, []);

  useEffect(() => {
    let isMounted = true;

    function load() {
      if (isFirstLoadRef.current) setIsLoading(true);

      return fetchDeals(lang)
        .then((dealsRes) => {
          if (!isMounted) return;
          setDeals(dealsRes.deals || []);
        })
        .catch(() => {
          if (isMounted && isFirstLoadRef.current) setDeals([]);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
          isFirstLoadRef.current = false;
        });
    }

    load();
    const intervalId = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [lang]);

  const filteredDeals = useMemo(
    () => filterDeals(deals, { audience: audienceFilter, type: typeFilter, budget: budgetFilter }),
    [deals, audienceFilter, typeFilter, budgetFilter]
  );

  function handleClearFilters() {
    setAudienceFilter(null);
    setTypeFilter(null);
    setBudgetFilter(null);
  }

  return (
    <NowProvider>
      <Header />

      <section className="heatmap-hero">
        <WorldHeatmap deals={deals} isLoading={isLoading} />

        <div className="heatmap-hero__overlay heatmap-hero__overlay--top">
          <LiveDealsCounter count={deals.length} />
        </div>

        <div className="heatmap-hero__sidebar">
          <DealsFeedSidebar deals={deals} />
        </div>
      </section>

      <section className="filter-section container">
        <FilterBar
          audience={audienceFilter}
          type={typeFilter}
          budget={budgetFilter}
          onChangeAudience={setAudienceFilter}
          onChangeType={setTypeFilter}
          onChangeBudget={setBudgetFilter}
          onClear={handleClearFilters}
        />
      </section>

      <main className="container">
        <section className="page-hero">
          <h1>{t.heroTitle}</h1>
          <p>{t.heroSubtitle}</p>
        </section>

        <DealsGrid
          deals={filteredDeals}
          isLoading={isLoading}
          hasActiveFilters={Boolean(audienceFilter || typeFilter || budgetFilter)}
          packageConfig={packageConfig}
        />
      </main>
    </NowProvider>
  );
}
