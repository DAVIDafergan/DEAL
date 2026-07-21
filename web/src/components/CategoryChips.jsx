import { Waves, Sparkles, UtensilsCrossed, Baby, Heart, Users, Sparkle } from 'lucide-react';

// 9.2 "קטגוריות מהירות" — each chip maps to a real, working filter (not decorative). "New" has
// no dedicated recency sort yet (searchProperties already orders by updated_at DESC by default —
// see DECISIONS.md 9.2), so it just clears filters rather than faking a sort that doesn't exist.
const CATEGORIES = [
  { key: 'jacuzzi', label: 'עם ג׳קוזי', icon: Sparkles, apply: (setFilter) => setFilter({ amenities: ['has_private_jacuzzi'] }) },
  { key: 'pool', label: 'עם בריכה', icon: Waves, apply: (setFilter) => setFilter({ amenities: ['has_private_pool'] }) },
  { key: 'kosher', label: 'כשר', icon: UtensilsCrossed, apply: (setFilter) => setFilter({ kosherLevel: 'kosher' }) },
  { key: 'family', label: 'למשפחות', icon: Baby, apply: (setFilter) => setFilter({ amenities: ['is_kid_friendly'] }) },
  { key: 'romantic', label: 'רומנטי לזוגות', icon: Heart, apply: (setFilter) => setFilter({ amenities: ['has_private_jacuzzi', 'has_view'] }) },
  { key: 'groups', label: 'לקבוצות גדולות', icon: Users, apply: (setFilter) => setFilter({ guests: '10' }) },
  { key: 'new', label: 'חדשים באתר', icon: Sparkle, apply: (setFilter) => setFilter({ region: '', amenities: [], kosherLevel: '', guests: '' }) },
];

export function CategoryChips({ setFilter, onPick }) {
  return (
    <div className="category-chips">
      {CATEGORIES.map(({ key, label, icon: Icon, apply }) => (
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
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
