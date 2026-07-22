import { RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

/** FreshnessBadge — 10.7: "the biggest pain point in this market is stale availability
 * calendars." Only rendered when the property actually has an availability update within the
 * last 60 days (older than that isn't a selling point, it's silence — showing nothing reads
 * better than "updated 4 months ago"). */
export function FreshnessBadge({ updatedAt, className = '' }) {
  const { t } = useLanguage();
  if (!updatedAt) return null;
  const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (24 * 60 * 60 * 1000));
  if (days > 60) return null;
  let label;
  if (days <= 0) label = t.freshnessToday;
  else if (days === 1) label = t.freshnessYesterday;
  else if (days < 14) label = t.freshnessDaysAgo(days);
  else label = t.freshnessWeeksAgo(Math.round(days / 7));

  return (
    <span className={`freshness-badge ${className}`}>
      <RefreshCw size={11} /> {label}
    </span>
  );
}
