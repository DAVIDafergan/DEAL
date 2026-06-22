import { useLanguage } from '../context/LanguageContext.jsx';

/**
 * UrgencyBanner — דחיפות אמיתית, לא מומצאת. "מחירי טיסות משתנים תוך דקות" הוא עיקרון אמיתי
 * וידוע בתעשייה (זה ממש מה שמנגנון ה-price-glow בכרטיסי הגריד מדגים), לא טענה ספציפית
 * לדיל הזה. "מחיר נכון ל-HH:MM" הוא שעון קבוע (לא מתקתק כמו "לפני X דק'") שמבוסס על
 * card.updatedAt האמיתי, בזמן המקומי של המשתמש (toLocaleTimeString בלי timeZone מפורש).
 * + הערת אמון: המחיר הסופי מאומת אצל הספק בפועל (לינק אמיתי, לא משהו שאנחנו קובעים).
 * **לא** טוען "X חדרים נותרו" — Hotellook לא מחזיר נתון מלאי/availability אמיתי.
 */
export function UrgencyBanner({ updatedAt }) {
  const { t } = useLanguage();
  const scannedTime = updatedAt
    ? new Date(updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="urgency-banner">
      <span>{t.urgencyPriceVolatility}</span>
      {scannedTime && <span className="urgency-banner__checked">{t.priceFreshnessLabel(scannedTime)}</span>}
      <span className="urgency-banner__trust">{t.priceTrustNote}</span>
    </div>
  );
}
