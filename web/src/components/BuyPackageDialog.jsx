import { useLanguage } from '../context/LanguageContext.jsx';
import { BundleModal } from './BundleModal.jsx';
import { buildHotelUrl, buildCarRentalUrl, buildEsimUrl } from '../utils/packageLinks.js';

/**
 * BuyPackageDialog — בונה את רשימת הפריטים (טיסה + כל לינק נוסף שיש לו URL אמיתי: מלון/רכב/
 * eSIM) ומעביר ל-BundleModal הגנרי, עם breakdown: טיסה (מחיר אמיתי, כבר מוצג על הכרטיס),
 * מלון רק אם יש מחיר אמיתי (דילי ה-grid הם טיסה בודדת — בפועל hotelTotalPrice לא קיים להם
 * בכלל, אז השורה לא תוצג), ורכב/eSIM כשורות "הערכה" בלי מחיר (ראו DealBreakdown.jsx).
 */
export function BuyPackageDialog({ deal, packageConfig, onClose }) {
  const { t } = useLanguage();
  const marker = packageConfig?.travelpayoutsMarker;

  if (!marker) return null;

  const hotelUrl = buildHotelUrl(deal, marker);
  const carUrl = buildCarRentalUrl(deal, marker, packageConfig?.carRentalUrlTemplate);
  const esimUrl = buildEsimUrl(deal, marker, packageConfig?.esimUrlTemplate);

  const items = [
    deal.bookingUrl && { key: 'flight', icon: '✈️', labelKey: 'packageFlightLabel', url: deal.bookingUrl },
    hotelUrl && { key: 'hotel', icon: '🏨', labelKey: 'packageHotelButton', url: hotelUrl },
    carUrl && { key: 'car', icon: '🚗', labelKey: 'packageCarButton', url: carUrl },
    esimUrl && { key: 'esim', icon: '📱', labelKey: 'packageEsimButton', url: esimUrl },
  ].filter(Boolean);

  const breakdown = {
    flightPrice: deal.price,
    hotelName: null,
    hotelTotalPrice: null,
    hotelStars: null,
    currency: deal.currency,
    totalPrice: deal.price,
    pricePerPerson: deal.price,
    peopleCount: 1,
    hasCarOption: Boolean(carUrl),
    hasEsimOption: Boolean(esimUrl),
  };

  const flightForValidation = deal.bookingUrl
    ? { origin: deal.origin, destination: deal.destination, departureDate: deal.departureDate, returnDate: deal.returnDate || null, price: deal.price }
    : null;

  return (
    <BundleModal
      title={t.buyPackageButton}
      breakdown={breakdown}
      items={items}
      onClose={onClose}
      flightForValidation={flightForValidation}
    />
  );
}
