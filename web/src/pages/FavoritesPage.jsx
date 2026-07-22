import { Link } from 'react-router-dom';
import { ArrowLeft, Heart, Scale } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavorites } from '../hooks/useFavorites.js';
import { PropertyGrid } from '../components/PropertyGrid.jsx';
import { usePropertyDetails } from '../hooks/usePropertyDetails.js';

/** FavoritesPage — 9.6: shows saved properties (the only thing favoritable on the live site
 * today — see DECISIONS.md 9.3/9.6). Fetches full current data for each saved id rather than
 * trusting the small snapshot useFavorites stored at save-time (price/photos may have changed
 * since, or the listing may have been unpublished). */
export function FavoritesPage() {
  const { favorites } = useFavorites();
  const propertyFavorites = favorites.filter((f) => f.deal_source === 'property');
  const { properties, isLoading } = usePropertyDetails(propertyFavorites.map((f) => f.id));

  return (
    <div className="favorites-page" dir="rtl">
      <div className="favorites-page__header">
        <Link to="/" className="favorites-page__back">
          <ArrowLeft size={16} /> חזרה
        </Link>
        <h1 className="favorites-page__title">
          <Heart size={20} style={{ color: 'var(--ds-wine)', marginInlineEnd: 8, verticalAlign: 'middle' }} />
          המועדפים שלי
        </h1>
        {properties.length >= 2 && (
          <Link to={`/my/compare?ids=${properties.map((p) => p.id).join(',')}`} className="favorites-page__compare-btn">
            <Scale size={15} /> השווה נכסים
          </Link>
        )}
      </div>

      {propertyFavorites.length === 0 ? (
        <div className="favorites-page__empty">
          <div className="favorites-page__empty-icon">🏡</div>
          <p className="favorites-page__empty-text">עדיין לא שמרת נכסים</p>
          <p className="favorites-page__empty-sub">
            לחצו על ❤️ על כל נכס שאהבתם — הוא יישמר כאן, מוכן להשוואה או הזמנה
          </p>
          <Link to="/" style={{ marginTop: 20, display: 'inline-block', color: 'var(--ds-hearth)', fontWeight: 700 }}>
            חפשו נכס עכשיו →
          </Link>
        </div>
      ) : (
        <motion.div className="container" initial="hidden" animate="visible">
          <PropertyGrid properties={properties} isLoading={isLoading} hasActiveFilters={false} />
        </motion.div>
      )}
    </div>
  );
}
