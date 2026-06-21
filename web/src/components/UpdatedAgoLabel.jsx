import { useLanguage } from '../context/LanguageContext.jsx';
import { useNow } from '../context/NowContext.jsx';
import { computeElapsed } from '../utils/countdown.js';

/** "עודכן לפני X" לדילי live_price — מתעדכן בכל רענון סריקה, בלי חלון תפוגה (לא רלוונטי לסוג הזה) */
export function UpdatedAgoLabel({ updatedAt, className = '' }) {
  const { t } = useLanguage();
  const now = useNow();
  const { hours, minutes } = computeElapsed(updatedAt, now);

  return (
    <span className={`updated-ago ${className}`}>
      {hours === 0 && minutes === 0 ? t.updatedJustNow : t.updatedAgoLabel(hours, minutes)}
    </span>
  );
}
