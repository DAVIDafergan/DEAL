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
import { PropertyErrorState } from './components/PropertyErrorState.jsx';
import { PropertyGrid } from './components/PropertyGrid.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { RecentSearches } from './components/RecentSearches.jsx';
import { RecentlyViewedStrip } from './components/RecentlyViewedStrip.jsx';
import { usePropertyFilters } from './hooks/usePropertyFilters.js';
import { saveRecentSearch, listRecentSearches } from './utils/recentSearches.js';
import { listRecentlyViewed } from './utils/recentlyViewed.js';
import { motion } from 'framer-motion';
import { Link, useLocalizedNavigate } from './components/LocalizedLink.jsx';
import { UserPlus, Shuffle } from 'lucide-react';
import { useLanguage } from './context/LanguageContext.jsx';

export function App() {
  const { t, dir } = useLanguage();
  const resultsRef = useRef(null);
  const { filters, setFilter, toggleAmenity, clearAll, activeCount, apiFilters, hasActiveFilters } = usePropertyFilters();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);
  const RESULTS_PAGE_SIZE = 12;
  const [resultsLimit, setResultsLimit] = useState(RESULTS_PAGE_SIZE);
  const [recentSearches, setRecentSearches] = useState(() => listRecentSearches());
  const [retryTick, setRetryTick] = useState(0);
  const [recentlyViewedIds] = useState(() => listRecentlyViewed());
  const navigate = useLocalizedNavigate();

  // 10.8: "surprise me" — a random pick from whatever's currently showing (respects active
  // filters if any are set, otherwise a random published property).
  async function handleSurpriseMe() {
    try {
      const { properties: pool } = await propertyApi.search({ ...apiFilters, limit: 40 });
      if (!pool || pool.length === 0) return;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      navigate(`/property/${pick.id}`);
    } catch { /* no-op — this is a fun extra, not a critical path */ }
  }

  // Any real filter change resets pagination back to page 1 — only "load more" grows the limit.
  useEffect(() => {
    setResultsLimit(RESULTS_PAGE_SIZE);
  }, [apiFilters]);

  // 10.3: a fetch failure used to just set properties=[] — visually identical to a genuine
  // "no results" empty state. Now tracked separately so a real error gets PropertyErrorState
  // (with a retry button) instead of silently looking like nothing matched the filters.
  useEffect(() => {
    const isLoadMore = resultsLimit > RESULTS_PAGE_SIZE;
    if (isLoadMore) setIsLoadingMore(true); else setIsLoading(true);
    setHasError(false);
    propertyApi.search({ ...apiFilters, limit: resultsLimit })
      .then(({ properties: p }) => setProperties(p || []))
      .catch(() => { setProperties([]); setHasError(true); })
      .finally(() => { setIsLoading(false); setIsLoadingMore(false); });
  }, [apiFilters, resultsLimit, retryTick]);

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
      <main id="main-content" aria-label={t.mainContentLabel}>
        {/* ── 1. Hero — what the site does + centered search box ── */}
        <section className="home-hero" dir={dir}>
          <div className="home-hero__inner container">
            <motion.h1
              className="home-hero__title"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            >
              {t.heroCabinTitle}
            </motion.h1>
            <motion.p
              className="home-hero__sub"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              {t.heroCabinSub}
            </motion.p>
            <motion.div
              className="home-hero__search-motion"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <HeroSearch filters={filters} setFilter={setFilter} onSearch={scrollToResults} />
            </motion.div>
            <RecentSearches searches={recentSearches} onPick={handlePickRecentSearch} />
            <button type="button" className="surprise-me-btn" onClick={handleSurpriseMe}>
              <Shuffle size={14} /> {t.surpriseMeButton}
            </button>
          </div>
        </section>

        <RecentlyViewedStrip propertyIds={recentlyViewedIds} />

        {/* ── 2. Regions ── */}
        <section className="region-picker-section container">
          <h2 className="home-section-title">{t.regionsSectionTitle}</h2>
          <RegionPicker propertiesByRegion={propertiesByRegion} onSelectRegion={handleSelectRegion} activeRegion={filters.region} />
        </section>

        {/* ── 3. Quick categories ── */}
        <section className="category-chips-section container">
          <h2 className="home-section-title">{t.categoriesSectionTitle}</h2>
          <CategoryChips setFilter={setFilter} onPick={scrollToResults} />
        </section>

        {/* ── 4. Results / featured properties + staged filters (7.2) ── */}
        <section className="agent-deals-section container" ref={resultsRef}>
          <div className="agent-deals-section__head">
            <div>
              <h2 className="agent-deals-section__title">
                {hasActiveFilters ? t.resultsTitleFiltered : t.resultsTitleDefault}
              </h2>
              <p className="agent-deals-section__subtitle">
                {t.resultsSubtitle}
              </p>
            </div>
            <label className="sort-select">
              <span className="sort-select__label">{t.sortLabel}</span>
              <select className="sort-select__input" value={filters.sort} onChange={(e) => setFilter({ sort: e.target.value })}>
                <option value="recommended">{t.sortRecommended}</option>
                <option value="price_asc">{t.sortPriceAsc}</option>
                <option value="price_desc">{t.sortPriceDesc}</option>
                <option value="new">{t.sortNew}</option>
                <option value="rating_desc">{t.reviewsSortRating}</option>
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

              {!isLoading && hasError ? (
                <PropertyErrorState onRetry={() => setRetryTick((n) => n + 1)} />
              ) : !isLoading && properties.length === 0 ? (
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
                      {isLoadingMore ? t.loadingButton : t.loadMoreButton}
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
        <section className="agent-cta-strip" dir={dir}>
          <div className="agent-cta-strip__inner container">
            <div className="agent-cta-strip__text">
              <span className="agent-cta-strip__eyebrow">{t.ownerCtaEyebrow}</span>
              <strong className="agent-cta-strip__heading">{t.ownerCtaHeading}</strong>
              <p className="agent-cta-strip__sub">{t.ownerCtaSub}</p>
            </div>
            <Link to="/register" className="agent-cta-strip__btn">
              <UserPlus size={16} />
              {t.ownerCtaButton}
            </Link>
          </div>
        </section>

        {/* ── 7. Rich footer ── */}
        <SiteFooter />
      </main>
    </NowProvider>
  );
}
