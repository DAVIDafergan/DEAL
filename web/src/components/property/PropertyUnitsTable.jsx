import { Users, BedDouble } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency.js';
import { unitAmenityLabel } from '../../data/propertyOptions.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

/** PropertyUnitsTable — 9.4 "טבלת יחידות", the Booking-style heart of the property page: one
 * row per bookable unit with photo/name/capacity/rooms/unique amenities/price/book button.
 * A CSS grid "table" (not a literal <table>) so it can collapse into stacked cards on mobile
 * without the usual table-responsiveness fight. */
export function PropertyUnitsTable({ units, currency, selectedUnitId, onSelectUnit, onBook }) {
  const { t, lang } = useLanguage();
  return (
    <div className="ut" role="table" aria-label={t.ppUnitsTitle}>
      <div className="ut__head" role="row">
        <span role="columnheader">{t.utUnitCol}</span>
        <span role="columnheader">{t.utCapacityCol}</span>
        <span role="columnheader">{t.filterAmenities}</span>
        <span role="columnheader">{t.utPriceCol}</span>
        <span role="columnheader" aria-hidden="true" />
      </div>

      {units.map((unit) => {
        const isSelected = unit.id === selectedUnitId;
        const amenities = unit.unit_amenities || [];
        const image = unit.images?.[0] || null;
        return (
          <div key={unit.id} className={`ut__row${isSelected ? ' ut__row--selected' : ''}`} role="row">
            <div className="ut__unit" role="cell">
              <div className="ut__unit-media">
                {image ? <img src={image} alt="" loading="lazy" /> : <div className="ut__unit-media-placeholder" />}
              </div>
              <div>
                <div className="ut__unit-name">{unit.name}</div>
                {unit.description && <div className="ut__unit-desc">{unit.description}</div>}
              </div>
            </div>

            <div className="ut__meta" role="cell" data-label={t.utCapacityCol}>
              {unit.max_guests && <span><Users size={13} /> {unit.max_guests}</span>}
              {unit.bedrooms && <span><BedDouble size={13} /> {unit.bedrooms}</span>}
            </div>

            <div className="ut__amenities" role="cell" data-label={t.filterAmenities}>
              {amenities.length > 0 ? amenities.map((a) => unitAmenityLabel(a, lang)).join(' · ') : '—'}
            </div>

            <div className="ut__price" role="cell" data-label={t.utPriceCol}>
              {unit.base_price_night ? (
                <>
                  <strong>{Math.round(unit.base_price_night)} {getCurrencySymbol(currency)}</strong>
                  <span>{t.perNightLabel}</span>
                </>
              ) : (
                <span className="ut__price-inquire">{t.priceOnRequest}</span>
              )}
            </div>

            <div className="ut__action" role="cell">
              <button
                type="button"
                className="ut__book-btn"
                onClick={() => { onSelectUnit(unit.id); onBook(); }}
              >
                {isSelected ? t.utSelected : t.ppBookNow}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
