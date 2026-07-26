import { TrendingUp } from 'lucide-react';
import { regionLabel } from '../data/propertyOptions.js';
import { useLanguage } from '../context/LanguageContext.jsx';

function describeSearch(s, lang) {
  const parts = [];
  if (s.region) parts.push(regionLabel(s.region, lang));
  if (s.city) parts.push(s.city);
  return parts.join(' · ');
}

/** PopularSearches — 11.15: real region/city combinations other visitors actually searched
 * (server-aggregated, last 30 days — see propertyStore.getPopularSearches), distinct from
 * RecentSearches (that's this visitor's own history, client-only). */
export function PopularSearches({ searches, onPick }) {
  const { t, lang } = useLanguage();
  if (!searches || searches.length === 0) return null;
  return (
    <div className="recent-searches">
      <span className="recent-searches__label"><TrendingUp size={13} /> {t.popularSearchesLabel}</span>
      <div className="recent-searches__chips">
        {searches.map((s) => (
          <button
            key={`${s.region || ''}-${s.city || ''}`}
            type="button"
            className="recent-searches__chip"
            onClick={() => onPick({ region: s.region || '', city: s.city || '' })}
          >
            {describeSearch(s, lang)}
          </button>
        ))}
      </div>
    </div>
  );
}
