import { useState } from 'react';
import { Link } from '../components/LocalizedLink.jsx';
import { Heart, Scale, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFavorites } from '../hooks/useFavorites.js';
import { PropertyGrid } from '../components/PropertyGrid.jsx';
import { usePropertyDetails } from '../hooks/usePropertyDetails.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { CreateWishlistModal, getMyWishlists } from '../components/CreateWishlistModal.jsx';
import { BackButton } from '../components/BackButton.jsx';
import { FeatureHint } from '../components/FeatureHint.jsx';
import { useHintSeen } from '../context/HintsContext.jsx';

/** FavoritesPage — 9.6: shows saved properties (the only thing favoritable on the live site
 * today — see DECISIONS.md 9.3/9.6). Fetches full current data for each saved id rather than
 * trusting the small snapshot useFavorites stored at save-time (price/photos may have changed
 * since, or the listing may have been unpublished). 11.13: also the entry point for turning
 * these favorites into a shareable, votable wishlist. */
export function FavoritesPage() {
  const { t, dir } = useLanguage();
  const { favorites } = useFavorites();
  const propertyFavorites = favorites.filter((f) => f.deal_source === 'property');
  const { properties, isLoading } = usePropertyDetails(propertyFavorites.map((f) => f.id));
  const [showShareModal, setShowShareModal] = useState(false);
  const myWishlists = getMyWishlists();
  // 11.22: "share with friends who are deciding" only makes sense once there's actually
  // something worth deciding between — matches the second-favorite trigger from the request.
  const { markSeen: markShareHintSeen } = useHintSeen('favorites-share');

  function openShareModal() {
    markShareHintSeen();
    setShowShareModal(true);
  }

  return (
    <div className="favorites-page" dir={dir}>
      {showShareModal && (
        <CreateWishlistModal propertyIds={properties.map((p) => p.id)} onClose={() => setShowShareModal(false)} />
      )}

      <BackButton />

      <div className="favorites-page__header">
        <h1 className="favorites-page__title">
          <Heart size={20} style={{ color: 'var(--ds-wine)', marginInlineEnd: 8, verticalAlign: 'middle' }} />
          {t.favoritesTitle}
        </h1>
        {properties.length >= 2 && (
          <Link to={`/my/compare?ids=${properties.map((p) => p.id).join(',')}`} className="favorites-page__compare-btn">
            <Scale size={15} /> {t.favoritesCompareButton}
          </Link>
        )}
        {properties.length >= 1 && (
          <button type="button" className="favorites-page__compare-btn" onClick={openShareModal}>
            <Share2 size={15} /> {t.wishlistShareButton}
          </button>
        )}
      </div>

      {propertyFavorites.length >= 2 && (
        <div className="container">
          <FeatureHint id="favorites-share">
            {t.hintFavoritesShare}
            <br />
            <span style={{ opacity: 0.75, fontSize: '0.82em' }}>{t.hintFavoritesShareCaption}</span>
            <button type="button" className="feature-hint__cta" onClick={openShareModal}>
              <Share2 size={12} /> {t.hintFavoritesShareCta}
            </button>
          </FeatureHint>
        </div>
      )}

      {myWishlists.length > 0 && (
        <div className="container wishlist-my-lists">
          <span className="wishlist-my-lists__label">{t.wishlistMyListsLabel}</span>
          {myWishlists.map((w) => (
            <Link key={w.token} to={`/list/${w.token}`} className="wishlist-my-lists__chip">{w.name}</Link>
          ))}
        </div>
      )}

      {propertyFavorites.length === 0 ? (
        <div className="favorites-page__empty">
          <div className="favorites-page__empty-icon">🏡</div>
          <p className="favorites-page__empty-text">{t.favoritesEmpty}</p>
          <p className="favorites-page__empty-sub">
            {t.favoritesEmptySub}
          </p>
          <Link to="/" style={{ marginTop: 20, display: 'inline-block', color: 'var(--ds-hearth)', fontWeight: 700 }}>
            {t.favoritesFindNow} →
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
