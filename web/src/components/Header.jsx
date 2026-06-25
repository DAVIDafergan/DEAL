import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, LogOut, Heart, Menu, X, User, FileText, Compass, Home, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header({ reels = false, activeTab = 'home' }) {
  const { t } = useLanguage();
  const { agent, token, loading } = useAgentAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function closeMenu() { setMenuOpen(false); }

  return (
    <div className={`top-bar-wrapper${reels ? ' top-bar-wrapper--reels' : ''}${scrolled && !reels ? ' top-bar-wrapper--scrolled' : ''}`}>
      <header className="top-bar">
        <div className="container top-bar__inner">

          {/* ── Mobile left: hamburger + login/avatar ───────────────────── */}
          <div className="top-bar__mobile-left">
            <button
              className="header-hamburger"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="תפריט"
            >
              <AnimatePresence mode="wait" initial={false}>
                {menuOpen ? (
                  <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
                    <X size={22} />
                  </motion.span>
                ) : (
                  <motion.span key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}>
                    <Menu size={22} />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            {!loading && (
              token && agent ? (
                <Link to="/account" className="header-avatar-btn" aria-label="אזור אישי">
                  <User size={20} />
                </Link>
              ) : (
                <button
                  className="header-auth-btn header-auth-btn--primary header-login-pill"
                  onClick={() => navigate('/agent/login')}
                >
                  {t.headerLoginButton || 'התחברות'}
                </button>
              )
            )}
          </div>

          {/* ── Logo (always) ───────────────────────────────────────────── */}
          <Link to="/" className="brand-block brand-block--link" onClick={closeMenu}>
            <Logo />
            <span className="brand-sub">{t.brandSub}</span>
          </Link>

          {/* ── Desktop right: user | vacation builder | language ───────── */}
          <div className="top-bar__desktop-right">
            {!loading && (
              token && agent ? (
                <Link to="/account" className="header-auth-btn header-auth-btn--ghost">
                  <User size={15} />
                  <span>{agent.business_name}</span>
                </Link>
              ) : (
                <button
                  className="header-auth-btn header-auth-btn--ghost"
                  onClick={() => navigate('/agent/login')}
                >
                  {t.headerLoginButton || 'התחברות'}
                </button>
              )
            )}
            <Link to="/plan" className="header-auth-btn header-auth-btn--ghost" title="בניית חופשה">
              <Compass size={14} />
              <span>{t.buildVacationLink || 'בניית חופשה'}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      {/* ── Hamburger drawer ────────────────────────────────────────────── */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="header-backdrop" onClick={closeMenu} />
            <motion.nav
              className="header-drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <Link to="/" className={`header-drawer__item${activeTab === 'home' ? ' header-drawer__item--active' : ''}`} onClick={closeMenu}>
                <Home size={16} /> {t.homeLink || 'דף הבית'}
              </Link>
              <Link to="/reels" className={`header-drawer__item${activeTab === 'deals' ? ' header-drawer__item--active' : ''}`} onClick={closeMenu}>
                <Play size={16} /> {t.dealsLink || 'פיד דילים'}
              </Link>
              <Link to="/plan" className={`header-drawer__item${activeTab === 'plan' ? ' header-drawer__item--active' : ''}`} onClick={closeMenu}>
                <Compass size={16} /> {t.buildVacationLink || 'בניית חופשה'}
              </Link>
              <div className="header-drawer__divider" />
              {token && agent && (
                <Link to="/my/favorites" className="header-drawer__item" onClick={closeMenu}>
                  <Heart size={15} /> {t.favoritesLink || 'המועדפים שלי'}
                </Link>
              )}
              <div className="header-drawer__lang-row">
                <span className="header-drawer__lang-label">{t.languageLabel || 'שפה'}</span>
                <LanguageSwitcher />
              </div>
              <div className="header-drawer__divider" />
              <Link to="/terms" className="header-drawer__item header-drawer__item--muted" onClick={closeMenu}>
                <FileText size={15} /> {t.termsLink || 'תנאי שימוש'}
              </Link>
              <Link to="/privacy" className="header-drawer__item header-drawer__item--muted" onClick={closeMenu}>
                <FileText size={15} /> {t.privacyLink || 'מדיניות פרטיות'}
              </Link>
              {!loading && !token && (
                <button className="header-drawer__item" onClick={() => { navigate('/register'); closeMenu(); }}>
                  {t.registerLink || 'הרשמת סוכן'}
                </button>
              )}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
