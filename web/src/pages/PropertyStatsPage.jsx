import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Eye, MessageCircle, Phone, Share2, Heart, TrendingUp, TrendingDown } from 'lucide-react';
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

/** PropertyStatsPanel — 11.2: extracted from what used to be the standalone PropertyStatsPage
 * route (10.5), now rendered inside the dashboard's "Statistics" tab for a given propertyId
 * (see DECISIONS.md 11.2). WhatsApp clicks are called out as "the" metric (marked primary
 * below) — per spec, that's the real conversion event here, everything else is funnel context. */
export function PropertyStatsPanel({ propertyId, token }) {
  const { t, dir } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !propertyId) return;
    setLoading(true);
    propertyApi.getStats(token, propertyId, 30)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [token, propertyId]);

  if (loading) return <RouteLoading />;
  if (!stats) return <div className="settings-page settings-page--embedded" dir={dir}><p className="agent-form__hint">{t.statsNoData}</p></div>;

  const maxDay = Math.max(1, ...stats.viewsByDay.map((d) => d.total));
  const totalSourceViews = stats.sources.search + stats.sources.direct + stats.sources.external;

  return (
    <div className="settings-page settings-page--embedded stats-page" dir={dir}>
      <div className="settings-page__header settings-page__header--embedded">
        <h2 className="settings-page__title">{t.statsPageTitle}</h2>
        <p className="agent-form__hint">{t.statsWindowLabel(stats.days)}</p>
      </div>

      <div className="stats-metrics">
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

      <div className="stats-section">
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

      <div className="stats-section">
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

/** The old standalone route (/owner/dashboard/stats/:id) now just redirects into the
 * consolidated dashboard's Statistics tab — kept so existing bookmarks/links don't break. */
export function PropertyStatsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  useEffect(() => { navigate(`/owner/dashboard?tab=stats&property=${id}`, { replace: true }); }, [navigate, id]);
  return null;
}
