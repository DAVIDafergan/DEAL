import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';

const AUDIENCE_OPTIONS = ['couples', 'families', 'solo', 'friends'];
const TYPE_OPTIONS = ['beach', 'city', 'nature', 'shopping', 'culture'];
const BUDGET_OPTIONS = ['500', '1000', '2000'];

const AUDIENCE_LABEL_KEYS = { couples: 'audienceCouples', families: 'audienceFamilies', solo: 'audienceSolo', friends: 'audienceFriends' };
const TYPE_LABEL_KEYS = { beach: 'typeBeach', city: 'typeCity', nature: 'typeNature', shopping: 'typeShopping', culture: 'typeCulture' };
const BUDGET_LABEL_KEYS = { 500: 'budgetUnder500', 1000: 'budgetUnder1000', 2000: 'budgetUnder2000' };

/**
 * FilterPill — כפתור סינון בודד. לחיצה: spring physics (קצת scale + 2px shift), וטקסט
 * שמהבהב קצרות (remount עם key חדש בכל קליק) — "מגיב בחיתוך", לא קשיח ולא "מוזר".
 */
function FilterPill({ value, label, isActive, onToggle }) {
  const [clickTick, setClickTick] = useState(0);

  function handleClick() {
    setClickTick((c) => c + 1);
    onToggle(isActive ? null : value);
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
 * FilterBar — שורה אופקית אחת ברורה לכל כפתורי הסינון (קהל + סוג יעד + תקציב), עם הפרדה
 * עדינה בין הקבוצות. לא 3 שורות נפרדות — הכל יחד, גלילה אופקית אם צריך (נוח גם בנייד וגם
 * במחשב). כל קבוצה היא single-select עם toggle-לכיבוי.
 */
export function FilterBar({ audience, type, budget, onChangeAudience, onChangeType, onChangeBudget, onClear }) {
  const { t } = useLanguage();
  const hasActiveFilters = Boolean(audience || type || budget);

  return (
    <div className="filter-bar">
      <div className="filter-row filter-row--unified">
        {AUDIENCE_OPTIONS.map((value) => (
          <FilterPill key={`a-${value}`} value={value} label={t[AUDIENCE_LABEL_KEYS[value]]} isActive={audience === value} onToggle={onChangeAudience} />
        ))}

        <span className="filter-row__divider" aria-hidden="true" />

        {TYPE_OPTIONS.map((value) => (
          <FilterPill key={`t-${value}`} value={value} label={t[TYPE_LABEL_KEYS[value]]} isActive={type === value} onToggle={onChangeType} />
        ))}

        <span className="filter-row__divider" aria-hidden="true" />

        {BUDGET_OPTIONS.map((value) => (
          <FilterPill key={`b-${value}`} value={value} label={t[BUDGET_LABEL_KEYS[value]]} isActive={budget === value} onToggle={onChangeBudget} />
        ))}
      </div>

      {hasActiveFilters && (
        <button type="button" className="filter-clear" onClick={onClear}>
          {t.clearFiltersButton}
        </button>
      )}
    </div>
  );
}
