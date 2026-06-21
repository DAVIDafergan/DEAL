import { useEffect, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { fetchDeals, fetchStats } from './api/client.js';
import { Header } from './components/Header.jsx';
import { StatsBar } from './components/StatsBar.jsx';
import { DealsGrid } from './components/DealsGrid.jsx';

export function App() {
  const { lang, t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([fetchDeals(lang), fetchStats()])
      .then(([dealsRes, statsRes]) => {
        if (!isMounted) return;
        setDeals(dealsRes.deals || []);
        setStats(statsRes);
      })
      .catch(() => {
        if (isMounted) setDeals([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [lang]);

  return (
    <>
      <Header />
      <main className="container">
        <section className="page-hero">
          <h1>{t.heroTitle}</h1>
          <p>{t.heroSubtitle}</p>
        </section>

        <StatsBar stats={stats} />
        <DealsGrid deals={deals} isLoading={isLoading} />
      </main>
    </>
  );
}
