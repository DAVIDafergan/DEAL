import { History } from 'lucide-react';
import { regionLabel } from '../data/propertyOptions.js';

function describeSearch(s) {
  const parts = [];
  if (s.region) parts.push(regionLabel(s.region));
  if (s.city) parts.push(s.city);
  if (s.checkIn) parts.push(s.checkIn);
  if (s.guests) parts.push(`${s.guests} אורחים`);
  return parts.join(' · ') || 'חיפוש קודם';
}

export function RecentSearches({ searches, onPick }) {
  if (searches.length === 0) return null;
  return (
    <div className="recent-searches">
      <span className="recent-searches__label"><History size={13} /> חיפושים אחרונים</span>
      <div className="recent-searches__chips">
        {searches.map((s) => (
          <button key={s.signature} type="button" className="recent-searches__chip" onClick={() => onPick(s)}>
            {describeSearch(s)}
          </button>
        ))}
      </div>
    </div>
  );
}
