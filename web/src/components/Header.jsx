import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { useNavigate, useLocation } from 'react-router-dom';
import { Link } from './LocalizedLink.jsx';
import { Heart, Menu, X, User, FileText, Home, Search } from 'lucide-react';
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

  const isHome = location.pathname === '/';

  useEffect(() => {
    function onScroll() { setScrolled(window.scrollY > 12); }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function onSearchVisible(e) { setShowHeaderSearch(!e.detail); }
    window.addEventListener('search-section-visible', onSearchVisible);
    return () => window.removeEventListener('search-section-visible', onSearchVisible);
  }, []);

  function handleHeaderSearchPillClick() {
    const searchEl = document.querySelector('.dsh');
    if (searchEl) searchEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
              aria-label={t.menuLabel}
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
                // 11.2: an owner's account button goes straight to their dashboard — the old
                // /account picker page in between was an extra, unnecessary click (see
                // DECISIONS.md 11.2). Travelers have no dashboard, so /account (favorites,
                // profile, logout, delete) stays their landing spot.
                <Link to={token && agent ? '/owner/dashboard' : '/account'} className="header-avatar-btn" aria-label={t.personalAreaLabel}>
                  <User size={20} />
                </Link>
              ) : (
                <button
                  className="header-auth-btn header-auth-btn--primary header-login-pill"
                  onClick={() => navigate('/owner/login')}
                >
                  {t.headerLoginButton}
                </button>
              )
            )}
          </div>

          {/* ── Logo (always) ───────────────────────────────────────────── */}
          <Link to="/" className="brand-block brand-block--link" onClick={closeMenu}>
            <Logo />
            <span className="brand-sub">{t.brandSub}</span>
          </Link>

          {/* ── Animated compact search — glides in from search section when scrolled past ── */}
          <AnimatePresence>
            {isHome && showHeaderSearch && !menuOpen && (
              <motion.button
                className="header-search-pill"
                onClick={handleHeaderSearchPillClick}
                aria-label={t.backToSearchLabel}
                initial={{ opacity: 0, y: -10, scale: 0.88 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.88 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                whileHover={{ scale: 1.02, boxShadow: '0 6px 28px rgba(37,99,235,0.22)' }}
                whileTap={{ scale: 0.97 }}
              >
                <Search size={14} className="header-search-pill__search-icon" />
                <span className="header-search-pill__text">{t.findMyVacationLabel}</span>
                <span className="header-search-pill__arrow">↓</span>
              </motion.button>
            )}
          </AnimatePresence>

          {/* ── Desktop right: user | vacation builder | language ───────── */}
          <div className="top-bar__desktop-right">
            {!loading && (
              token && agent ? (
                <Link to="/owner/dashboard" className="header-auth-btn header-auth-btn--ghost">
                  <User size={15} />
                  <span>{agent.contact_name || agent.business_name}</span>
                </Link>
              ) : traveler ? (
                <Link to="/account" className="header-auth-btn header-auth-btn--ghost">
                  <User size={15} />
                  <span>{traveler.name}</span>
                </Link>
              ) : (
                <button
                  className="header-auth-btn header-auth-btn--ghost"
                  onClick={() => navigate('/owner/login')}
                >
                  {t.headerLoginButton}
                </button>
              )
            )}
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
                <Home size={16} /> {t.homeLink}
              </Link>
              <div className="header-drawer__divider" />
              {token && agent && (
                <Link to="/my/favorites" className="header-drawer__item" onClick={closeMenu}>
                  <Heart size={15} /> {t.favoritesLink}
                </Link>
              )}
              <div className="header-drawer__lang-row">
                <span className="header-drawer__lang-label">{t.languageLabel}</span>
                <LanguageSwitcher />
              </div>
              <div className="header-drawer__divider" />
              <Link to="/contact" className="header-drawer__item header-drawer__item--muted" onClick={closeMenu}>
                <FileText size={15} /> {t.footerContact}
              </Link>
              <Link to="/terms" className="header-drawer__item header-drawer__item--muted" onClick={closeMenu}>
                <FileText size={15} /> {t.termsLink}
              </Link>
              <Link to="/privacy" className="header-drawer__item header-drawer__item--muted" onClick={closeMenu}>
                <FileText size={15} /> {t.privacyLink}
              </Link>
              {!loading && !token && (
                <button className="header-drawer__item" onClick={() => { navigate('/register'); closeMenu(); }}>
                  {t.footerOwnerRegister}
                </button>
              )}
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
