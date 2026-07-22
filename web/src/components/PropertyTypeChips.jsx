import { useEffect, useState } from 'react';
import { Home, Building2, TreePine, BedDouble, Building } from 'lucide-react';
import { PROPERTY_TYPES, propertyTypeLabel } from '../data/propertyOptions.js';
import { propertyApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const TYPE_ICONS = { zimmer: Home, villa: Building2, cottage: TreePine, suite: BedDouble, complex: Building };

/** 11.2: property-type quick chips on the homepage — same "clear filter, live count" pattern
 * PropertyFilterPanel already uses for this exact facet, just surfaced one level up so it's
 * visible without opening the filter panel first. */
export function PropertyTypeChips({ filters, setFilter, onSearch }) {
  const { t, lang } = useLanguage();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    propertyApi.facetCounts({}).then((r) => { if (!cancelled) setCounts(r.propertyType || {}); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="property-type-chips" role="group" aria-label={t.propertyTypeFilterLabel}>
      {PROPERTY_TYPES.map(({ value }) => {
        const Icon = TYPE_ICONS[value] || Home;
        const isActive = filters.propertyType === value;
        return (
          <button
            key={value}
            type="button"
            className={`property-type-chip${isActive ? ' is-active' : ''}`}
            onClick={() => {
              setFilter({ propertyType: isActive ? '' : value });
              onSearch?.();
            }}
          >
            <Icon size={15} strokeWidth={1.8} />
            <span>{propertyTypeLabel(value, lang)}</span>
            <span className="property-type-chip__count">{counts[value] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
