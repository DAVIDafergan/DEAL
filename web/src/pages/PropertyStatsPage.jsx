import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { ArrowLeft, Eye, MessageCircle, Phone, Share2, Heart, TrendingUp, TrendingDown } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { propertyApi } from '../api/client.js';
import { RouteLoading } from '../components/RouteLoading.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const METRICS = [
  { key: 'view', icon: Eye, labelKey: 'statsViews', primary: false },
  { key: 'whatsapp_click', icon: MessageCircle, labelKey: 'statsWhatsappClicks', primary: true },
  { key: 'call_click', icon: Phone, labelKey: 'statsCallClicks', primary: false },
  { key: 'share', icon: Share2, labelKey: 'statsShares', primary: false },
  { key: 'favorite', icon: Heart, labelKey: 'statsFavorites', primary: false },
];

/** PropertyStatsPage — 10.5 dedicated per-property stats page. WhatsApp clicks are called out
 * as "the" metric (marked primary below) — per spec, that's the real conversion event here,
 * everything else is funnel context around it. */
export function PropertyStatsPage() {
  const { t, dir } = useLanguage();
  const { id } = useParams();
  const { token, loading: authLoading } = useAgentAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) navigate('/owner/login', { replace: true });
  }, [authLoading, token, navigate]);

  useEffect(() => {
    if (!token) return;
    propertyApi.getStats(token, id, 30)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (authLoading || loading) return <RouteLoading />;
  if (!stats) return <div className="settings-page" dir={dir}><p className="agent-form__hint">{t.statsNoData}</p></div>;

  const maxDay = Math.max(1, ...stats.viewsByDay.map((d) => d.total));
  const totalSourceViews = stats.sources.search + stats.sources.direct + stats.sources.external;

  return (
    <div className="settings-page stats-page" dir={dir}>
      <div className="settings-page__header">
        <Link to="/owner/dashboard" className="settings-page__back"><ArrowLeft size={16} /> {t.statsBackToDashboard}</Link>
        <h1 className="settings-page__title">{t.statsPageTitle}</h1>
        <p className="agent-form__hint">{t.statsWindowLabel(stats.days)}</p>
      </div>

      <div className="container stats-metrics">
        {METRICS.map(({ key, icon: Icon, labelKey, primary }) => {
          const curr = stats.current[key];
          const pct = stats.changePct[key];
          return (
            <div key={key} className={`stats-metric-card${primary ? ' stats-metric-card--primary' : ''}`}>
              <div className="stats-metric-card__icon"><Icon size={20} /></div>
              <div className="stats-metric-card__value">{curr.total}</div>
              <div className="stats-metric-card__label">{t[labelKey]}</div>
              {key === 'view' && curr.total > 0 && <div className="stats-metric-card__sub">{t.statsUniqueViews(curr.unique)}</div>}
              {curr.total > 0 && (
                <div className={`stats-metric-card__change stats-metric-card__change--${pct >= 0 ? 'up' : 'down'}`}>
                  {pct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {t.statsVsLastPeriod(pct)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="container stats-section">
        <h2 className="pp__section-title">{t.statsViewsByDay}</h2>
        {stats.viewsByDay.length === 0 ? (
          <p className="agent-form__hint">{t.statsNoData}</p>
        ) : (
          <div className="stats-bar-chart">
            {stats.viewsByDay.map((d) => (
              <div key={d.day} className="stats-bar-chart__col" title={`${d.day}: ${d.total}`}>
                <div className="stats-bar-chart__bar" style={{ height: `${Math.max(4, (d.total / maxDay) * 100)}%` }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="container stats-section">
        <h2 className="pp__section-title">{t.statsSources}</h2>
        {totalSourceViews === 0 ? (
          <p className="agent-form__hint">{t.statsNoData}</p>
        ) : (
          <div className="stats-sources">
            {[
              ['search', t.statsSourceSearch],
              ['direct', t.statsSourceDirect],
              ['external', t.statsSourceExternal],
            ].map(([key, label]) => (
              <div key={key} className="stats-sources__row">
                <span className="stats-sources__label">{label}</span>
                <div className="stats-sources__bar-track">
                  <div className="stats-sources__bar-fill" style={{ width: `${(stats.sources[key] / totalSourceViews) * 100}%` }} />
                </div>
                <span className="stats-sources__count">{stats.sources[key]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
