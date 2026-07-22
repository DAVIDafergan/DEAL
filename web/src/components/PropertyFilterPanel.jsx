import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, MapPin, Calendar, Users, Banknote, Sparkles } from 'lucide-react';
import { REGIONS, PROPERTY_TYPES, KOSHER_LEVELS, AMENITIES, regionLabel, propertyTypeLabel, kosherLabel, amenityLabel } from '../data/propertyOptions.js';
import { propertyApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

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
const EMPTY_FACETS = { amenities: {}, kosherLevel: {}, propertyType: {}, region: {} };

export function PropertyFilterPanel({ filters, setFilter, toggleAmenity, resultCount, isLoading }) {
  const { t, lang } = useLanguage();
  const [openSection, setOpenSection] = useState('where');
  const [cities, setCities] = useState([]);
  const [facets, setFacets] = useState(EMPTY_FACETS);

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

  // 9.3: live per-option counts (Booking-style) — refetched whenever any filter changes.
  useEffect(() => {
    let cancelled = false;
    propertyApi.facetCounts({
      region: filters.region || undefined,
      city: filters.city || undefined,
      property_type: filters.propertyType || undefined,
      min_guests: filters.guests || undefined,
      bedrooms: filters.bedrooms || undefined,
      min_price: filters.minPrice || undefined,
      max_price: filters.maxPrice || undefined,
      kosher_level: filters.kosherLevel || undefined,
      amenities: filters.amenities,
      check_in: filters.checkIn && filters.checkOut ? filters.checkIn : undefined,
      check_out: filters.checkIn && filters.checkOut ? filters.checkOut : undefined,
    })
      .then((data) => { if (!cancelled) setFacets(data); })
      .catch(() => { if (!cancelled) setFacets(EMPTY_FACETS); });
    return () => { cancelled = true; };
  }, [filters.region, filters.city, filters.propertyType, filters.guests, filters.bedrooms, filters.minPrice, filters.maxPrice, filters.kosherLevel, filters.checkIn, filters.checkOut, filters.amenities]);

  const whereSummary = [
    filters.region && regionLabel(filters.region, lang),
    filters.city,
  ].filter(Boolean).join(' · ') || t.filterAllRegions;

  const whenSummary = filters.checkIn && filters.checkOut
    ? `${filters.checkIn} → ${filters.checkOut}`
    : t.filterAllDates;

  const howManySummary = [
    filters.guests && t.filterGuestsPlus(filters.guests),
    filters.bedrooms && t.filterBedroomsPlus(filters.bedrooms),
  ].filter(Boolean).join(' · ') || t.filterAllQuantities;

  const budgetSummary = (filters.minPrice || filters.maxPrice)
    ? `${filters.minPrice || '0'}–${filters.maxPrice || '∞'} ₪`
    : t.filterAllBudgets;

  const whatMattersCount = filters.amenities.length + (filters.kosherLevel ? 1 : 0) + (filters.propertyType ? 1 : 0);
  const whatMattersSummary = whatMattersCount > 0 ? t.filterMattersSelected(whatMattersCount) : t.filterMattersAll;

  return (
    <div className="pfp">
      <Section id="where" title={t.filterWhereLabel} icon={<MapPin size={16} />} summary={whereSummary} isOpen={openSection === 'where'} onToggle={toggleSection}>
        <div className="pfp__chip-row">
          {REGIONS.map((r) => (
            <ToggleChip
              key={r.value}
              label={`${regionLabel(r.value, lang)} (${facets.region[r.value] ?? 0})`}
              isActive={filters.region === r.value}
              onClick={() => setFilter({ region: filters.region === r.value ? '' : r.value })}
            />
          ))}
        </div>
        {filters.region && cities.length > 0 && (
          <>
            <p className="pfp__sub-label">{t.filterCityLabel}</p>
            <div className="pfp__chip-row">
              {cities.map(({ city, count }) => (
                <ToggleChip key={city} label={`${city} (${count})`} isActive={filters.city === city} onClick={() => setFilter({ city: filters.city === city ? '' : city })} />
              ))}
            </div>
          </>
        )}
      </Section>

      <Section id="when" title={t.filterWhenLabel} icon={<Calendar size={16} />} summary={whenSummary} isOpen={openSection === 'when'} onToggle={toggleSection}>
        <div className="pfp__field-row">
          <label className="pfp__field">
            <span className="pfp__field-label">{t.filterCheckIn}</span>
            <input type="date" className="agent-form__input" value={filters.checkIn} onChange={(e) => setFilter({ checkIn: e.target.value })} />
          </label>
          <label className="pfp__field">
            <span className="pfp__field-label">{t.filterCheckOut}</span>
            <input type="date" className="agent-form__input" value={filters.checkOut} onChange={(e) => setFilter({ checkOut: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section id="howmany" title={t.filterHowManyLabel} icon={<Users size={16} />} summary={howManySummary} isOpen={openSection === 'howmany'} onToggle={toggleSection}>
        <div className="pfp__field-row">
          <label className="pfp__field">
            <span className="pfp__field-label">{t.filterGuestsCount}</span>
            <input type="number" min="1" className="agent-form__input" value={filters.guests} onChange={(e) => setFilter({ guests: e.target.value })} />
          </label>
          <label className="pfp__field">
            <span className="pfp__field-label">{t.filterBedroomsCount}</span>
            <input type="number" min="1" className="agent-form__input" value={filters.bedrooms} onChange={(e) => setFilter({ bedrooms: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section id="budget" title={t.filterBudgetLabel} icon={<Banknote size={16} />} summary={budgetSummary} isOpen={openSection === 'budget'} onToggle={toggleSection}>
        <div className="pfp__field-row">
          <label className="pfp__field">
            <span className="pfp__field-label">{t.filterPriceFrom}</span>
            <input type="number" min="0" className="agent-form__input" placeholder="0" value={filters.minPrice} onChange={(e) => setFilter({ minPrice: e.target.value })} />
          </label>
          <label className="pfp__field">
            <span className="pfp__field-label">{t.filterPriceTo}</span>
            <input type="number" min="0" className="agent-form__input" placeholder={t.filterUnlimited} value={filters.maxPrice} onChange={(e) => setFilter({ maxPrice: e.target.value })} />
          </label>
        </div>
      </Section>

      <Section id="matters" title={t.filterMattersLabel} icon={<Sparkles size={16} />} summary={whatMattersSummary} isOpen={openSection === 'matters'} onToggle={toggleSection}>
        <p className="pfp__sub-label">{t.filterPropertyType}</p>
        <div className="pfp__chip-row">
          {PROPERTY_TYPES.map((p) => (
            <ToggleChip
              key={p.value}
              label={`${propertyTypeLabel(p.value, lang)} (${facets.propertyType[p.value] ?? 0})`}
              isActive={filters.propertyType === p.value}
              onClick={() => setFilter({ propertyType: filters.propertyType === p.value ? '' : p.value })}
            />
          ))}
        </div>
        <p className="pfp__sub-label">{t.filterAmenities}</p>
        <div className="pfp__chip-row">
          {AMENITIES.map((a) => (
            <ToggleChip
              key={a.value}
              label={`${amenityLabel(a.value, lang)} (${facets.amenities[a.value] ?? 0})`}
              isActive={filters.amenities.includes(a.value)}
              onClick={() => toggleAmenity(a.value)}
            />
          ))}
        </div>
        <p className="pfp__sub-label">{t.filterKosher}</p>
        <div className="pfp__chip-row">
          {KOSHER_LEVELS.filter((k) => k.value !== 'not_applicable').map((k) => (
            <ToggleChip
              key={k.value}
              label={`${kosherLabel(k.value, lang)} (${facets.kosherLevel[k.value] ?? 0})`}
              isActive={filters.kosherLevel === k.value}
              onClick={() => setFilter({ kosherLevel: filters.kosherLevel === k.value ? '' : k.value })}
            />
          ))}
        </div>
      </Section>

      <p className="pfp__result-count">{isLoading ? t.filterCountingResults : t.filterResultsCount(resultCount)}</p>
    </div>
  );
}
