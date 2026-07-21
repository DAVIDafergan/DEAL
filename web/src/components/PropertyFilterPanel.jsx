import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Calendar, Users, Banknote, Sparkles } from 'lucide-react';
import { REGIONS, PROPERTY_TYPES, KOSHER_LEVELS, AMENITIES } from '../data/propertyOptions.js';
import { propertyApi } from '../api/client.js';

function ToggleChip({ label, isActive, onClick }) {
  return (
    <button type="button" className={`filter-pill ${isActive ? 'is-active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

function Section({ id, title, icon, summary, isOpen, onToggle, children }) {
  return (
    <div className="pfp__section">
      <button type="button" className="pfp__section-head" onClick={() => onToggle(id)} aria-expanded={isOpen}>
        <span className="pfp__section-title">
          {icon}
          {title}
        </span>
        <span className="pfp__section-right">
          {!isOpen && summary && <span className="pfp__section-summary">{summary}</span>}
          <ChevronDown size={16} className={`pfp__chevron ${isOpen ? 'pfp__chevron--open' : ''}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="pfp__section-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="pfp__section-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * PropertyFilterPanel — the five staged categories (7.2: איפה / מתי / כמה / תקציב / מה חשוב לך),
 * collapsible on both mobile (inside the bottom sheet) and desktop (inline side panel). Shared so
 * the two surfaces never drift out of sync.
 */
export function PropertyFilterPanel({ filters, setFilter, toggleAmenity, resultCount, isLoading }) {
  const [openSection, setOpenSection] = useState('where');
  const [cities, setCities] = useState([]);

  function toggleSection(id) {
    setOpenSection((cur) => (cur === id ? null : id));
  }

  useEffect(() => {
    if (!filters.region) { setCities([]); return; }
    let cancelled = false;
    propertyApi.cities(filters.region)
      .then(({ cities: list }) => { if (!cancelled) setCities(list || []); })
      .catch(() => { if (!cancelled) setCities([]); });
    return () => { cancelled = true; };
  }, [filters.region]);

  const whereSummary = [
    filters.region && REGIONS.find((r) => r.value === filters.region)?.label,
    filters.city,
  ].filter(Boolean).join(' · ') || 'כל האזורים';

  const whenSummary = filters.checkIn && filters.checkOut
    ? `${filters.checkIn} → ${filters.checkOut}`
    : 'כל התאריכים';

  const howManySummary = [
    filters.guests && `${filters.guests}+ אורחים`,
    filters.bedrooms && `${filters.bedrooms}+ חדרי שינה`,
  ].filter(Boolean).join(' · ') || 'כל הכמויות';

  const budgetSummary = (filters.minPrice || filters.maxPrice)
    ? `${filters.minPrice || '0'}–${filters.maxPrice || '∞'} ₪`
    : 'כל התקציבים';

  const whatMattersCount = filters.amenities.length + (filters.kosherLevel ? 1 : 0) + (filters.propertyType ? 1 : 0);
  const whatMattersSummary = whatMattersCount > 0 ? `${whatMattersCount} נבחרו` : 'הכל';

  return (
    <div className="pfp">
      <Section id="where" title="איפה" icon={<MapPin size={16} />} summary={whereSummary} isOpen={openSection === 'where'} onToggle={toggleSection}>
        <div className="pfp__chip-row">
          {REGIONS.map((r) => (
            <ToggleChip key={r.value} label={r.label} isActive={filters.region === r.value} onClick={() => setFilter({ region: filters.region === r.value ? '' : r.value })} />
          ))}
        </div>
        {filters.region && cities.length > 0 && (
          <>
            <p className="pfp__sub-label">עיר / יישוב</p>
            <div className="pfp__chip-row">
              {cities.map(({ city, count }) => (
                <ToggleChip key={city} label={`${city} (${count})`} isActive={filters.city === city} onClick={() => setFilter({ city: filters.city === city ? '' : city })} />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section id="when" title="מתי" icon={<Calendar size={16} />} summary={whenSummary} isOpen={openSection === 'when'} onToggle={toggleSection}>
        <div className="pfp__field-row">
          <label className="pfp__field">
            <span className="pfp__field-label">תאריך כניסה</span>
            <input type="date" className="agent-form__input" value={filters.checkIn} onChange={(e) => setFilter({ checkIn: e.target.value })} />
          </label>
          <label className="pfp__field">
            <span className="pfp__field-label">תאריך יציאה</span>
            <input type="date" className="agent-form__input" value={filters.checkOut} onChange={(e) => setFilter({ checkOut: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section id="howmany" title="כמה" icon={<Users size={16} />} summary={howManySummary} isOpen={openSection === 'howmany'} onToggle={toggleSection}>
        <div className="pfp__field-row">
          <label className="pfp__field">
            <span className="pfp__field-label">מספר אורחים</span>
            <input type="number" min="1" className="agent-form__input" placeholder="כמה אורחים?" value={filters.guests} onChange={(e) => setFilter({ guests: e.target.value })} />
          </label>
          <label className="pfp__field">
            <span className="pfp__field-label">חדרי שינה</span>
            <input type="number" min="1" className="agent-form__input" placeholder="כמה חדרים?" value={filters.bedrooms} onChange={(e) => setFilter({ bedrooms: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section id="budget" title="תקציב" icon={<Banknote size={16} />} summary={budgetSummary} isOpen={openSection === 'budget'} onToggle={toggleSection}>
        <div className="pfp__field-row">
          <label className="pfp__field">
            <span className="pfp__field-label">מ-₪</span>
            <input type="number" min="0" className="agent-form__input" placeholder="0" value={filters.minPrice} onChange={(e) => setFilter({ minPrice: e.target.value })} />
          </label>
          <label className="pfp__field">
            <span className="pfp__field-label">עד ₪</span>
            <input type="number" min="0" className="agent-form__input" placeholder="ללא הגבלה" value={filters.maxPrice} onChange={(e) => setFilter({ maxPrice: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section id="matters" title="מה חשוב לך" icon={<Sparkles size={16} />} summary={whatMattersSummary} isOpen={openSection === 'matters'} onToggle={toggleSection}>
        <p className="pfp__sub-label">סוג נכס</p>
        <div className="pfp__chip-row">
          {PROPERTY_TYPES.map((p) => (
            <ToggleChip key={p.value} label={p.label} isActive={filters.propertyType === p.value} onClick={() => setFilter({ propertyType: filters.propertyType === p.value ? '' : p.value })} />
          ))}
        </div>
        <p className="pfp__sub-label">מתקנים</p>
        <div className="pfp__chip-row">
          {AMENITIES.map((a) => (
            <ToggleChip key={a.value} label={a.label} isActive={filters.amenities.includes(a.value)} onClick={() => toggleAmenity(a.value)} />
          ))}
        </div>
        <p className="pfp__sub-label">כשרות</p>
        <div className="pfp__chip-row">
          {KOSHER_LEVELS.filter((k) => k.value !== 'not_applicable').map((k) => (
            <ToggleChip key={k.value} label={k.label} isActive={filters.kosherLevel === k.value} onClick={() => setFilter({ kosherLevel: filters.kosherLevel === k.value ? '' : k.value })} />
          ))}
        </div>
      </Section>

      <p className="pfp__result-count">{isLoading ? 'סופר תוצאות…' : `${resultCount} נכסים תואמים`}</p>
    </div>
  );
}
