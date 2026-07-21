import { SearchX } from 'lucide-react';
import { buildActiveChips } from './PropertyActiveChips.jsx';

// Narrowest-first: amenities/kosher/type are usually what zeroes out a result set, region/city
// are the broadest and least likely to be "the" culprit — so they're offered last.
const RESTRICTIVENESS_ORDER = ['am-', 'kosher', 'type', 'bedrooms', 'price', 'guests', 'dates', 'city', 'region'];

function mostRestrictiveChip(chips) {
  for (const prefix of RESTRICTIVENESS_ORDER) {
    const found = chips.find((c) => c.key.startsWith(prefix));
    if (found) return found;
  }
  return null;
}

/** 7.2: "אפס תוצאות → מסך ריק ידידותי עם הצעה להסיר את הפילטר המגביל ביותר". */
export function PropertyEmptyState({ filters, setFilter, toggleAmenity, onClearAll, hasActiveFilters }) {
  if (!hasActiveFilters) {
    return (
      <div className="pes">
        <SearchX size={32} className="pes__icon" />
        <p className="pes__title">אין עדיין נכסים להצגה</p>
        <p className="pes__sub">נכסים חדשים מתווספים כל הזמן — נסו שוב בקרוב</p>
      </div>
    );
  }

  const chips = buildActiveChips(filters, { setFilter, toggleAmenity });
  const culprit = mostRestrictiveChip(chips);

  return (
    <div className="pes">
      <SearchX size={32} className="pes__icon" />
      <p className="pes__title">לא נמצאו נכסים התואמים את הסינון</p>
      <p className="pes__sub">נסו להסיר את הפילטר המגביל ביותר, או לנקות הכל ולהתחיל מחדש</p>
      <div className="pes__actions">
        {culprit && (
          <button type="button" className="pes__btn pes__btn--primary" onClick={culprit.onRemove}>
            הסר את "{culprit.label}"
          </button>
        )}
        <button type="button" className="pes__btn" onClick={onClearAll}>
          נקה הכל
        </button>
      </div>
    </div>
  );
}
