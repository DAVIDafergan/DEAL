import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { fetchDeals, fetchStats } from './api/client.js';
import { Header } from './components/Header.jsx';
import { StatsBar } from './components/StatsBar.jsx';
import { DealsGrid } from './components/DealsGrid.jsx';
import { WorldHeatmap } from './components/heatmap/WorldHeatmap.jsx';
import { LiveDealsCounter } from './components/heatmap/LiveDealsCounter.jsx';
import { DealsFeedSidebar } from './components/heatmap/DealsFeedSidebar.jsx';

const POLL_INTERVAL_MS = 20000; // רענון תקופתי כדי שהמפה תרגיש "חיה" ולא תצלום קפוא

export function App() {
  const { lang, t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    let isMounted = true;

    function load() {
      if (isFirstLoadRef.current) setIsLoading(true);

      return Promise.all([fetchDeals(lang), fetchStats()])
        .then(([dealsRes, statsRes]) => {
          if (!isMounted) return;
          setDeals(dealsRes.deals || []);
          setStats(statsRes);
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

      <main className="container">
        <section className="page-hero">
          <h1>{t.heroTitle}</h1>
          <p>{t.heroSubtitle}</p>
        </section>

        <StatsBar stats={stats} />
        <DealsGrid deals={deals} isLoading={isLoading} />
      </main>
    </NowProvider>
  );
}
