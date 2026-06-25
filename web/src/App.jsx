import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from './context/LanguageContext.jsx';
import { NowProvider } from './context/NowContext.jsx';
import { agentApi } from './api/client.js';
import { TopValueDeals } from './components/TopValueDeals.jsx';
import { HowItWorks } from './components/HowItWorks.jsx';
import { AgentDealCard } from './components/agent/AgentDealCard.jsx';
import { ReelsStrip } from './components/ReelsStrip.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { motion } from 'framer-motion';
import { Briefcase, SlidersHorizontal, X } from 'lucide-react';

const gridVariants = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const cardIn = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function App() {
  const { t } = useLanguage();
  const [agentDeals, setAgentDeals] = useState([]);

  // Filter state
  const [filterDest, setFilterDest] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMaxPrice, setFilterMaxPrice] = useState('');
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'

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

  return (
    <NowProvider>
      {/* Animated explainer: agents → system → best deal */}
      <HowItWorks />

      {/* Top 5 most valuable deals — hero section */}
      <TopValueDeals hero />

      {/* Reels preview strip */}
      <ReelsStrip deals={agentDeals} />

      {/* Agent deals grid */}
      {agentDeals.length > 0 && (
        <section className="agent-deals-section container">
          <h2 className="agent-deals-section__title">
            <Briefcase size={20} color="var(--color-accent-from)" />
            {t.agentDealsSectionTitle || 'דילים מסוכנים'}
          </h2>
          <p className="agent-deals-section__subtitle">
            {t.agentDealsSectionSubtitle || 'עסקאות ייחודיות ישירות מסוכנים מאומתים — לחץ לפרטים מלאים'}
          </p>

          {/* Filter bar */}
          <div className="deals-filter-bar" dir="rtl">
            <span className="deals-filter-bar__icon"><SlidersHorizontal size={15} /></span>
            <input
              className="deals-filter-input"
              placeholder="יעד…"
              value={filterDest}
              onChange={e => setFilterDest(e.target.value)}
            />
            <input
              className="deals-filter-input deals-filter-input--date"
              type="date"
              value={filterDate}
              onChange={e => setFilterDate(e.target.value)}
            />
            <input
              className="deals-filter-input deals-filter-input--price"
              type="number"
              min="0"
              placeholder="מחיר מקסימלי"
              value={filterMaxPrice}
              onChange={e => setFilterMaxPrice(e.target.value)}
            />
            <select
              className="deals-filter-select"
              value={sortDir}
              onChange={e => setSortDir(e.target.value)}
            >
              <option value="asc">מחיר: נמוך לגבוה</option>
              <option value="desc">מחיר: גבוה לנמוך</option>
            </select>
            {hasFilter && (
              <button className="deals-filter-clear" onClick={clearFilters} aria-label="נקה סינון">
                <X size={14} />
              </button>
            )}
          </div>

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
