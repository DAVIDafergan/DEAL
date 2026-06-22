import { useLanguage } from '../context/LanguageContext.jsx';
import { buildHotelUrl, buildCarRentalUrl, buildEsimUrl, getHotelStayDates } from '../utils/packageLinks.js';

function BedIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 18v2M21 18v2M3 13h18" strokeLinecap="round" />
      <circle cx="7" cy="9.5" r="1.4" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 16l1.4-4.8A2 2 0 0 1 7.3 9.7h9.4a2 2 0 0 1 1.9 1.5L20 16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 16h18v2.5a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1V18h-11v.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V16Z" />
      <circle cx="7" cy="16.5" r="1.2" />
      <circle cx="17" cy="16.5" r="1.2" />
    </svg>
  );
}

function SimIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M7 3h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" strokeLinejoin="round" />
      <path d="M9 13h6M9 16h6M9 10h2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * PackageBuilder — "בנה את החופשה שלך": צ'ק-ליסט עם הטיסה (כבר נבחרה) ולינקים נפרדים
 * למלון/רכב/eSIM באמצעות Travelpayouts, כל אחד עם ה-Marker. כל רכיב הוא הזמנה נפרדת
 * אצל הספק שלו — לא רכישה אחת מאוחדת (ראו ה-disclaimer בתחתית).
 * תוכן בלבד, בלי אנימציית כניסה משלו — נטען עכשיו תמיד בתוך BuyPackageDialog שכבר מאנימט
 * את עצמו (modal), כדי לא לקבל אנימציה כפולה.
 */
export function PackageBuilder({ deal, packageConfig }) {
  const { t } = useLanguage();
  const marker = packageConfig?.travelpayoutsMarker;

  const hotelUrl = buildHotelUrl(deal, marker);
  const carUrl = buildCarRentalUrl(deal, marker, packageConfig?.carRentalUrlTemplate);
  const esimUrl = buildEsimUrl(deal, marker, packageConfig?.esimUrlTemplate);
  const { isEstimate: isHotelDatesEstimate } = getHotelStayDates(deal);

  if (!marker) return null;

  return (
    <div className="package-builder">
      <p className="package-builder__title">{t.packageBuilderTitle}</p>

      <ul className="package-builder__list">
        <li className="package-builder__item package-builder__item--done">
          <span className="package-builder__check">✓</span>
          <span>{t.packageFlightLabel}</span>
        </li>

        {hotelUrl && (
          <li className="package-builder__item">
            <span className="package-builder__icon">
              <BedIcon />
            </span>
            <a href={hotelUrl} target="_blank" rel="noopener noreferrer" className="package-builder__link">
              {t.packageHotelButton}
            </a>
            {isHotelDatesEstimate && <span className="package-builder__note">{t.packageHotelDatesNote}</span>}
          </li>
        )}

        {carUrl && (
          <li className="package-builder__item">
            <span className="package-builder__icon">
              <CarIcon />
            </span>
            <a href={carUrl} target="_blank" rel="noopener noreferrer" className="package-builder__link">
              {t.packageCarButton}
            </a>
          </li>
        )}

        {esimUrl && (
          <li className="package-builder__item">
            <span className="package-builder__icon">
              <SimIcon />
            </span>
            <a href={esimUrl} target="_blank" rel="noopener noreferrer" className="package-builder__link">
              {t.packageEsimButton}
            </a>
          </li>
        )}
      </ul>

      <p className="package-builder__disclaimer">{t.packageDisclaimer}</p>
    </div>
  );
}
