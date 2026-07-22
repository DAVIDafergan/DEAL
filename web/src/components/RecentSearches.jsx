import { History } from 'lucide-react';
import { regionLabel } from '../data/propertyOptions.js';
import { useLanguage } from '../context/LanguageContext.jsx';

function describeSearch(s, t, lang) {
  const parts = [];
  if (s.region) parts.push(regionLabel(s.region, lang));
  if (s.city) parts.push(s.city);
  if (s.checkIn) parts.push(s.checkIn);
  if (s.guests) parts.push(t.guestsUpTo(s.guests));
  return parts.join(' · ') || t.recentSearchesLabel;
}

export function RecentSearches({ searches, onPick }) {
  const { t, lang } = useLanguage();
  if (searches.length === 0) return null;
  return (
    <div className="recent-searches">
      <span className="recent-searches__label"><History size={13} /> {t.recentSearchesLabel}</span>
      <div className="recent-searches__chips">
        {searches.map((s) => (
          <button key={s.signature} type="button" className="recent-searches__chip" onClick={() => onPick(s)}>
            {describeSearch(s, t, lang)}
          </button>
        ))}
      </div>
    </div>
  );
}
