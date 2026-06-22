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

function FilterRow({ options, labelKeys, active, onToggle }) {
  const { t } = useLanguage();
  return (
    <div className="filter-row">
      {options.map((value) => (
        <FilterPill key={value} value={value} label={t[labelKeys[value]]} isActive={active === value} onToggle={onToggle} />
      ))}
    </div>
  );
}

/**
 * FilterBar — שורות כפתורי סינון מהירים מתחת למפה: קהל / סוג יעד / תקציב.
 * כל קבוצה היא single-select עם toggle-לכיבוי (לחיצה על כפתור פעיל מנקה אותו).
 */
export function FilterBar({ audience, type, budget, onChangeAudience, onChangeType, onChangeBudget, onClear }) {
  const { t } = useLanguage();
  const hasActiveFilters = Boolean(audience || type || budget);

  return (
    <div className="filter-bar">
      <FilterRow options={AUDIENCE_OPTIONS} labelKeys={AUDIENCE_LABEL_KEYS} active={audience} onToggle={onChangeAudience} />
      <FilterRow options={TYPE_OPTIONS} labelKeys={TYPE_LABEL_KEYS} active={type} onToggle={onChangeType} />
      <FilterRow options={BUDGET_OPTIONS} labelKeys={BUDGET_LABEL_KEYS} active={budget} onToggle={onChangeBudget} />

      {hasActiveFilters && (
        <button type="button" className="filter-clear" onClick={onClear}>
          {t.clearFiltersButton}
        </button>
      )}
    </div>
  );
}
