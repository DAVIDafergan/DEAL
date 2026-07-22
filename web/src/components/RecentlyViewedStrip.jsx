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
  return (
    <div className="recently-viewed container">
      <span className="recent-searches__label"><Clock size={13} /> {t.recentlyViewedLabel}</span>
      <div className="recently-viewed__row">
        {properties.map((p) => (
          <div key={p.id} className="recently-viewed__item"><PropertyCard property={p} /></div>
        ))}
      </div>
    </div>
  );
}
