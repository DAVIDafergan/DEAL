import { Clock } from 'lucide-react';
import { usePropertyDetails } from '../hooks/usePropertyDetails.js';
import { PropertyCard } from './PropertyCard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** RecentlyViewedStrip — 10.8. Reuses PropertyCard (not a bespoke mini-card) so a viewed
 * listing looks identical here as everywhere else on the site — one less thing to design. */
export function RecentlyViewedStrip({ propertyIds }) {
  const { t } = useLanguage();
  const { properties } = usePropertyDetails(propertyIds);
  if (properties.length === 0) return null;
  // 11.3: a horizontal-scroll strip with only 1-2 cards in it just reads as a mostly-empty
  // carousel — below 3 items there's nothing to actually scroll to, so it renders as a plain
  // row instead (no overflow-x, no scroll-snap, cards sit at their natural width).
  const isScrollable = properties.length >= 3;
  return (
    <div className="recently-viewed container">
      <span className="recent-searches__label"><Clock size={13} /> {t.recentlyViewedLabel}</span>
      <div className={isScrollable ? 'recently-viewed__row' : 'recently-viewed__row recently-viewed__row--static'}>
        {properties.map((p) => (
          <div key={p.id} className="recently-viewed__item"><PropertyCard property={p} /></div>
        ))}
      </div>
    </div>
  );
}
