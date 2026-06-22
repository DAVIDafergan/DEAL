import { useLanguage } from '../context/LanguageContext.jsx';
import { useNow } from '../context/NowContext.jsx';

/**
 * UrgencyBanner — דחיפות אמיתית, לא מומצאת. "מחירי טיסות משתנים תוך דקות" הוא עיקרון אמיתי
 * וידוע בתעשייה (זה ממש מה שמנגנון ה-price-glow בכרטיסי הגריד מדגים), לא טענה ספציפית
 * לדיל הזה. "נבדק לפני X דק'" מבוסס על card.updatedAt האמיתי. **לא** טוען "X חדרים נותרו" —
 * Hotellook (sources/hotellookClient.js) לא מחזיר נתון מלאי/availability אמיתי, רק priceFrom,
 * אז אין לנו נתון אמיתי שתומך בטענת מלאי כזו.
 */
export function UrgencyBanner({ updatedAt }) {
  const { t } = useLanguage();
  const now = useNow();
  const minutesAgo = updatedAt ? Math.max(0, Math.floor((now - new Date(updatedAt).getTime()) / 60000)) : null;

  return (
    <div className="urgency-banner">
      <span>{t.urgencyPriceVolatility}</span>
      {minutesAgo !== null && <span className="urgency-banner__checked">{t.urgencyLastChecked(minutesAgo)}</span>}
    </div>
  );
}
