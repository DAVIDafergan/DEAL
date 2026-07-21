import { Users, BedDouble } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency.js';
import { unitAmenityLabel } from '../../data/propertyOptions.js';

/** PropertyUnitsTable — 9.4 "טבלת יחידות", the Booking-style heart of the property page: one
 * row per bookable unit with photo/name/capacity/rooms/unique amenities/price/book button.
 * A CSS grid "table" (not a literal <table>) so it can collapse into stacked cards on mobile
 * without the usual table-responsiveness fight. */
export function PropertyUnitsTable({ units, currency, selectedUnitId, onSelectUnit, onBook }) {
  return (
    <div className="ut" role="table" aria-label="יחידות במתחם">
      <div className="ut__head" role="row">
        <span role="columnheader">יחידה</span>
        <span role="columnheader">קיבולת</span>
        <span role="columnheader">מתקנים</span>
        <span role="columnheader">מחיר</span>
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

            <div className="ut__meta" role="cell" data-label="קיבולת">
              {unit.max_guests && <span><Users size={13} /> {unit.max_guests}</span>}
              {unit.bedrooms && <span><BedDouble size={13} /> {unit.bedrooms}</span>}
            </div>

            <div className="ut__amenities" role="cell" data-label="מתקנים">
              {amenities.length > 0 ? amenities.map(unitAmenityLabel).join(' · ') : '—'}
            </div>

            <div className="ut__price" role="cell" data-label="מחיר">
              {unit.base_price_night ? (
                <>
                  <strong>{Math.round(unit.base_price_night)} {getCurrencySymbol(currency)}</strong>
                  <span>ללילה</span>
                </>
              ) : (
                <span className="ut__price-inquire">מחיר לפי פנייה</span>
              )}
            </div>

            <div className="ut__action" role="cell">
              <button
                type="button"
                className="ut__book-btn"
                onClick={() => { onSelectUnit(unit.id); onBook(); }}
              >
                {isSelected ? 'נבחר ✓' : 'הזמן'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
