import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, LayoutDashboard, LogOut, ArrowLeft, User, Settings } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

const cardIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

export function AccountPage() {
  const { agent, token, loading, logout } = useAgentAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { favorites } = useFavorites();

  if (!loading && !token) {
    navigate('/agent/login', { replace: true });
    return null;
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="account-page container" dir="rtl">
      {/* Back */}
      <Link to="/" className="account-page__back">
        <ArrowLeft size={14} />
        {t.backToFeedButton || 'חזרה'}
      </Link>

      {/* Profile card */}
      <motion.div
        className="account-card account-card--profile"
        variants={cardIn}
        initial="hidden"
        animate="visible"
      >
        <div className="account-avatar">
          {agent?.logo_url
            ? <img src={agent.logo_url} alt={agent.business_name} className="account-avatar__img" />
            : <div className="account-avatar__placeholder">
                <User size={32} />
              </div>
          }
        </div>
        <div className="account-profile-info">
          <h1 className="account-profile-name">{agent?.business_name || '...'}</h1>
          <p className="account-profile-email">{agent?.email || ''}</p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div className="account-actions" variants={container} initial="hidden" animate="visible">
        <motion.div variants={cardIn}>
          <Link to="/my/favorites" className="account-card account-card--action">
            <div className="account-card__icon account-card__icon--fav">
              <Heart size={22} />
            </div>
            <div className="account-card__text">
              <span className="account-card__label">{t.favoritesLink || 'המועדפים שלי'}</span>
              <span className="account-card__sub">{favorites.length} {t.savedDeals || 'דילים שמורים'}</span>
            </div>
          </Link>
        </motion.div>

        {agent && (
          <motion.div variants={cardIn}>
            <Link to="/agent/dashboard" className="account-card account-card--action">
              <div className="account-card__icon account-card__icon--dash">
                <LayoutDashboard size={22} />
              </div>
              <div className="account-card__text">
                <span className="account-card__label">{t.dashboardLink || 'דשבורד סוכן'}</span>
                <span className="account-card__sub">{t.manageDealsSub || 'ניהול דילים ופרופיל'}</span>
              </div>
            </Link>
          </motion.div>
        )}

        {agent && (
          <motion.div variants={cardIn}>
            <Link to="/agent/dashboard/settings" className="account-card account-card--action">
              <div className="account-card__icon account-card__icon--settings">
                <Settings size={22} />
              </div>
              <div className="account-card__text">
                <span className="account-card__label">{t.settingsLink || 'הגדרות פרופיל'}</span>
                <span className="account-card__sub">{t.editProfileSub || 'עריכת פרטים ותמונה'}</span>
              </div>
            </Link>
          </motion.div>
        )}

        <motion.div variants={cardIn}>
          <button className="account-card account-card--action account-card--logout" onClick={handleLogout}>
            <div className="account-card__icon account-card__icon--logout">
              <LogOut size={22} />
            </div>
            <div className="account-card__text">
              <span className="account-card__label">{t.logoutButton || 'התנתקות'}</span>
            </div>
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
