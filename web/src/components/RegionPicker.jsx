import { useEffect, useState } from 'react';
import { Mountain, TreePine, Waves, Sun, Landmark, Snowflake, Palmtree, Building2, Droplets } from 'lucide-react';
import { REGIONS, regionLabel } from '../data/propertyOptions.js';
import { propertyApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

// 11.4: one icon per region, each with its own hover/tap animation family (see the
// region-icon-* keyframes in index.css) — matched to something the region is actually known
// for, not decorative. `anim` picks which keyframe set applies.
const REGION_META = {
  north: { icon: Waves, anim: 'ripple', gradient: 'linear-gradient(160deg, #6b8f71, #3f5a45)' }, // Kinneret/Tiberias
  galilee: { icon: Mountain, anim: 'rise', gradient: 'linear-gradient(160deg, #7a9b5e, #47603a)' },
  golan: { icon: Snowflake, anim: 'fall', gradient: 'linear-gradient(160deg, #7a8f9b, #46586a)' }, // Hermon
  carmel: { icon: TreePine, anim: 'sway', gradient: 'linear-gradient(160deg, #8a9b6e, #556b3a)' }, // forest
  center: { icon: Building2, anim: 'pulse', gradient: 'linear-gradient(160deg, #c1592b, #9c431e)' },
  jerusalem: { icon: Landmark, anim: 'pulse', gradient: 'linear-gradient(160deg, #b8860b, #8a6408)' },
  south: { icon: Sun, anim: 'spin', gradient: 'linear-gradient(160deg, #d18a4a, #a8622a)' },
  dead_sea: { icon: Droplets, anim: 'ripple', gradient: 'linear-gradient(160deg, #7a6b52, #5a4d38)' },
  eilat: { icon: Palmtree, anim: 'sway', gradient: 'linear-gradient(160deg, #4a8f8f, #2f6363)' },
};

/** 9.1: replaces the Israel pin-map on the homepage. No photo backend for arbitrary region
 * images yet (see DECISIONS.md 9.1) — a warm duotone gradient + a large, animated,
 * region-specific icon stands in for a real photo instead of a plain color block.
 * 11.4: counts are real per-region totals from the facet-counts endpoint (same one the filter
 * panel uses), not "how many of the ~12 properties on the currently loaded results page happen
 * to be in this region" — that undercount was why most regions showed "coming soon" even when
 * they had real listings just not on the first page. */
export function RegionPicker({ onSelectRegion, activeRegion }) {
  const { t, lang } = useLanguage();
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let cancelled = false;
    propertyApi.facetCounts({}).then((r) => { if (!cancelled) setCounts(r.region || {}); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="region-picker" role="list">
      {REGIONS.map((region) => {
        const meta = REGION_META[region.value];
        const Icon = meta.icon;
        const count = counts[region.value] || 0;
        return (
          <button
            key={region.value}
            type="button"
            role="listitem"
            data-anim={meta.anim}
            className={`region-card${activeRegion === region.value ? ' region-card--active' : ''}`}
            style={{ background: meta.gradient }}
            onClick={() => onSelectRegion(region.value)}
          >
            <Icon className="region-card__icon" size={44} strokeWidth={1.4} aria-hidden="true" />
            <span className="region-card__name">{regionLabel(region.value, lang)}</span>
            {count > 0 && <span className="region-card__count">{t.regionCardCount(count)}</span>}
          </button>
        );
      })}
    </div>
  );
}
