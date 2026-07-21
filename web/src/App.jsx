import { useEffect, useMemo, useRef, useState } from 'react';
import { NowProvider } from './context/NowContext.jsx';
import { propertyApi } from './api/client.js';
import { HowItWorks } from './components/HowItWorks.jsx';
import { RegionPicker } from './components/RegionPicker.jsx';
import { PropertyFilterPanel } from './components/PropertyFilterPanel.jsx';
import { PropertyFilterSheet } from './components/PropertyFilterSheet.jsx';
import { PropertyActiveChips } from './components/PropertyActiveChips.jsx';
import { PropertyEmptyState } from './components/PropertyEmptyState.jsx';
import { PropertyGrid } from './components/PropertyGrid.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { usePropertyFilters } from './hooks/usePropertyFilters.js';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin, UserPlus } from 'lucide-react';

export function App() {
  const resultsRef = useRef(null);
  const { filters, setFilter, toggleAmenity, clearAll, activeCount, apiFilters, hasActiveFilters } = usePropertyFilters();
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    propertyApi.search(apiFilters)
      .then(({ properties: p }) => setProperties(p || []))
      .catch(() => setProperties([]))
      .finally(() => setIsLoading(false));
  }, [apiFilters]);

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
        <HowItWorks />

        <motion.section
          className="dsh container"
          dir="rtl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="dsh__title">חפש את הצימר שלך</h2>
          <p className="dsh__sub">בחרו אזור על המפה או פתחו את הסינון — רק נכסים אמיתיים בישראל</p>
        </motion.section>

        {/* ── Region picker — quick region pick, feeds the same filter state as the panel below ── */}
        <section className="region-picker-section container">
          <RegionPicker propertiesByRegion={propertiesByRegion} onSelectRegion={handleSelectRegion} activeRegion={filters.region} />
        </section>

        {/* ── Results + staged filters (7.2) ── */}
        <section className="agent-deals-section container" ref={resultsRef}>
          <h2 className="agent-deals-section__title">
            <MapPin size={20} color="var(--color-accent-from)" />
            צימרים ווילות
          </h2>
          <p className="agent-deals-section__subtitle">
            נכסים ישירות מבעלים — חלקם מאומתים, חלקם עדיין ממתינים לאימות הבעלים
          </p>

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
                <PropertyGrid properties={properties} isLoading={isLoading} hasActiveFilters={hasActiveFilters} />
              )}
            </div>
          </div>
        </section>

        {/* Owner join strip */}
        <section className="agent-cta-strip" dir="rtl">
          <div className="agent-cta-strip__inner container">
            <div className="agent-cta-strip__text">
              <span className="agent-cta-strip__eyebrow">בעל צימר או וילה?</span>
              <strong className="agent-cta-strip__heading">הצג את הנכס שלך לאלפי מטיילים</strong>
              <p className="agent-cta-strip__sub">ללא עמלות · ישירות ללקוח · תוך דקות</p>
            </div>
            <Link to="/register" className="agent-cta-strip__btn">
              <UserPlus size={16} />
              הצטרף בחינם
            </Link>
          </div>
        </section>

        <SiteFooter />
      </main>
    </NowProvider>
  );
}
