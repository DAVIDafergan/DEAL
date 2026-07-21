import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { regionLabel, propertyTypeLabel, kosherLabel, AMENITIES } from '../data/propertyOptions.js';

function amenityLabel(value) {
  return AMENITIES.find((a) => a.value === value)?.label || value;
}

/** Builds the removable chip list for the currently active filters — each chip clears exactly
 * the filter it represents (7.2: "כל בחירה מצטברת מוצגת כצ'יפ הניתן להסרה בלחיצה"). */
export function buildActiveChips(filters, { setFilter, toggleAmenity }) {
  const chips = [];
  if (filters.region) chips.push({ key: 'region', label: regionLabel(filters.region), onRemove: () => setFilter({ region: '', city: '' }) });
  if (filters.city) chips.push({ key: 'city', label: filters.city, onRemove: () => setFilter({ city: '' }) });
  if (filters.checkIn && filters.checkOut) chips.push({ key: 'dates', label: `${filters.checkIn} → ${filters.checkOut}`, onRemove: () => setFilter({ checkIn: '', checkOut: '' }) });
  if (filters.guests) chips.push({ key: 'guests', label: `${filters.guests}+ אורחים`, onRemove: () => setFilter({ guests: '' }) });
  if (filters.bedrooms) chips.push({ key: 'bedrooms', label: `${filters.bedrooms}+ חדרי שינה`, onRemove: () => setFilter({ bedrooms: '' }) });
  if (filters.minPrice || filters.maxPrice) chips.push({ key: 'price', label: `${filters.minPrice || '0'}–${filters.maxPrice || '∞'} ₪`, onRemove: () => setFilter({ minPrice: '', maxPrice: '' }) });
  if (filters.propertyType) chips.push({ key: 'type', label: propertyTypeLabel(filters.propertyType), onRemove: () => setFilter({ propertyType: '' }) });
  if (filters.kosherLevel) chips.push({ key: 'kosher', label: kosherLabel(filters.kosherLevel), onRemove: () => setFilter({ kosherLevel: '' }) });
  for (const a of filters.amenities) {
    chips.push({ key: `am-${a}`, label: amenityLabel(a), onRemove: () => toggleAmenity(a) });
  }
  return chips;
}

export function PropertyActiveChips({ filters, setFilter, toggleAmenity, onClearAll }) {
  const chips = buildActiveChips(filters, { setFilter, toggleAmenity });
  if (chips.length === 0) return null;

  return (
    <div className="pac">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.button
            key={chip.key}
            type="button"
            className="pac__chip"
            onClick={chip.onRemove}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            layout
          >
            {chip.label}
            <X size={12} />
          </motion.button>
        ))}
      </AnimatePresence>
      <button type="button" className="pac__clear" onClick={onClearAll}>
        נקה הכל
      </button>
    </div>
  );
}
