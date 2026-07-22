import { Users, BedDouble, MessageCircle, Phone } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency.js';
import { unitAmenityLabel } from '../../data/propertyOptions.js';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { optimizedImageUrl } from '../../utils/imageUrl.js';
import { buildPropertyWhatsAppUrl, buildTelUrl } from '../../utils/contactLinks.js';

/** PropertyUnitsTable — 9.4 "טבלת יחידות", the Booking-style heart of the property page: one
 * row per bookable unit with photo/name/capacity/rooms/unique amenities/price, and (10.4) a
 * WhatsApp/call pair scoped to that specific unit instead of a "book" button — the message
 * names the unit so the owner knows exactly which one the guest is asking about.
 * A CSS grid "table" (not a literal <table>) so it can collapse into stacked cards on mobile
 * without the usual table-responsiveness fight. */
export function PropertyUnitsTable({ units, currency, selectedUnitId, onSelectUnit, propertyName, propertyPhone, propertyWhatsapp, pageUrl }) {
  const { t, lang } = useLanguage();
  return (
    <div className="ut" role="table" aria-label={t.ppUnitsTitle}>
      <div className="ut__head" role="row">
        <span role="columnheader">{t.utUnitCol}</span>
        <span role="columnheader">{t.utCapacityCol}</span>
        <span role="columnheader">{t.filterAmenities}</span>
        <span role="columnheader">{t.utPriceCol}</span>
        <span role="columnheader" aria-hidden="true" />
      </div>

      {units.map((unit) => {
        const isSelected = unit.id === selectedUnitId;
        const amenities = unit.unit_amenities || [];
        const image = unit.images?.[0] || null;
        const waUrl = buildPropertyWhatsAppUrl({
          whatsapp: propertyWhatsapp, phone: propertyPhone, propertyName, unitName: unit.name, pageUrl, t,
        });
        const telUrl = buildTelUrl(propertyPhone);
        return (
          <div key={unit.id} className={`ut__row${isSelected ? ' ut__row--selected' : ''}`} role="row" onClick={() => onSelectUnit(unit.id)}>
            <div className="ut__unit" role="cell">
              <div className="ut__unit-media">
                {image ? <img src={optimizedImageUrl(image, { width: 160 })} alt="" loading="lazy" /> : <div className="ut__unit-media-placeholder" />}
              </div>
              <div>
                <div className="ut__unit-name">{unit.name}</div>
                {unit.description && <div className="ut__unit-desc">{unit.description}</div>}
              </div>
            </div>

            <div className="ut__meta" role="cell" data-label={t.utCapacityCol}>
              {unit.max_guests && <span><Users size={13} /> {unit.max_guests}</span>}
              {unit.bedrooms && <span><BedDouble size={13} /> {unit.bedrooms}</span>}
            </div>

            <div className="ut__amenities" role="cell" data-label={t.filterAmenities}>
              {amenities.length > 0 ? amenities.map((a) => unitAmenityLabel(a, lang)).join(' · ') : '—'}
            </div>

            <div className="ut__price" role="cell" data-label={t.utPriceCol}>
              {unit.base_price_night ? (
                <>
                  <strong>{Math.round(unit.base_price_night)} {getCurrencySymbol(currency)}</strong>
                  <span>{t.perNightLabel}</span>
                </>
              ) : (
                <span className="ut__price-inquire">{t.priceOnRequest}</span>
              )}
            </div>

            <div className="ut__action" role="cell" onClick={(e) => e.stopPropagation()}>
              {waUrl && (
                <a className="ut__contact-btn ut__contact-btn--wa" href={waUrl} target="_blank" rel="noopener noreferrer" aria-label={t.contactUnitWhatsApp}>
                  <MessageCircle size={15} />
                </a>
              )}
              {telUrl && (
                <a className="ut__contact-btn ut__contact-btn--call" href={telUrl} aria-label={t.contactUnitCall}>
                  <Phone size={15} />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
