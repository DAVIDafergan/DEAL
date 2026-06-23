import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { AgentDealSlide } from './AgentDealSlide.jsx';
import { VibeFilterMenu } from './VibeFilterMenu.jsx';
import { ALL_VIBES_KEY } from './vibeConstants.js';
import { LayoutDashboard, Radio } from 'lucide-react';

export function DealsTab({ vibe = ALL_VIBES_KEY, onChangeVibe }) {
  const { t } = useLanguage();
  const { agent, token, loading: authLoading } = useAgentAuth();
  const navigate = useNavigate();
  const [agentDeals, setAgentDeals] = useState(null);

  useEffect(() => {
    agentApi.getApprovedDeals()
      .then(({ deals }) => setAgentDeals(deals || []))
      .catch(() => setAgentDeals([]));
  }, []);

  const loading = agentDeals === null;

  return (
    <div className="vibe-feed-page">
      {/* Filter menu — top-left */}
      <div className="vibe-feed-page__filter-bar">
        <VibeFilterMenu activeVibe={vibe} onChange={onChangeVibe} />
      </div>

      {/* Auth buttons — top-right */}
      {!authLoading && (
        <div className="vibe-feed-page__auth-bar">
          {token && agent ? (
            <Link to="/agent/dashboard" className="vibe-auth-btn vibe-auth-btn--agent">
              <LayoutDashboard size={14} />
              <span className="vibe-auth-btn__name">{agent.business_name}</span>
            </Link>
          ) : (
            <>
              <button type="button" className="vibe-auth-btn vibe-auth-btn--ghost" onClick={() => navigate('/agent/login')}>
                {t.headerLoginButton || 'Login'}
              </button>
              <button type="button" className="vibe-auth-btn vibe-auth-btn--primary" onClick={() => navigate('/register')}>
                {t.headerRegisterButton || 'Register'}
              </button>
            </>
          )}
        </div>
      )}

      {loading && (
        <div className="vibe-feed-page--centered">
          <p>{t.feedLoadingMessage || 'Loading...'}</p>
        </div>
      )}

      {!loading && agentDeals.length === 0 && (
        <div className="vibe-feed-page--centered">
          <Radio size={48} strokeWidth={1} color="var(--color-text-muted)" style={{ marginBottom: 16 }} />
          <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: 0 }}>
            {t.agentDealsEmptyReel || 'No verified agent deals yet — check back soon!'}
          </p>
        </div>
      )}

      {!loading && agentDeals.length > 0 && (
        <div className="vibe-feed-page__scroller">
          {agentDeals.map((deal) => (
            <AgentDealSlide key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  );
}
