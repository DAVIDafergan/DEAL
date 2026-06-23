import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { fetchDeals, fetchPublicConfig, fetchPopularPackages } from './api/client.js';
import { filterDeals } from './utils/filterDeals.js';
import { Header } from './components/Header.jsx';
import { DealsGrid } from './components/DealsGrid.jsx';
import { FilterBar } from './components/FilterBar.jsx';
import { PackagesStrip } from './components/PackagesStrip.jsx';
import { WorldHeatmap } from './components/heatmap/WorldHeatmap.jsx';
import { LiveDealsCounter } from './components/heatmap/LiveDealsCounter.jsx';
import { DealsFeedSidebar } from './components/heatmap/DealsFeedSidebar.jsx';
import { LastRefreshedLabel } from './components/LastRefreshedLabel.jsx';

const POLL_INTERVAL_MS = 20000; // רענון תקופתי כדי שהמפה תרגיש "חיה" ולא תצלום קפוא
const POPULAR_PACKAGES_POLL_MS = 5 * 60 * 1000; // המנוע ברקע מרענן כל 30 דק' — מספיק לבדוק כל 5

/**
 * App — תוכן טאב "טיסות" (heatmap+רשת+פילטרים). השאלון עבר לטאב "חופשה מושלמת" משלו
 * (PlanTab.jsx) — לא חלק מהקובץ הזה יותר. אין כאן סטטיסטיקות פנימיות (כמה נסרק/נשלח) —
 * הכל בעמוד מכוון ללחיצה, לא ל"דוח" על המערכת.
 */
export function App() {
  const { lang, t } = useLanguage();
  const [deals, setDeals] = useState([]); // סדר ברירת מחדל (עדכני ביותר ראשון) — למפה/פיד
  const [sortedDeals, setSortedDeals] = useState([]); // מחיר עולה — לרשת הכרטיסים למטה
  const [isLoading, setIsLoading] = useState(true);
  const [packageConfig, setPackageConfig] = useState(null);
  const isFirstLoadRef = useRef(true);

  const [audienceFilter, setAudienceFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [budgetFilter, setBudgetFilter] = useState(null);

  const [popularPackages, setPopularPackages] = useState([]);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null);

  useEffect(() => {
    fetchPublicConfig()
      .then(setPackageConfig)
      .catch(() => setPackageConfig(null));
  }, []);

  useEffect(() => {
    let isMounted = true;

    function loadPackages() {
      fetchPopularPackages()
        .then((res) => {
          if (isMounted) setPopularPackages(res.packages || []);
        })
        .catch(() => {
          if (isMounted) setPopularPackages([]);
        });
    }

    loadPackages();
    const intervalId = setInterval(loadPackages, POPULAR_PACKAGES_POLL_MS);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    function load() {
      if (isFirstLoadRef.current) setIsLoading(true);

      // שתי שאילתות במקביל: סדר ברירת מחדל (עדכני-ביותר, למפה/פיד) ו-sorted=true (מחיר עולה,
      // לרשת הכרטיסים) — שתיהן מול ה-DB שלנו בלבד, לא קריאה חיצונית נוספת, אז זה זול.
      return Promise.all([fetchDeals(lang), fetchDeals(lang, { sorted: true })])
        .then(([dealsRes, sortedRes]) => {
          if (!isMounted) return;
          setDeals(dealsRes.deals || []);
          setSortedDeals(sortedRes.deals || []);
          setLastRefreshedAt(Date.now());
        })
        .catch(() => {
          if (isMounted && isFirstLoadRef.current) {
            setDeals([]);
            setSortedDeals([]);
          }
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

  // הסינון לא משנה את הסדר (Array.filter שומר על הסדר היחסי), אז sortedDeals שעבר סינון
  // נשאר ממוין לפי מחיר עולה — הזול ביותר תמיד ראשון, גם אחרי סינון.
  const filteredDeals = useMemo(
    () => filterDeals(sortedDeals, { audience: audienceFilter, type: typeFilter, budget: budgetFilter }),
    [sortedDeals, audienceFilter, typeFilter, budgetFilter]
  );

  const cheapestDealId = filteredDeals[0]?.id ?? null;

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

      <PackagesStrip title={t.popularPackagesTitle} packages={popularPackages} />

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
          <LastRefreshedLabel lastRefreshedAt={lastRefreshedAt} />
        </section>

        <DealsGrid
          deals={filteredDeals}
          isLoading={isLoading}
          hasActiveFilters={Boolean(audienceFilter || typeFilter || budgetFilter)}
          packageConfig={packageConfig}
          cheapestDealId={cheapestDealId}
        />
      </main>
    </NowProvider>
  );
}
