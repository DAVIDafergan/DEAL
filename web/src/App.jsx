import { useEffect, useState, useMemo, useRef } from 'react';
import { NowProvider } from './context/NowContext.jsx';
import { propertyApi } from './api/client.js';
import { HowItWorks } from './components/HowItWorks.jsx';
import { IsraelMap } from './components/heatmap/IsraelMap.jsx';
import { PropertyFilterBar } from './components/PropertyFilterBar.jsx';
import { PropertyGrid } from './components/PropertyGrid.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { REGIONS } from './data/propertyOptions.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Calendar, Banknote, Users, X, MapPin, UserPlus } from 'lucide-react';

export function App() {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const resultsRef = useRef(null);
  const searchSectionRef = useRef(null);

  // Hero search fields
  const [heroRegion, setHeroRegion] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Filter bar (below results)
  const [propertyType, setPropertyType] = useState(null);
  const [kosherLevel, setKosherLevel] = useState(null);
  const [amenities, setAmenities] = useState([]);

  function toggleAmenity(value) {
    setAmenities((prev) => (prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value]));
  }

  const filters = useMemo(() => ({
    region: heroRegion || undefined,
    property_type: propertyType || undefined,
    min_guests: guests || undefined,
    max_price: maxPrice || undefined,
    kosher_level: kosherLevel || undefined,
    amenities,
    check_in: checkIn || undefined,
    check_out: checkOut || undefined,
  }), [heroRegion, propertyType, guests, maxPrice, kosherLevel, amenities, checkIn, checkOut]);

  useEffect(() => {
    setIsLoading(true);
    propertyApi.search(filters)
      .then(({ properties: p }) => setProperties(p || []))
      .catch(() => setProperties([]))
      .finally(() => setIsLoading(false));
  }, [filters]);

  const propertiesByRegion = useMemo(() => {
    const counts = {};
    for (const p of properties) counts[p.region] = (counts[p.region] || 0) + 1;
    return counts;
  }, [properties]);

  const hasFilter = Boolean(heroRegion || checkIn || guests || maxPrice || propertyType || kosherLevel || amenities.length > 0);

  function clearFilters() {
    setHeroRegion('');
    setCheckIn('');
    setCheckOut('');
    setGuests('');
    setMaxPrice('');
    setPropertyType(null);
    setKosherLevel(null);
    setAmenities([]);
  }

  function handleSearch() {
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleSelectRegionFromMap(regionValue) {
    setHeroRegion(regionValue);
    handleSearch();
  }

  return (
    <NowProvider>
      <main id="main-content" aria-label="תוכן ראשי">
        <HowItWorks />

        {/* ── Floating pill search — same shell as the original flight search hero ── */}
        <motion.section
          className="dsh container"
          ref={searchSectionRef}
          dir="rtl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="dsh__title">חפש את הצימר שלך</h2>
          <p className="dsh__sub">סנן לפי אזור, תאריכים, אורחים ותקציב — רק נכסים אמיתיים בישראל</p>

          <div className="dsh__row">
            <div className="dsh__pill dsh__pill--dest">
              <MapPin size={16} className="dsh__pill-icon" />
              <select
                className="dsh__pill-input dsh__pill-input--select"
                value={heroRegion}
                onChange={(e) => setHeroRegion(e.target.value)}
              >
                <option value="">איזה אזור?</option>
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="dsh__pill dsh__pill--date">
              <Calendar size={16} className="dsh__pill-icon" />
              <input
                className="dsh__pill-input dsh__pill-input--date"
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                aria-label="תאריך כניסה"
              />
            </div>

            <div className="dsh__pill dsh__pill--date">
              <Calendar size={16} className="dsh__pill-icon" />
              <input
                className="dsh__pill-input dsh__pill-input--date"
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                aria-label="תאריך יציאה"
              />
            </div>

            <div className="dsh__pill dsh__pill--price">
              <Users size={16} className="dsh__pill-icon" />
              <input
                className="dsh__pill-input"
                type="number"
                min="1"
                placeholder="כמה אורחים?"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              />
            </div>

            <div className="dsh__pill dsh__pill--price">
              <Banknote size={16} className="dsh__pill-icon" />
              <input
                className="dsh__pill-input"
                type="number"
                min="0"
                placeholder="תקציב מקסימלי ללילה ₪"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>

            <motion.button className="dsh__pill dsh__pill--btn" whileTap={{ scale: 0.96 }} onClick={handleSearch}>
              <Search size={16} />
              חפש
            </motion.button>

            <AnimatePresence>
              {hasFilter && (
                <motion.button
                  className="dsh__pill dsh__pill--clear"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={clearFilters}
                  aria-label="נקה סינון"
                >
                  <X size={15} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {hasFilter && (
              <motion.p className="dsh__count" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {properties.length} נכסים תואמים
              </motion.p>
            )}
          </AnimatePresence>
        </motion.section>

        {/* ── Region map — same .heatmap-hero wrapper WorldHeatmap's CSS was built for ── */}
        <section className="heatmap-hero">
          <IsraelMap propertiesByRegion={propertiesByRegion} onSelectRegion={handleSelectRegionFromMap} />
        </section>

        {/* ── Results ── */}
        <section className="agent-deals-section container" ref={resultsRef}>
          <h2 className="agent-deals-section__title">
            <MapPin size={20} color="var(--color-accent-from)" />
            צימרים ווילות
          </h2>
          <p className="agent-deals-section__subtitle">
            נכסים ישירות מבעלים — חלקם מאומתים, חלקם עדיין ממתינים לאימות הבעלים
          </p>

          <PropertyFilterBar
            region={heroRegion}
            propertyType={propertyType}
            kosherLevel={kosherLevel}
            amenities={amenities}
            onChangeRegion={setHeroRegion}
            onChangePropertyType={setPropertyType}
            onChangeKosherLevel={setKosherLevel}
            onToggleAmenity={toggleAmenity}
            onClear={clearFilters}
          />

          <PropertyGrid properties={properties} isLoading={isLoading} hasActiveFilters={hasFilter} />
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
