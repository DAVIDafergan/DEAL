import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { regionLabel, propertyTypeLabel, kosherLabel, amenityLabel } from '../data/propertyOptions.js';
import { useLanguage } from '../context/LanguageContext.jsx';

/** Builds the removable chip list for the currently active filters — each chip clears exactly
 * the filter it represents (7.2: "כל בחירה מצטברת מוצגת כצ'יפ הניתן להסרה בלחיצה"). */
export function buildActiveChips(filters, { setFilter, toggleAmenity, t, lang = 'he' }) {
  const chips = [];
  if (filters.region) chips.push({ key: 'region', label: regionLabel(filters.region, lang), onRemove: () => setFilter({ region: '', city: '' }) });
  if (filters.city) chips.push({ key: 'city', label: filters.city, onRemove: () => setFilter({ city: '' }) });
  if (filters.checkIn && filters.checkOut) chips.push({ key: 'dates', label: `${filters.checkIn} → ${filters.checkOut}`, onRemove: () => setFilter({ checkIn: '', checkOut: '' }) });
  if (filters.guests) chips.push({ key: 'guests', label: t ? t.filterGuestsPlus(filters.guests) : `${filters.guests}+`, onRemove: () => setFilter({ guests: '' }) });
  if (filters.bedrooms) chips.push({ key: 'bedrooms', label: t ? t.filterBedroomsPlus(filters.bedrooms) : `${filters.bedrooms}+`, onRemove: () => setFilter({ bedrooms: '' }) });
  if (filters.minPrice || filters.maxPrice) chips.push({ key: 'price', label: `${filters.minPrice || '0'}–${filters.maxPrice || '∞'} ₪`, onRemove: () => setFilter({ minPrice: '', maxPrice: '' }) });
  if (filters.propertyType) chips.push({ key: 'type', label: propertyTypeLabel(filters.propertyType, lang), onRemove: () => setFilter({ propertyType: '' }) });
  if (filters.kosherLevel) chips.push({ key: 'kosher', label: kosherLabel(filters.kosherLevel, lang), onRemove: () => setFilter({ kosherLevel: '' }) });
  for (const a of filters.amenities) {
    chips.push({ key: `am-${a}`, label: amenityLabel(a, lang), onRemove: () => toggleAmenity(a) });
  }
  return chips;
}

export function PropertyActiveChips({ filters, setFilter, toggleAmenity, onClearAll }) {
  const { t, lang } = useLanguage();
  const chips = buildActiveChips(filters, { setFilter, toggleAmenity, t, lang });
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
        {t.filterClearAll}
      </button>
    </div>
  );
}
