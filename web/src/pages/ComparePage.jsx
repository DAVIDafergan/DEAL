import { useSearchParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { usePropertyDetails } from '../hooks/usePropertyDetails.js';
import { regionLabel, propertyTypeLabel, AMENITIES, amenityLabel } from '../data/propertyOptions.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { optimizedImageUrl } from '../utils/imageUrl.js';
import { RouteLoading } from '../components/RouteLoading.jsx';

/** ComparePage — 9.6 "השוואה בין נכסים שמורים": a simple side-by-side table (region/city,
 * capacity, price, amenities) for up to 4 properties, driven entirely by ?ids= in the URL so
 * the comparison itself is shareable/bookmarkable, same pattern as search state (7.2). */
export function ComparePage() {
  const { t, dir, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 4);
  const { properties, isLoading } = usePropertyDetails(ids);

  return (
    <div className="settings-page" dir={dir}>
      <div className="settings-page__header">
        <Link to="/my/favorites" className="settings-page__back"><ArrowLeft size={16} /> {t.compareBackToFavorites}</Link>
        <h1 className="settings-page__title">{t.compareTitle}</h1>
      </div>

      <div className="container">
        {isLoading && <RouteLoading text={t.friendlyLoadingProperties} />}
        {!isLoading && properties.length < 2 && (
          <p className="agent-form__hint">{t.compareNeedTwo} <Link to="/my/favorites">{t.compareBackToFavorites}</Link></p>
        )}
        {properties.length >= 2 && (
          <div className="cmp" style={{ '--cmp-cols': properties.length }}>
            <div className="cmp__row cmp__row--header">
              <div className="cmp__label" />
              {properties.map((p) => (
                <div key={p.id} className="cmp__col-head">
                  {p.owner_images?.[0] && <img src={optimizedImageUrl(p.owner_images[0], { width: 240 })} alt="" className="cmp__img" loading="lazy" />}
                  <Link to={`/property/${p.id}`} className="cmp__name">{p.name}</Link>
                  <span className="cmp__location">{regionLabel(p.region, lang)}{p.city ? ` · ${p.city}` : ''}</span>
                </div>
              ))}
            </div>

            <CompareRow label={t.comparePropertyType} properties={properties} render={(p) => propertyTypeLabel(p.property_type, lang)} />
            <CompareRow label={t.comparePricePerNight} render={(p) => (p.price_from ? `${Math.round(p.price_from)} ${getCurrencySymbol(p.currency)}` : t.priceOnRequest)} properties={properties} highlight />
            <CompareRow label={t.compareGuestCapacity} render={(p) => p.total_guest_capacity ?? p.guest_capacity ?? '—'} properties={properties} />
            <CompareRow label={t.compareBedrooms} render={(p) => p.max_bedrooms ?? p.bedrooms ?? '—'} properties={properties} />
            <CompareRow label={t.compareVerified} render={(p) => (p.status === 'claimed' || p.status === 'active')} properties={properties} boolean />

            {AMENITIES.map((a) => (
              <CompareRow key={a.value} label={amenityLabel(a.value, lang)} render={(p) => Boolean(p[a.value])} properties={properties} boolean />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CompareRow({ label, render, properties, boolean, highlight }) {
  return (
    <div className={`cmp__row${highlight ? ' cmp__row--highlight' : ''}`}>
      <div className="cmp__label">{label}</div>
      {properties.map((p) => {
        const value = render(p);
        return (
          <div key={p.id} className="cmp__cell">
            {boolean ? (value ? <CheckCircle2 size={16} className="cmp__yes" /> : <XCircle size={16} className="cmp__no" />) : value}
          </div>
        );
      })}
    </div>
  );
}
