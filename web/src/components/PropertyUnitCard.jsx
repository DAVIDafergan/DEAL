import { motion } from 'framer-motion';
import { Users, BedDouble, Bath } from 'lucide-react';
import { getCurrencySymbol } from '../utils/currency.js';
import { unitAmenityLabel } from '../data/propertyOptions.js';

/**
 * PropertyUnitCard — one bookable unit inside a multi-unit complex (7.3: "רשימת היחידות, כל
 * אחת ככרטיס עם תמונה, שם, קיבולת, חדרים, מתקנים ומחיר, וכפתור הזמן משלה"). Only rendered when
 * a property has more than one active unit — a single-unit complex skips this entirely.
 */
export function PropertyUnitCard({ unit, currency, isSelected, onBook }) {
  const image = unit.images?.[0] || null;
  const amenities = unit.unit_amenities || [];

  return (
    <div className={`puc ${isSelected ? 'puc--selected' : ''}`}>
      <div className="puc__media">
        {image ? <img src={image} alt={unit.name} className="puc__img" loading="lazy" /> : <div className="puc__img-placeholder" />}
      </div>
      <div className="puc__body">
        <h3 className="puc__name">{unit.name}</h3>
        <div className="puc__meta">
          {unit.max_guests && (
            <span className="puc__meta-item"><Users size={13} /> עד {unit.max_guests} אורחים</span>
          )}
          {unit.bedrooms && (
            <span className="puc__meta-item"><BedDouble size={13} /> {unit.bedrooms} חדרי שינה</span>
          )}
          {unit.bathrooms && (
            <span className="puc__meta-item"><Bath size={13} /> {unit.bathrooms} חדרי רחצה</span>
          )}
        </div>
        {amenities.length > 0 && (
          <p className="puc__amenities">{amenities.map(unitAmenityLabel).join(' · ')}</p>
        )}
        {unit.description && <p className="puc__desc">{unit.description}</p>}

        <div className="puc__footer">
          <div className="puc__price-block">
            {unit.base_price_night ? (
              <span className="puc__price">
                {Math.round(unit.base_price_night)} <span className="puc__currency">{getCurrencySymbol(currency)}</span>
              </span>
            ) : (
              <span className="puc__price puc__price--inquire">מחיר לפי פנייה</span>
            )}
            {unit.base_price_night && <span className="puc__pax">ללילה</span>}
          </div>
          <motion.button type="button" className="puc__book-btn" whileTap={{ scale: 0.96 }} onClick={() => onBook(unit)}>
            {isSelected ? 'נבחר ✓' : 'הזמן'}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
