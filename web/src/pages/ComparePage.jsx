import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { usePropertyDetails } from '../hooks/usePropertyDetails.js';
import { regionLabel, propertyTypeLabel, AMENITIES } from '../data/propertyOptions.js';
import { getCurrencySymbol } from '../utils/currency.js';

/** ComparePage — 9.6 "השוואה בין נכסים שמורים": a simple side-by-side table (region/city,
 * capacity, price, amenities) for up to 4 properties, driven entirely by ?ids= in the URL so
 * the comparison itself is shareable/bookmarkable, same pattern as search state (7.2). */
export function ComparePage() {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get('ids') || '').split(',').filter(Boolean).slice(0, 4);
  const { properties, isLoading } = usePropertyDetails(ids);

  return (
    <div className="settings-page" dir="rtl">
      <div className="settings-page__header">
        <Link to="/my/favorites" className="settings-page__back"><ArrowLeft size={16} /> חזרה למועדפים</Link>
        <h1 className="settings-page__title">השוואת נכסים</h1>
      </div>

      <div className="container">
        {isLoading && <p className="bsp__loading">טוען…</p>}
        {!isLoading && properties.length < 2 && (
          <p className="agent-form__hint">צריך לפחות 2 נכסים שמורים כדי להשוות. <Link to="/my/favorites">חזרה למועדפים</Link></p>
        )}
        {properties.length >= 2 && (
          <div className="cmp" style={{ '--cmp-cols': properties.length }}>
            <div className="cmp__row cmp__row--header">
              <div className="cmp__label" />
              {properties.map((p) => (
                <div key={p.id} className="cmp__col-head">
                  {p.owner_images?.[0] && <img src={p.owner_images[0]} alt="" className="cmp__img" />}
                  <Link to={`/property/${p.id}`} className="cmp__name">{p.name}</Link>
                  <span className="cmp__location">{regionLabel(p.region)}{p.city ? ` · ${p.city}` : ''}</span>
                </div>
              ))}
            </div>

            <CompareRow label="סוג נכס" properties={properties} render={(p) => propertyTypeLabel(p.property_type)} />
            <CompareRow label="מחיר ללילה" render={(p) => (p.price_from ? `${Math.round(p.price_from)} ${getCurrencySymbol(p.currency)}` : 'לפי פנייה')} properties={properties} highlight />
            <CompareRow label="קיבולת אורחים" render={(p) => p.total_guest_capacity ?? p.guest_capacity ?? '—'} properties={properties} />
            <CompareRow label="חדרי שינה" render={(p) => p.max_bedrooms ?? p.bedrooms ?? '—'} properties={properties} />
            <CompareRow label="מאומת" render={(p) => (p.status === 'claimed' || p.status === 'active')} properties={properties} boolean />

            {AMENITIES.map((a) => (
              <CompareRow key={a.value} label={a.label} render={(p) => Boolean(p[a.value])} properties={properties} boolean />
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
