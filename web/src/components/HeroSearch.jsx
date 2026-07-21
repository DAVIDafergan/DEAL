import { Search } from 'lucide-react';
import { REGIONS } from '../data/propertyOptions.js';

// 9.2 hero search box: where / when / guests / search — the four fields Booking/Airbnb both
// lead with. Writes straight into the same URL-backed filter state the results grid reads
// (usePropertyFilters), so submitting is just "scroll to the results that already reflect it".
export function HeroSearch({ filters, setFilter, onSearch }) {
  return (
    <form
      className="hero-search"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
    >
      <div className="hero-search__field">
        <label className="hero-search__label" htmlFor="hs-region">איפה</label>
        <select id="hs-region" className="hero-search__input" value={filters.region} onChange={(e) => setFilter({ region: e.target.value })}>
          <option value="">כל האזורים</option>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div className="hero-search__divider" aria-hidden="true" />
      <div className="hero-search__field">
        <label className="hero-search__label" htmlFor="hs-checkin">מתי</label>
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
        <label className="hero-search__label" htmlFor="hs-guests">כמה אורחים</label>
        <input
          id="hs-guests"
          type="number"
          min="1"
          placeholder="כמות"
          className="hero-search__input"
          value={filters.guests}
          onChange={(e) => setFilter({ guests: e.target.value })}
        />
      </div>
      <button type="submit" className="hero-search__submit">
        <Search size={18} />
        <span>חיפוש</span>
      </button>
    </form>
  );
}
