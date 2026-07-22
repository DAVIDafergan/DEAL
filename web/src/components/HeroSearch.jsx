import { useMemo, useRef, useState } from 'react';
import { Search, MapPin, Users, Sparkles, Waves, UtensilsCrossed, Baby } from 'lucide-react';
import { REGIONS, regionLabel } from '../data/propertyOptions.js';
import { ALL_TOWNS, regionForTown } from '../data/israeliTowns.js';
import { HeroDateRangeField } from './HeroDateRangeField.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const POPULAR_REGIONS = ['north', 'galilee', 'golan', 'jerusalem'];
const POPULAR_CATEGORIES = [
  { key: 'jacuzzi', labelKey: 'categoryJacuzzi', icon: Sparkles, apply: (setFilter) => setFilter({ amenities: ['has_private_jacuzzi'] }) },
  { key: 'pool', labelKey: 'categoryPool', icon: Waves, apply: (setFilter) => setFilter({ amenities: ['has_private_pool'] }) },
  { key: 'kosher', labelKey: 'categoryKosher', icon: UtensilsCrossed, apply: (setFilter) => setFilter({ kosherLevel: 'kosher' }) },
  { key: 'family', labelKey: 'categoryFamilies', icon: Baby, apply: (setFilter) => setFilter({ amenities: ['is_kid_friendly'] }) },
];

/** WhereField — 11.1: a single combined "region or town" text input with keyboard-navigable
 * autocomplete, instead of a plain region-only <select>. Typing filters both REGIONS (by
 * label) and ALL_TOWNS; picking a town also sets the region behind it (regionForTown) so the
 * two filters — which the results grid already both understands — stay in sync from one field. */
function WhereField({ filters, setFilter, lang, t }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const blurTimeout = useRef(null);

  const displayValue = query || (filters.city || (filters.region ? regionLabel(filters.region, lang) : ''));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const regionMatches = REGIONS
      .map((r) => ({ type: 'region', value: r.value, label: regionLabel(r.value, lang) }))
      .filter((r) => !q || r.label.toLowerCase().includes(q));
    const townMatches = ALL_TOWNS
      .filter((town) => !q || town.toLowerCase().includes(q))
      .slice(0, 8)
      .map((town) => ({ type: 'city', value: town, label: town }));
    return [...regionMatches.slice(0, q ? 6 : 4), ...townMatches];
  }, [query, lang]);

  function pick(match) {
    if (match.type === 'region') {
      setFilter({ region: match.value, city: '' });
    } else {
      setFilter({ region: regionForTown(match.value) || '', city: match.value });
    }
    setQuery('');
    setIsOpen(false);
  }

  function handleKeyDown(e) {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { setIsOpen(true); return; }
    if (!isOpen) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((i) => Math.min(i + 1, matches.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (matches[highlighted]) pick(matches[highlighted]); }
    else if (e.key === 'Escape') { setIsOpen(false); }
  }

  return (
    <div className="hero-search__field hero-search__field--where">
      <label className="hero-search__label" htmlFor="hs-where"><span className="icon-draw icon-draw--once"><MapPin size={12} /></span> {t.heroSearchWhere}</label>
      <input
        id="hs-where"
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls="hs-where-listbox"
        autoComplete="off"
        className="hero-search__input"
        placeholder={t.heroSearchWhereAll}
        value={isOpen ? query : displayValue}
        onFocus={() => { setIsOpen(true); setQuery(''); }}
        onChange={(e) => { setQuery(e.target.value); setHighlighted(0); setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        onBlur={() => { blurTimeout.current = setTimeout(() => setIsOpen(false), 120); }}
      />
      {isOpen && (
        <ul id="hs-where-listbox" role="listbox" className="hero-search__listbox">
          {matches.length === 0 && <li className="hero-search__listbox-empty">{t.heroSearchNoMatches}</li>}
          {matches.map((m, i) => (
            <li
              key={`${m.type}-${m.value}`}
              role="option"
              aria-selected={i === highlighted}
              className={`hero-search__listbox-item${i === highlighted ? ' is-highlighted' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); clearTimeout(blurTimeout.current); pick(m); }}
              onMouseEnter={() => setHighlighted(i)}
            >
              <span className={`hero-search__listbox-badge hero-search__listbox-badge--${m.type}`}>
                {m.type === 'region' ? t.heroSearchWhere : m.label[0]}
              </span>
              {m.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 9.2 hero search box: where / when / guests / search — the four fields Booking/Airbnb both
// lead with. Writes straight into the same URL-backed filter state the results grid reads
// (usePropertyFilters), so submitting is just "scroll to the results that already reflect it".
// 11.1: redesigned — combined region+town autocomplete for "where", a real date *range* for
// "when" (was check-in only), per-field icons, and a quick-shortcut chip row right under the
// box (popular regions + categories) so the highest-intent action doesn't require scrolling.
export function HeroSearch({ filters, setFilter, onSearch }) {
  const { t, lang } = useLanguage();
  return (
    <div className="hero-search-wrap">
      <form
        className="hero-search"
        onSubmit={(e) => {
          e.preventDefault();
          onSearch();
        }}
      >
        <WhereField filters={filters} setFilter={setFilter} lang={lang} t={t} />
        <div className="hero-search__divider" aria-hidden="true" />
        <HeroDateRangeField checkIn={filters.checkIn} checkOut={filters.checkOut} onChange={setFilter} />
        <div className="hero-search__divider" aria-hidden="true" />
        <div className="hero-search__field">
          <label className="hero-search__label" htmlFor="hs-guests"><span className="icon-draw icon-draw--once"><Users size={12} /></span> {t.heroSearchGuests}</label>
          <input
            id="hs-guests"
            type="number"
            min="1"
            placeholder={t.heroSearchGuestsPlaceholder}
            className="hero-search__input"
            value={filters.guests}
            onChange={(e) => setFilter({ guests: e.target.value })}
          />
        </div>
        <button type="submit" className="hero-search__submit">
          <span className="icon-draw icon-draw--once"><Search size={18} /></span>
          <span>{t.heroSearchSubmit}</span>
        </button>
      </form>

      <div className="hero-search__quick-row">
        <span className="hero-search__quick-label">{t.heroSearchPopularLabel}</span>
        {POPULAR_REGIONS.map((r) => (
          <button key={r} type="button" className="hero-search__quick-chip" onClick={() => { setFilter({ region: r, city: '' }); onSearch(); }}>
            {regionLabel(r, lang)}
          </button>
        ))}
        <span className="hero-search__quick-divider" aria-hidden="true" />
        {POPULAR_CATEGORIES.map(({ key, labelKey, icon: Icon, apply }) => (
          <button key={key} type="button" className="hero-search__quick-chip" onClick={() => { apply(setFilter); onSearch(); }}>
            <span className="icon-draw icon-draw--once"><Icon size={13} strokeWidth={1.8} /></span> {t[labelKey]}
          </button>
        ))}
      </div>
    </div>
  );
}
