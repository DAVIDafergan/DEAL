import { useLanguage } from '../context/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, LogOut, Heart } from 'lucide-react';

export function Header() {
  const { t } = useLanguage();
  const { agent, token, loading, logout } = useAgentAuth();
  const navigate = useNavigate();

  return (
    <header className="top-bar">
      <div className="container top-bar__inner">
        <div className="brand-block">
          <Logo />
          <span className="brand-sub">{t.brandSub}</span>
        </div>
        <div className="top-bar__actions">
          <Link to="/my/favorites" className="header-fav-btn" title="המועדפים שלי">
            <Heart size={17} />
          </Link>
          <LanguageSwitcher />
          {!loading && (
            token && agent ? (
              <>
                <Link to="/agent/dashboard" className="header-auth-btn header-auth-btn--dashboard" title={t.dashboardLink || 'Dashboard'}>
                  <LayoutDashboard size={14} />
                  <span className="header-auth-btn__name">{agent.business_name}</span>
                </Link>
                <button
                  className="header-auth-btn header-auth-btn--ghost"
                  title={t.logoutButton || 'Logout'}
                  onClick={() => { logout(); navigate('/'); }}
                >
                  <LogOut size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="header-auth-btn header-auth-btn--ghost"
                  onClick={() => navigate('/agent/login')}
                >
                  {t.headerLoginButton || 'Login'}
                </button>
                <button
                  className="header-auth-btn header-auth-btn--primary"
                  onClick={() => navigate('/register')}
                >
                  {t.headerRegisterButton || 'Register'}
                </button>
              </>
            )
          )}
        </div>
      </div>
    </header>
  );
}
