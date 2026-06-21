import { useLanguage } from '../../context/LanguageContext.jsx';
import { useCountUp } from '../../hooks/useCountUp.js';

/** מונה דילים חיים עם אנימציית count-up — הרכיב הראשון שמתבקש "להרגיש חי" */
export function LiveDealsCounter({ count }) {
  const { t } = useLanguage();
  const animated = useCountUp(count);

  return (
    <div className="live-counter glass-panel">
      <span className="live-counter__dot" />
      <span className="live-counter__text">{t.liveCounterLabel(animated)}</span>
    </div>
  );
}
