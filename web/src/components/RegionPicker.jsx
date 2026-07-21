import { Mountain, Trees, Waves, Sun, Landmark, TentTree, Snowflake, Palmtree, Building2 } from 'lucide-react';
import { REGIONS } from '../data/propertyOptions.js';

// 9.1: replaces the Israel pin-map on the homepage. Each region gets a distinct warm duotone
// gradient (no photo backend for arbitrary region queries yet — see DECISIONS.md 9.1) + a
// representative lucide icon. Clicking behaves exactly like the old map click did: sets the
// region filter and scrolls to results.
const REGION_META = {
  north: { icon: Mountain, gradient: 'linear-gradient(160deg, #6b8f71, #3f5a45)' },
  galilee: { icon: Trees, gradient: 'linear-gradient(160deg, #7a9b5e, #47603a)' },
  golan: { icon: Snowflake, gradient: 'linear-gradient(160deg, #7a8f9b, #46586a)' },
  carmel: { icon: TentTree, gradient: 'linear-gradient(160deg, #8a9b6e, #556b3a)' },
  center: { icon: Building2, gradient: 'linear-gradient(160deg, #c1592b, #9c431e)' },
  jerusalem: { icon: Landmark, gradient: 'linear-gradient(160deg, #b8860b, #8a6408)' },
  south: { icon: Sun, gradient: 'linear-gradient(160deg, #d18a4a, #a8622a)' },
  dead_sea: { icon: Waves, gradient: 'linear-gradient(160deg, #7a6b52, #5a4d38)' },
  eilat: { icon: Palmtree, gradient: 'linear-gradient(160deg, #4a8f8f, #2f6363)' },
};

export function RegionPicker({ propertiesByRegion = {}, onSelectRegion, activeRegion }) {
  return (
    <div className="region-picker" role="list">
      {REGIONS.map((region) => {
        const meta = REGION_META[region.value];
        const Icon = meta.icon;
        const count = propertiesByRegion[region.value] || 0;
        return (
          <button
            key={region.value}
            type="button"
            role="listitem"
            className={`region-card${activeRegion === region.value ? ' region-card--active' : ''}`}
            style={{ background: meta.gradient }}
            onClick={() => onSelectRegion(region.value)}
          >
            <Icon className="region-card__icon" size={26} strokeWidth={1.75} aria-hidden="true" />
            <span className="region-card__name">{region.label}</span>
            <span className="region-card__count">{count > 0 ? `${count} נכסים` : 'בקרוב'}</span>
          </button>
        );
      })}
    </div>
  );
}
