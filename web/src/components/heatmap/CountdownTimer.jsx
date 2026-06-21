import { useLanguage } from '../../context/LanguageContext.jsx';
import { useNow } from '../../context/NowContext.jsx';
import { computeCountdown } from '../../utils/countdown.js';

/** טיימר ספירה לאחור חי, מבוסס על שעון מתקתק משותף (useNow) כדי שכל הטיימרים יתעדכנו יחד */
export function CountdownTimer({ createdAt, className = '' }) {
  const { t } = useLanguage();
  const now = useNow();
  const { isExpired, hours, minutes } = computeCountdown(createdAt, now);

  return (
    <div className={`countdown-timer ${className}`}>
      <span className="countdown-timer__value">
        {isExpired ? t.countdownExpired : t.countdownLabel(hours, minutes)}
      </span>
      {!isExpired && <span className="countdown-timer__note">{t.countdownEstimateNote}</span>}
    </div>
  );
}
