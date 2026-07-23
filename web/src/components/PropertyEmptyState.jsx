import { SearchX } from 'lucide-react';
import { buildActiveChips } from './PropertyActiveChips.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const RESTRICTIVENESS_ORDER = ['am-', 'bed-', 'kosher', 'type', 'bedrooms', 'price', 'guests', 'dates', 'city', 'region'];

function mostRestrictiveChip(chips) {
  for (const prefix of RESTRICTIVENESS_ORDER) {
    const found = chips.find((c) => c.key.startsWith(prefix));
    if (found) return found;
  }
  return null;
}

/** 7.2: "אפס תוצאות → מסך ריק ידידותי עם הצעה להסיר את הפילטר המגביל ביותר". */
export function PropertyEmptyState({ filters, setFilter, toggleAmenity, toggleBedType, onClearAll, hasActiveFilters }) {
  const { t, lang } = useLanguage();

  if (!hasActiveFilters) {
    return (
      <div className="pes">
        <SearchX size={32} className="pes__icon" />
        <p className="pes__title">{t.emptyStateNoProperties}</p>
        <p className="pes__sub">{t.emptyStateNoPropertiesSub}</p>
      </div>
    );
  }

  const chips = buildActiveChips(filters, { setFilter, toggleAmenity, toggleBedType, t, lang });
  const culprit = mostRestrictiveChip(chips);

  return (
    <div className="pes">
      <SearchX size={32} className="pes__icon" />
      <p className="pes__title">{t.emptyStateNoMatches}</p>
      <p className="pes__sub">{t.emptyStateSuggestion}</p>
      <div className="pes__actions">
        {culprit && (
          <button type="button" className="pes__btn pes__btn--primary" onClick={culprit.onRemove}>
            {t.removeFilterButton(culprit.label)}
          </button>
        )}
        <button type="button" className="pes__btn" onClick={onClearAll}>
          {t.filterClearAll}
        </button>
      </div>
    </div>
  );
}
