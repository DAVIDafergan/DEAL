import { useEffect, useMemo, useRef, useState } from 'react';
import { NowProvider } from './context/NowContext.jsx';
import { propertyApi } from './api/client.js';
import { HeroSearch } from './components/HeroSearch.jsx';
import { RegionPicker } from './components/RegionPicker.jsx';
import { CategoryChips } from './components/CategoryChips.jsx';
import { TrustSection } from './components/TrustSection.jsx';
import { PropertyFilterPanel } from './components/PropertyFilterPanel.jsx';
import { PropertyFilterSheet } from './components/PropertyFilterSheet.jsx';
import { PropertyActiveChips } from './components/PropertyActiveChips.jsx';
import { PropertyEmptyState } from './components/PropertyEmptyState.jsx';
import { PropertyGrid } from './components/PropertyGrid.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { RecentSearches } from './components/RecentSearches.jsx';
import { usePropertyFilters } from './hooks/usePropertyFilters.js';
import { saveRecentSearch, listRecentSearches } from './utils/recentSearches.js';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

export function App() {
  const resultsRef = useRef(null);
  const { filters, setFilter, toggleAmenity, clearAll, activeCount, apiFilters, hasActiveFilters } = usePropertyFilters();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const RESULTS_PAGE_SIZE = 12;
  const [resultsLimit, setResultsLimit] = useState(RESULTS_PAGE_SIZE);
  const [recentSearches, setRecentSearches] = useState(() => listRecentSearches());

  // Any real filter change resets pagination back to page 1 — only "load more" grows the limit.
  useEffect(() => {
    setResultsLimit(RESULTS_PAGE_SIZE);
  }, [apiFilters]);

  useEffect(() => {
    const isLoadMore = resultsLimit > RESULTS_PAGE_SIZE;
    if (isLoadMore) setIsLoadingMore(true); else setIsLoading(true);
    propertyApi.search({ ...apiFilters, limit: resultsLimit })
      .then(({ properties: p }) => setProperties(p || []))
      .catch(() => setProperties([]))
      .finally(() => { setIsLoading(false); setIsLoadingMore(false); });
  }, [apiFilters, resultsLimit]);

  // 9.6: record a search once it's resolved with at least one filter set — avoids logging every
  // keystroke, only "searches the visitor actually ran".
  useEffect(() => {
    if (!hasActiveFilters || isLoading) return;
    saveRecentSearch(filters);
    setRecentSearches(listRecentSearches());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFilters, isLoading]);

  function handlePickRecentSearch(s) {
    setFilter({ region: s.region || '', city: s.city || '', checkIn: s.checkIn || '', checkOut: s.checkOut || '', guests: s.guests || '' });
    scrollToResults();
  }

  const canLoadMore = !isLoading && properties.length === resultsLimit && resultsLimit < 100;

  const propertiesByRegion = useMemo(() => {
    const counts = {};
    for (const p of properties) counts[p.region] = (counts[p.region] || 0) + 1;
    return counts;
  }, [properties]);

  function scrollToResults() {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSelectRegion(regionValue) {
    setFilter({ region: filters.region === regionValue ? '' : regionValue });
    scrollToResults();
  }

  return (
    <NowProvider>
      <main id="main-content" aria-label="תוכן ראשי">
        {/* ── 1. Hero — what the site does + centered search box ── */}
        <section className="home-hero" dir="rtl">
          <div className="home-hero__inner container">
            <motion.h1
              className="home-hero__title"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              צימרים ווילות בישראל — ישירות מבעלי הנכס
            </motion.h1>
            <motion.p
              className="home-hero__sub"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              בלי עמלות, בלי מתווכים — פנייה ישירה לבעלים, מחיר שקוף מהרגע הראשון
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroSearch filters={filters} setFilter={setFilter} onSearch={scrollToResults} />
            </motion.div>
            <RecentSearches searches={recentSearches} onPick={handlePickRecentSearch} />
          </div>
        </section>

        {/* ── 2. Regions ── */}
        <section className="region-picker-section container">
          <h2 className="home-section-title">חפשו לפי אזור</h2>
          <RegionPicker propertiesByRegion={propertiesByRegion} onSelectRegion={handleSelectRegion} activeRegion={filters.region} />
        </section>

        {/* ── 3. Quick categories ── */}
        <section className="category-chips-section container">
          <h2 className="home-section-title">קטגוריות מהירות</h2>
          <CategoryChips setFilter={setFilter} onPick={scrollToResults} />
        </section>

        {/* ── 4. Results / featured properties + staged filters (7.2) ── */}
        <section className="agent-deals-section container" ref={resultsRef}>
          <div className="agent-deals-section__head">
            <div>
              <h2 className="agent-deals-section__title">
                {hasActiveFilters ? 'תוצאות החיפוש שלך' : 'נכסים מומלצים'}
              </h2>
              <p className="agent-deals-section__subtitle">
                נכסים ישירות מבעלים — חלקם מאומתים, חלקם עדיין ממתינים לאימות הבעלים
              </p>
            </div>
            <label className="sort-select">
              <span className="sort-select__label">מיון</span>
              <select className="sort-select__input" value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
                <option value="recommended">מומלצים</option>
                <option value="price_asc">מחיר: מהזול ליקר</option>
                <option value="price_desc">מחיר: מהיקר לזול</option>
                <option value="new">חדשים באתר</option>
              </select>
            </label>
          </div>

          <div className="property-search-layout">
            <aside className="pfp--aside">
              <PropertyFilterPanel filters={filters} setFilter={setFilter} toggleAmenity={toggleAmenity} resultCount={properties.length} isLoading={isLoading} />
            </aside>

            <div>
              <PropertyFilterSheet
                filters={filters}
                setFilter={setFilter}
                toggleAmenity={toggleAmenity}
                activeCount={activeCount}
                resultCount={properties.length}
                isLoading={isLoading}
              />

              <PropertyActiveChips filters={filters} setFilter={setFilter} toggleAmenity={toggleAmenity} onClearAll={clearAll} />

              {!isLoading && properties.length === 0 ? (
                <PropertyEmptyState filters={filters} setFilter={setFilter} toggleAmenity={toggleAmenity} onClearAll={clearAll} hasActiveFilters={hasActiveFilters} />
              ) : (
                <>
                  <PropertyGrid properties={properties} isLoading={isLoading} hasActiveFilters={hasActiveFilters} />
                  {canLoadMore && (
                    <button
                      type="button"
                      className="load-more-btn"
                      onClick={() => setResultsLimit((n) => n + RESULTS_PAGE_SIZE)}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? 'טוען…' : 'טען עוד נכסים'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── 5. Why us ── */}
        <TrustSection />

        {/* ── 6. Owner CTA strip ── */}
        <section className="agent-cta-strip" dir="rtl">
          <div className="agent-cta-strip__inner container">
            <div className="agent-cta-strip__text">
              <span className="agent-cta-strip__eyebrow">בעל צימר או וילה?</span>
              <strong className="agent-cta-strip__heading">יש לך צימר? פרסם אותו בחינם</strong>
              <p className="agent-cta-strip__sub">ללא עמלות · ישירות ללקוח · תוך דקות</p>
            </div>
            <Link to="/register" className="agent-cta-strip__btn">
              <UserPlus size={16} />
              הצטרף בחינם
            </Link>
          </div>
        </section>

        {/* ── 7. Rich footer ── */}
        <SiteFooter />
      </main>
    </NowProvider>
  );
}
