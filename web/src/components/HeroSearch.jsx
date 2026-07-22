import { Search } from 'lucide-react';
import { REGIONS, regionLabel } from '../data/propertyOptions.js';
import { useLanguage } from '../context/LanguageContext.jsx';

// 9.2 hero search box: where / when / guests / search — the four fields Booking/Airbnb both
// lead with. Writes straight into the same URL-backed filter state the results grid reads
// (usePropertyFilters), so submitting is just "scroll to the results that already reflect it".
export function HeroSearch({ filters, setFilter, onSearch }) {
  const { t, lang } = useLanguage();
  return (
    <form
      className="hero-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div className="hero-search__field">
        <label className="hero-search__label" htmlFor="hs-region">{t.heroSearchWhere}</label>
        <select id="hs-region" className="hero-search__input" value={filters.region} onChange={(e) => setFilter({ region: e.target.value })}>
          <option value="">{t.heroSearchWhereAll}</option>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{regionLabel(r.value, lang)}</option>)}
        </select>
      </div>
      <div className="hero-search__divider" aria-hidden="true" />
      <div className="hero-search__field">
        <label className="hero-search__label" htmlFor="hs-checkin">{t.heroSearchWhen}</label>
        <input
          id="hs-checkin"
          type="date"
          className="hero-search__input"
          value={filters.checkIn}
          min={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setFilter({ checkIn: e.target.value })}
        />
      </div>
      <div className="hero-search__divider" aria-hidden="true" />
      <div className="hero-search__field">
        <label className="hero-search__label" htmlFor="hs-guests">{t.heroSearchGuests}</label>
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
        <Search size={18} />
        <span>{t.heroSearchSubmit}</span>
      </button>
    </form>
  );
}
