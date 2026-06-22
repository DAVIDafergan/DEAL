import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';

const AUDIENCE_OPTIONS = ['couples', 'families', 'solo', 'friends'];
const TYPE_OPTIONS = ['beach', 'city', 'nature', 'shopping', 'culture'];
const BUDGET_OPTIONS = ['500', '1000', '2000'];

const AUDIENCE_LABEL_KEYS = { couples: 'audienceCouples', families: 'audienceFamilies', solo: 'audienceSolo', friends: 'audienceFriends' };
const TYPE_LABEL_KEYS = { beach: 'typeBeach', city: 'typeCity', nature: 'typeNature', shopping: 'typeShopping', culture: 'typeCulture' };
const BUDGET_LABEL_KEYS = { 500: 'budgetUnder500', 1000: 'budgetUnder1000', 2000: 'budgetUnder2000' };

function FilterRow({ options, labelKeys, active, onToggle }) {
  const { t } = useLanguage();
  return (
    <div className="filter-row">
      {options.map((value) => (
        <motion.button
          key={value}
          type="button"
          className={`filter-pill ${active === value ? 'is-active' : ''}`}
          whileTap={{ scale: 0.94 }}
          onClick={() => onToggle(active === value ? null : value)}
        >
          {t[labelKeys[value]]}
        </motion.button>
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
