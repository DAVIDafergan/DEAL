import { useLanguage } from '../context/LanguageContext.jsx';
import { BundleModal } from './BundleModal.jsx';
import { buildHotelUrl, buildCarRentalUrl, buildEsimUrl } from '../utils/packageLinks.js';

/**
 * BuyPackageDialog — בונה את רשימת הפריטים (טיסה + כל לינק נוסף שיש לו URL אמיתי: מלון/רכב/
 * eSIM) ומעביר ל-BundleModal הגנרי. בלי breakdown כאן בכוונה: דילי ה-grid (anomaly/live_price)
 * הם טיסה בודדת — יש לנו רק מחיר טיסה אמיתי (כבר מוצג על הכרטיס), אין לנו מחיר מלון אמיתי
 * כדי להציג total הגיוני שמשלב את שניהם, אז לא בונים breakdown מזויף. ה-breakdown האמיתי
 * (טיסה+מלון, שני המחירים אמיתיים) קיים רק בפיד הווייב — ראו web/src/vibe/DealSlide.jsx.
 */
export function BuyPackageDialog({ deal, packageConfig, onClose }) {
  const { t } = useLanguage();
  const marker = packageConfig?.travelpayoutsMarker;

  if (!marker) return null;

  const hotelUrl = buildHotelUrl(deal, marker);
  const carUrl = buildCarRentalUrl(deal, marker, packageConfig?.carRentalUrlTemplate);
  const esimUrl = buildEsimUrl(deal, marker, packageConfig?.esimUrlTemplate);

  const items = [
    deal.bookingUrl && { key: 'flight', icon: '✈️', labelKey: 'packageFlightLabel', url: deal.bookingUrl, color: 'blue' },
    hotelUrl && { key: 'hotel', icon: '🏨', labelKey: 'packageHotelButton', url: hotelUrl, color: 'green' },
    carUrl && { key: 'car', icon: '🚗', labelKey: 'packageCarButton', url: carUrl, color: 'orange' },
    esimUrl && { key: 'esim', icon: '📱', labelKey: 'packageEsimButton', url: esimUrl, color: 'purple' },
  ].filter(Boolean);

  return <BundleModal title={t.buyPackageButton} items={items} onClose={onClose} />;
}
