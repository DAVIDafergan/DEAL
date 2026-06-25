import { useEffect, useState, useMemo, useRef } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { agentApi } from './api/client.js';
import { TopValueDeals } from './components/TopValueDeals.jsx';
import { HowItWorks } from './components/HowItWorks.jsx';
import { AgentDealCard } from './components/agent/AgentDealCard.jsx';
import { ReelsStrip } from './components/ReelsStrip.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { motion } from 'framer-motion';
import { Search, Calendar, Banknote, ArrowUpDown, X, ChevronDown, Briefcase } from 'lucide-react';

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const cardIn = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function App() {
  const { t } = useLanguage();
  const [agentDeals, setAgentDeals] = useState([]);
  const dealsRef = useRef(null);

  // Filter state
  const [filterDest, setFilterDest] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => setAgentDeals([]));
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
      {/* Animated explainer: agents → system → best deal */}
      <HowItWorks />

      {/* ── Deal search bar — right below the explainer, page entry point ── */}
      <motion.div
        className="deal-search-hero container"
        dir="rtl"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="deal-search-hero__header">
          <h2 className="deal-search-hero__title">חפש את הדיל שלך</h2>
          <p className="deal-search-hero__sub">סנן לפי יעד, תאריך ותקציב — רק דילים מאומתים מסוכנים מובילים</p>
        </div>

        <div className="deal-search-hero__fields">
          {/* Destination */}
          <div className="dsh-field">
            <label className="dsh-field__label">
              <Search size={13} /> יעד
            </label>
            <input
              className="dsh-field__input"
              placeholder="ברצלונה, דובאי, תאילנד…"
              value={filterDest}
              onChange={e => setFilterDest(e.target.value)}
            />
          </div>

          {/* Date */}
          <div className="dsh-field">
            <label className="dsh-field__label">
              <Calendar size={13} /> תאריך יציאה מ-
            </label>
            <input
              className="dsh-field__input dsh-field__input--date"
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
          </div>

          {/* Max price */}
          <div className="dsh-field">
            <label className="dsh-field__label">
              <Banknote size={13} /> תקציב מקסימלי
            </label>
            <input
              className="dsh-field__input dsh-field__input--price"
              type="number"
              min="0"
              placeholder="לדוגמה: 2000"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
            />
          </div>

          {/* Sort */}
          <div className="dsh-field">
            <label className="dsh-field__label">
              <ArrowUpDown size={13} /> מיון
            </label>
            <div className="dsh-select-wrap">
              <select
                className="dsh-field__input dsh-field__input--select"
                value={sortDir}
                onChange={e => setSortDir(e.target.value)}
              >
                <option value="asc">מחיר: נמוך → גבוה</option>
                <option value="desc">מחיר: גבוה → נמוך</option>
              </select>
              <ChevronDown size={14} className="dsh-select-wrap__chevron" />
            </div>
          </div>
        </div>

        <div className="deal-search-hero__actions">
          <motion.button
            className="dsh-btn dsh-btn--primary"
            whileTap={{ scale: 0.97 }}
            onClick={handleSearch}
          >
            <Search size={16} /> חפש דילים
          </motion.button>
          {hasFilter && (
            <motion.button
              className="dsh-btn dsh-btn--ghost"
              whileTap={{ scale: 0.97 }}
              onClick={clearFilters}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <X size={14} /> נקה
            </motion.button>
          )}
        </div>

        {hasFilter && (
          <motion.p
            className="deal-search-hero__count"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {filteredDeals.length} דילים תואמים
          </motion.p>
        )}
      </motion.div>

      {/* Top 5 most valuable deals — hero section */}
      <TopValueDeals hero />

      {/* Reels preview strip */}
      <ReelsStrip deals={agentDeals} />

      {/* Agent deals grid */}
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

      <SiteFooter />
    </NowProvider>
  );
}
