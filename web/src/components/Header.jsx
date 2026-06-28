import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, Heart, Menu, X, User, FileText, Compass, Home, Play, Search, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Header({ reels = false, activeTab = 'home' }) {
  const { t } = useLanguage();
  const { agent, token, loading } = useAgentAuth();
  const { traveler } = useTravelerAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  const [headerSearchExpanded, setHeaderSearchExpanded] = useState(false);
  const [headerSearchVal, setHeaderSearchVal] = useState('');
  const headerSearchInputRef = useRef(null);

  const isHome = location.pathname === '/';

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onSearchVisible(e) {
      setShowHeaderSearch(!e.detail);
      if (e.detail) { setHeaderSearchExpanded(false); }
    }
    window.addEventListener('search-section-visible', onSearchVisible);
    return () => window.removeEventListener('search-section-visible', onSearchVisible);
  }, []);

  useEffect(() => {
    if (headerSearchExpanded) {
      setTimeout(() => headerSearchInputRef.current?.focus(), 80);
    }
  }, [headerSearchExpanded]);

  function handleHeaderSearchSubmit(e) {
    e.preventDefault();
    setHeaderSearchExpanded(false);
    // Dispatch search event and scroll to deals section
    window.dispatchEvent(new CustomEvent('header-search-submit', { detail: headerSearchVal }));
    setHeaderSearchVal('');
  }

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
              (token && agent) || traveler ? (
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

          {/* ── Animated compact search (visible when scrolled past search section on home) ── */}
          <AnimatePresence>
            {isHome && showHeaderSearch && !menuOpen && (
              <motion.div
                className={`header-search-pill${headerSearchExpanded ? ' header-search-pill--expanded' : ''}`}
                initial={{ opacity: 0, scaleX: 0.7, y: -4 }}
                animate={{ opacity: 1, scaleX: 1, y: 0 }}
                exit={{ opacity: 0, scaleX: 0.7, y: -4 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <AnimatePresence mode="wait">
                  {headerSearchExpanded ? (
                    <motion.form
                      key="expanded"
                      className="header-search-pill__form"
                      onSubmit={handleHeaderSearchSubmit}
                      initial={{ opacity: 0, width: 120 }}
                      animate={{ opacity: 1, width: '100%' }}
                      exit={{ opacity: 0, width: 120 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      dir="rtl"
                    >
                      <MapPin size={14} className="header-search-pill__icon" />
                      <input
                        ref={headerSearchInputRef}
                        className="header-search-pill__input"
                        value={headerSearchVal}
                        onChange={e => setHeaderSearchVal(e.target.value)}
                        placeholder="לאן בא לך לטוס?"
                        aria-label="חיפוש יעד"
                      />
                      <button type="submit" className="header-search-pill__go" aria-label="חפש">
                        <Search size={14} />
                      </button>
                      <button type="button" className="header-search-pill__close" onClick={() => setHeaderSearchExpanded(false)} aria-label="סגור">
                        <X size={13} />
                      </button>
                    </motion.form>
                  ) : (
                    <motion.button
                      key="collapsed"
                      className="header-search-pill__collapsed"
                      onClick={() => setHeaderSearchExpanded(true)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      aria-label="פתח חיפוש"
                    >
                      <Search size={14} />
                      <span>חפש דיל…</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Desktop right: user | vacation builder | language ───────── */}
          <div className="top-bar__desktop-right">
            {!loading && (
              token && agent ? (
                <Link to="/account" className="header-auth-btn header-auth-btn--ghost">
                  <User size={15} />
                  <span>{agent.business_name}</span>
                </Link>
              ) : traveler ? (
                <Link to="/account" className="header-auth-btn header-auth-btn--ghost">
                  <User size={15} />
                  <span>{traveler.name}</span>
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
              <Link to="/contact" className="header-drawer__item header-drawer__item--muted" onClick={closeMenu}>
                <FileText size={15} /> צור קשר
              </Link>
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
