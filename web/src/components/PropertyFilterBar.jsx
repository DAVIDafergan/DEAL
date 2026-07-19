import { useState } from 'react';
import { motion } from 'framer-motion';
import { REGIONS, PROPERTY_TYPES, KOSHER_LEVELS, AMENITIES } from '../data/propertyOptions.js';

const TOP_AMENITIES = AMENITIES.filter((a) =>
  ['has_private_jacuzzi', 'has_private_pool', 'has_heated_pool', 'has_view', 'has_parking', 'is_pet_friendly'].includes(a.value)
);

function FilterPill({ label, isActive, onToggle }) {
  const [clickTick, setClickTick] = useState(0);
  function handleClick() {
    setClickTick((c) => c + 1);
    onToggle();
  }
  return (
    <motion.button
      type="button"
      className={`filter-pill ${isActive ? 'is-active' : ''}`}
      whileTap={{ scale: 0.94, y: 2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      onClick={handleClick}
    >
      <motion.span key={clickTick} initial={{ opacity: 0.35 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
        {label}
      </motion.span>
    </motion.button>
  );
}

/**
 * PropertyFilterBar — same shell as FilterBar (region/type/kosher are single-select toggle
 * groups, amenities is multi-select) — reuses .filter-bar / .filter-pill / .filter-row classes.
 */
export function PropertyFilterBar({ region, propertyType, kosherLevel, amenities, onChangeRegion, onChangePropertyType, onChangeKosherLevel, onToggleAmenity, onClear }) {
  const hasActiveFilters = Boolean(region || propertyType || kosherLevel || amenities.length > 0);

  return (
    <div className="filter-bar">
      <div className="filter-row filter-row--unified">
        {REGIONS.map((r) => (
          <FilterPill key={`r-${r.value}`} label={r.label} isActive={region === r.value} onToggle={() => onChangeRegion(region === r.value ? null : r.value)} />
        ))}

        <span className="filter-row__divider" aria-hidden="true" />

        {PROPERTY_TYPES.map((p) => (
          <FilterPill key={`p-${p.value}`} label={p.label} isActive={propertyType === p.value} onToggle={() => onChangePropertyType(propertyType === p.value ? null : p.value)} />
        ))}

        <span className="filter-row__divider" aria-hidden="true" />

        {TOP_AMENITIES.map((a) => (
          <FilterPill key={`a-${a.value}`} label={a.label} isActive={amenities.includes(a.value)} onToggle={() => onToggleAmenity(a.value)} />
        ))}

        <span className="filter-row__divider" aria-hidden="true" />

        {KOSHER_LEVELS.filter((k) => k.value !== 'not_applicable').map((k) => (
          <FilterPill key={`k-${k.value}`} label={k.label} isActive={kosherLevel === k.value} onToggle={() => onChangeKosherLevel(kosherLevel === k.value ? null : k.value)} />
        ))}
      </div>

      {hasActiveFilters && (
        <button type="button" className="filter-clear" onClick={onClear}>
          נקה סינון
        </button>
      )}
    </div>
  );
}
