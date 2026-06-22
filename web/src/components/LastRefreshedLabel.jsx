import { useLanguage } from '../context/LanguageContext.jsx';
import { useNow } from '../context/NowContext.jsx';

/** "רענון אחרון: XX דקות" — מתעדכן חי לפי שעון משותף (useNow), לא נתון קפוא מרגע הטעינה */
export function LastRefreshedLabel({ lastRefreshedAt }) {
  const { t } = useLanguage();
  const now = useNow();

  if (!lastRefreshedAt) return null;

  const minutesAgo = Math.floor((now - lastRefreshedAt) / 60000);

  return <p className="last-refreshed-label">{minutesAgo <= 0 ? t.lastRefreshedJustNow : t.lastRefreshedLabel(minutesAgo)}</p>;
}
