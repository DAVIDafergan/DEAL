import { useLanguage } from '../context/LanguageContext.jsx';
import { useCountUp } from '../hooks/useCountUp.js';

function StatCard({ value, suffix = '', label }) {
  const animated = useCountUp(value);
  return (
    <div className="stat-card">
      <div className="stat-card__value">
        {animated}
        {suffix}
      </div>
      <div className="stat-card__label">{label}</div>
    </div>
  );
}

export function StatsBar({ stats }) {
  const { t } = useLanguage();

  if (!stats) return null;

  return (
    <div className="stats-bar">
      <StatCard value={stats.dealsSent} label={t.statsDealsSent} />
      <StatCard value={stats.averageSavingsPercent} suffix="%" label={t.statsAvgSavings} />
    </div>
  );
}
