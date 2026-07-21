import { Link } from 'react-router-dom';
import { MessageCircle, CheckCircle, Users, BedDouble, Waves } from 'lucide-react';
import { getCurrencySymbol } from '../utils/currency.js';
import { regionLabel } from '../data/propertyOptions.js';

function buildWhatsAppUrl(number, propertyName) {
  const text = `שלום, ראיתי את ${propertyName} ב-Dealim ואני מתעניין/ת`;
  let clean = (number || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 10) clean = '972' + clean.slice(1);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

function topAmenities(property) {
  const list = [];
  if (property.has_private_jacuzzi) list.push('ג׳קוזי פרטי');
  if (property.has_private_pool) list.push('בריכה פרטית');
  else if (property.has_heated_pool) list.push('בריכה מחוממת');
  if (property.has_view) list.push('נוף');
  return list;
}

/** PropertyCard — same anatomy as AgentDealCard (.adc*): image+badges, bottom overlay, info rows, price+actions.
 * Price/capacity come from the units aggregate (7.3: "החל מ-" the cheapest active unit, capacity
 * = sum of active units) — falls back to the legacy property-level columns for any row that
 * somehow has neither (shouldn't happen post-migration, but cheap to guard). */
export function PropertyCard({ property }) {
  const image = property.owner_images?.[0] || null;
  const isClaimed = property.status === 'claimed' || property.status === 'active';
  const amenities = topAmenities(property);
  const price = property.price_from ?? property.base_price_night;
  const capacity = property.total_guest_capacity ?? property.guest_capacity;
  const bedrooms = property.max_bedrooms ?? property.bedrooms;
  const isMultiUnit = (property.unit_count ?? 1) > 1;

  return (
    <Link to={`/property/${property.id}`} className="adc" aria-label={property.name}>
      <div className="adc__media">
        {image
          ? <img src={image} alt={property.name} className="adc__img" loading="lazy" />
          : <div className="adc__img-placeholder" />}

        <div className="adc__media-gradient" />

        {isClaimed ? (
          <span className="adc__value-badge" style={{ background: 'var(--ds-teal)' }}>
            <CheckCircle size={11} /> מאומת
          </span>
        ) : (
          <span className="adc__exclusive-badge">טרם אומת</span>
        )}

        <div className="adc__overlay-bottom">
          <div>
            <div className="adc__dest-name">{property.name}</div>
            <span className="adc__country">{regionLabel(property.region)}{property.city ? ` · ${property.city}` : ''}</span>
          </div>
        </div>
      </div>

      <div className="adc__body">
        {(capacity || bedrooms) && (
          <div className="adc__info-row">
            <span className="icon-draw icon-draw--once adc__info-icon">
              <Users size={12} strokeWidth={1.8} />
            </span>
            <span className="adc__info-text">
              {[
                capacity ? `עד ${capacity} אורחים` : null,
                bedrooms ? `${bedrooms} חדרי שינה` : null,
              ].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
        {amenities.length > 0 && (
          <div className="adc__info-row">
            <span className="icon-draw icon-draw--once adc__info-icon">
              <Waves size={12} strokeWidth={1.8} />
            </span>
            <span className="adc__info-text">{amenities.join(' · ')}</span>
          </div>
        )}
        {bedrooms > 0 && amenities.length === 0 && (
          <div className="adc__info-row">
            <span className="icon-draw icon-draw--once adc__info-icon">
              <BedDouble size={12} strokeWidth={1.8} />
            </span>
            <span className="adc__info-text">{bedrooms} חדרי שינה</span>
          </div>
        )}

        <div className="adc__footer">
          <div className="adc__price-block">
            {price ? (
              <span className="adc__price">
                {isMultiUnit && <span className="adc__price-from">החל מ-</span>}
                {Math.round(price)}{' '}
                <span className="adc__currency">{getCurrencySymbol(property.currency)}</span>
              </span>
            ) : (
              <span className="adc__price">מחיר לפי פנייה</span>
            )}
            {price && <span className="adc__pax">ללילה</span>}
            {property.description && (
              <span className="adc__desc-snippet">{property.description.slice(0, 40)}</span>
            )}
          </div>

          <div className="adc__actions" onClick={(e) => e.stopPropagation()}>
            {property.whatsapp && (
              // A <button> (not a nested <a>) — the whole card is already an <a> (Link above),
              // and an anchor-inside-anchor is invalid HTML that breaks click targeting.
              <button
                type="button"
                className="adc__btn adc__btn--wa"
                onClick={() => window.open(buildWhatsAppUrl(property.whatsapp, property.name), '_blank', 'noopener,noreferrer')}
                aria-label="שאל בWhatsApp"
              >
                <MessageCircle size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
