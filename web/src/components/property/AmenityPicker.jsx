import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { AMENITY_CATEGORIES, AMENITIES } from '../../data/propertyOptions.js';

/** AmenityPicker — 11.6: the amenities catalog grew from 26 flat checkboxes to ~65 grouped into
 * 9 categories, too long to show as one block. Each category collapses independently; a category
 * with an already-checked item starts open so an owner editing an existing listing immediately
 * sees what's set. Searching force-opens every category with a matching item. */
export function AmenityPicker({ selected, onToggle }) {
  const [query, setQuery] = useState('');
  const [openKeys, setOpenKeys] = useState(() => {
    const initial = new Set();
    for (const cat of AMENITY_CATEGORIES) {
      if (AMENITIES.some((a) => a.category === cat.key && selected[a.value])) initial.add(cat.key);
    }
    return initial;
  });

  function toggleCategory(key) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AMENITY_CATEGORIES.map((cat) => {
      const items = AMENITIES.filter((a) => a.category === cat.key && (!q || a.label.toLowerCase().includes(q)));
      const checkedCount = items.filter((a) => selected[a.value]).length;
      return { ...cat, items, checkedCount };
    }).filter((cat) => cat.items.length > 0);
  }, [query, selected]);

  function isOpen(key) {
    return Boolean(query.trim()) || openKeys.has(key);
  }

  return (
    <div className="amenity-picker">
      <div className="amenity-picker__search">
        <Search size={15} />
        <input
          type="text"
          className="amenity-picker__search-input"
          placeholder="חיפוש מתקן…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {filteredCategories.map((cat) => {
        const open = isOpen(cat.key);
        return (
          <div key={cat.key} className="amenity-picker__cat">
            <button
              type="button"
              className="amenity-picker__cat-head"
              onClick={() => toggleCategory(cat.key)}
              aria-expanded={open}
            >
              <span className="amenity-picker__cat-title">
                {cat.label}
                {cat.checkedCount > 0 && <span className="amenity-picker__cat-badge">{cat.checkedCount}</span>}
              </span>
              <ChevronDown size={15} className={`amenity-picker__chevron${open ? ' amenity-picker__chevron--open' : ''}`} />
            </button>
            {open && (
              <div className="wizard-checkboxes amenity-picker__cat-body">
                {cat.items.map((a) => (
                  <label key={a.value} className="wizard-checkbox">
                    <input type="checkbox" checked={Boolean(selected[a.value])} onChange={() => onToggle(a.value)} />
                    {a.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
