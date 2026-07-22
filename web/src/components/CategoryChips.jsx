import { Waves, Sparkles, UtensilsCrossed, Baby, Heart, Users, Sparkle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

// 9.2 "קטגוריות מהירות" — each chip maps to a real, working filter (not decorative). "New" has
// no dedicated recency sort yet (searchProperties already orders by updated_at DESC by default —
// see DECISIONS.md 9.2), so it just clears filters rather than faking a sort that doesn't exist.
const CATEGORIES = [
  { key: 'jacuzzi', labelKey: 'categoryJacuzzi', icon: Sparkles, apply: (setFilter) => setFilter({ amenities: ['has_private_jacuzzi'] }) },
  { key: 'pool', labelKey: 'categoryPool', icon: Waves, apply: (setFilter) => setFilter({ amenities: ['has_private_pool'] }) },
  { key: 'kosher', labelKey: 'categoryKosher', icon: UtensilsCrossed, apply: (setFilter) => setFilter({ kosherLevel: 'kosher' }) },
  { key: 'family', labelKey: 'categoryFamilies', icon: Baby, apply: (setFilter) => setFilter({ amenities: ['is_kid_friendly'] }) },
  { key: 'romantic', labelKey: 'categoryRomantic', icon: Heart, apply: (setFilter) => setFilter({ amenities: ['has_private_jacuzzi', 'has_view'] }) },
  { key: 'groups', labelKey: 'categoryGroups', icon: Users, apply: (setFilter) => setFilter({ guests: '10' }) },
  { key: 'new', labelKey: 'categoryNew', icon: Sparkle, apply: (setFilter) => setFilter({ region: '', amenities: [], kosherLevel: '', guests: '' }) },
];

export function CategoryChips({ setFilter, onPick }) {
  const { t } = useLanguage();
  return (
    <div className="category-chips">
      {CATEGORIES.map(({ key, labelKey, icon: Icon, apply }) => (
        <button
          key={key}
          type="button"
          className="category-chip"
          onClick={() => {
            apply(setFilter);
            onPick?.();
          }}
        >
          <Icon size={16} strokeWidth={1.75} />
          <span>{t[labelKey]}</span>
        </button>
      ))}
    </div>
  );
}
