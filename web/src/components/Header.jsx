import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, LogOut, Heart, Menu, X, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header() {
  const { t } = useLanguage();
  const { agent, token, loading, logout } = useAgentAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  function closeAll() {
    setMenuOpen(false);
    setAvatarOpen(false);
  }

  return (
    <div className="top-bar-wrapper">
      <header className="top-bar">
        <div className="container top-bar__inner">
          <div className="brand-block">
            <Logo />
            <span className="brand-sub">{t.brandSub}</span>
          </div>

          {/* Desktop: all actions visible */}
          <div className="top-bar__actions top-bar__desktop-actions">
            <Link to="/my/favorites" className="header-fav-btn" title="המועדפים שלי">
              <Heart size={17} />
            </Link>
            <LanguageSwitcher />
            {!loading && (
              token && agent ? (
                <>
                  <Link to="/agent/dashboard" className="header-auth-btn header-auth-btn--dashboard">
                    <LayoutDashboard size={14} />
                    <span className="header-auth-btn__name">{agent.business_name}</span>
                  </Link>
                  <button
                    className="header-auth-btn header-auth-btn--ghost"
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

          {/* Mobile: login pill (always) or avatar (logged in) + hamburger */}
          <div className="top-bar__actions top-bar__mobile-actions">
            {!loading && (
              token && agent ? (
                <div className="header-avatar-wrap">
                  <button
                    className="header-avatar-btn"
                    onClick={() => setAvatarOpen(v => !v)}
                    aria-label="פרופיל"
                  >
                    <User size={20} />
                  </button>
                  <AnimatePresence>
                    {avatarOpen && (
                      <>
                        <div className="header-backdrop" onClick={closeAll} />
                        <motion.div
                          className="header-avatar-menu"
                          initial={{ opacity: 0, scale: 0.95, y: -6 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -6 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Link to="/agent/dashboard" className="header-avatar-menu__item" onClick={closeAll}>
                            <LayoutDashboard size={15} />
                            {t.dashboardLink || 'דשבורד'}
                          </Link>
                          <Link to="/my/favorites" className="header-avatar-menu__item" onClick={closeAll}>
                            <Heart size={15} />
                            המועדפים שלי
                          </Link>
                          <button
                            className="header-avatar-menu__item header-avatar-menu__item--danger"
                            onClick={() => { logout(); navigate('/'); closeAll(); }}
                          >
                            <LogOut size={15} />
                            {t.logoutButton || 'התנתקות'}
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  className="header-auth-btn header-auth-btn--primary header-login-pill"
                  onClick={() => navigate('/agent/login')}
                >
                  {t.headerLoginButton || 'התחברות'}
                </button>
              )
            )}
            <button
              className="header-hamburger"
              onClick={() => { setMenuOpen(v => !v); setAvatarOpen(false); }}
              aria-label="תפריט"
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span
                    key="x"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex' }}
                  >
                    <X size={22} />
                  </motion.span>
                ) : (
                  <motion.span
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ display: 'flex' }}
                  >
                    <Menu size={22} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </header>

      {/* Hamburger drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="header-backdrop" onClick={closeAll} />
            <motion.nav
              className="header-drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Link to="/my/favorites" className="header-drawer__item" onClick={closeAll}>
                <Heart size={16} />
                המועדפים שלי
              </Link>
              <div className="header-drawer__lang">
                <LanguageSwitcher />
              </div>
              {!loading && !token && (
                <button
                  className="header-drawer__item"
                  onClick={() => { navigate('/register'); closeAll(); }}
                >
                  הרשמה
                </button>
              )}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
