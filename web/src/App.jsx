import { useEffect, useState, useMemo, useRef } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { agentApi } from './api/client.js';
import { TopValueDeals } from './components/TopValueDeals.jsx';
import { HowItWorks } from './components/HowItWorks.jsx';
import { AgentDealCard } from './components/agent/AgentDealCard.jsx';
import { ReelsStrip } from './components/ReelsStrip.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Calendar, Banknote, ArrowUpDown, X, ChevronDown, Briefcase, MapPin, UserPlus } from 'lucide-react';

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const cardIn = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function App() {
  const { t } = useLanguage();
  const [agentDeals, setAgentDeals] = useState([]);
  const dealsRef = useRef(null);
  const searchSectionRef = useRef(null);

  const [filterDest, setFilterDest] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => setAgentDeals([]));
  }, []);

  // Listen for header search submissions
  useEffect(() => {
    function onHeaderSearch(e) {
      if (e.detail) setFilterDest(e.detail);
      setTimeout(() => {
        dealsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
    window.addEventListener('header-search-submit', onHeaderSearch);
    return () => window.removeEventListener('header-search-submit', onHeaderSearch);
  }, []);

  // Notify Header when search section leaves viewport
  useEffect(() => {
    const el = searchSectionRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        window.dispatchEvent(new CustomEvent('search-section-visible', { detail: entry.isIntersecting }));
      },
      { threshold: 0.1, rootMargin: '-60px 0px 0px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const filteredDeals = useMemo(() => {
    let result = [...agentDeals];
    if (filterDest.trim()) {
      const q = filterDest.trim().toLowerCase();
      result = result.filter(d =>
        (d.destination_name || '').toLowerCase().includes(q) ||
        (d.destination || '').toLowerCase().includes(q) ||
        (d.country || '').toLowerCase().includes(q)
      );
    }
    if (filterDate) {
      result = result.filter(d => d.departure_date && d.departure_date >= filterDate);
    }
    if (filterMaxPrice && Number(filterMaxPrice) > 0) {
      result = result.filter(d => Number(d.price) <= Number(filterMaxPrice));
    }
    result.sort((a, b) => sortDir === 'asc' ? a.price - b.price : b.price - a.price);
    return result;
  }, [agentDeals, filterDest, filterDate, filterMaxPrice, sortDir]);

  const hasFilter = filterDest || filterDate || filterMaxPrice;

  function clearFilters() {
    setFilterDest('');
    setFilterDate('');
    setFilterMaxPrice('');
    setSortDir('asc');
  }

  function handleSearch() {
    if (dealsRef.current) {
      dealsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <NowProvider>
      <main id="main-content" aria-label="תוכן ראשי">
      <HowItWorks />

      {/* ── Floating pill search — no outer box, fields float on page bg ── */}
      <motion.section
        className="dsh container"
        ref={searchSectionRef}
        dir="rtl"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="dsh__title">חפש את הדיל שלך</h2>
        <p className="dsh__sub">סנן לפי יעד, תאריך ותקציב — רק דילים מאומתים מסוכנים מובילים</p>

        <div className="dsh__row">
          {/* Destination pill */}
          <div className="dsh__pill dsh__pill--dest">
            <MapPin size={16} className="dsh__pill-icon" />
            <input
              className="dsh__pill-input"
              placeholder="לאן בא לך לטוס?"
              value={filterDest}
              onChange={e => setFilterDest(e.target.value)}
            />
          </div>

          {/* Date pill */}
          <div className="dsh__pill dsh__pill--date">
            <Calendar size={16} className="dsh__pill-icon" />
            <input
              className="dsh__pill-input dsh__pill-input--date"
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>

          {/* Budget pill */}
          <div className="dsh__pill dsh__pill--price">
            <Banknote size={16} className="dsh__pill-icon" />
            <input
              className="dsh__pill-input"
              type="number"
              min="0"
              placeholder="תקציב מקסימלי ₪"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
            />
          </div>

          {/* Sort pill */}
          <div className="dsh__pill dsh__pill--sort">
            <ArrowUpDown size={16} className="dsh__pill-icon" />
            <select
              className="dsh__pill-input dsh__pill-input--select"
              value={sortDir}
              onChange={e => setSortDir(e.target.value)}
            >
              <option value="asc">מחיר: נמוך → גבוה</option>
              <option value="desc">מחיר: גבוה → נמוך</option>
            </select>
            <ChevronDown size={13} className="dsh__pill-chevron" />
          </div>

          {/* Search button pill */}
          <motion.button
            className="dsh__pill dsh__pill--btn"
            whileTap={{ scale: 0.96 }}
            onClick={handleSearch}
          >
            <Search size={16} />
            חפש
          </motion.button>

          {/* Clear pill — appears only when filters active */}
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
            <motion.p
              className="dsh__count"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {filteredDeals.length} דילים תואמים
            </motion.p>
          )}
        </AnimatePresence>
      </motion.section>

      <TopValueDeals hero />

      <ReelsStrip deals={agentDeals} />

      {agentDeals.length > 0 && (
        <section className="agent-deals-section container" ref={dealsRef}>
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
            {filteredDeals.length === 0 ? (
              <p className="deals-filter-empty">לא נמצאו דילים התואמים את הסינון</p>
            ) : filteredDeals.map(deal => (
              <motion.div key={deal.id} variants={cardIn} className="agent-deals-carousel__item">
                <AgentDealCard deal={deal} />
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Agent join strip — visible to agents browsing the feed, unobtrusive for travelers */}
      <section className="agent-cta-strip" dir="rtl">
        <div className="agent-cta-strip__inner container">
          <div className="agent-cta-strip__text">
            <span className="agent-cta-strip__eyebrow">סוכן נסיעות?</span>
            <strong className="agent-cta-strip__heading">הצג את הדילים שלך לאלפי מטיילים</strong>
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
