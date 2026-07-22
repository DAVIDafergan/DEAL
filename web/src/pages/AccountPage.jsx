import { useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, LogOut, ArrowLeft, User, Trash2 } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { getGreeting } from '../utils/greeting.js';
import { agentApi, userApi } from '../api/client.js';
import { optimizedImageUrl } from '../utils/imageUrl.js';

const cardIn = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

export function AccountPage() {
  const { agent, token, loading, logout: agentLogout } = useAgentAuth();
  const { traveler, travelerToken, travelerLogout } = useTravelerAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAgent = !loading && token && agent;
  const isTraveler = !isAgent && !!traveler;

  // 11.2: this page is now traveler-only — an owner landing here (an old bookmark, a direct
  // URL) goes straight to the consolidated dashboard instead of a picker screen (DECISIONS.md
  // 11.2).
  if (isAgent) {
    navigate('/owner/dashboard', { replace: true });
    return null;
  }

  if (!loading && !isTraveler) {
    navigate('/owner/login', { replace: true });
    return null;
  }

  const displayName = isAgent ? agent.business_name : traveler?.name || '';
  const displayEmail = isAgent ? agent.email : traveler?.email || '';
  const greeting = getGreeting(displayName);

  function handleLogout() {
    if (isAgent) agentLogout();
    else travelerLogout();
    navigate('/');
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      if (isAgent) {
        await agentApi.deleteMe(token);
        agentLogout();
      } else {
        await userApi.deleteMe(travelerToken);
        travelerLogout();
      }
      navigate('/', { replace: true });
    } catch (err) {
      alert(err.message || t.accountDeleteError);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="account-page container" dir={dir}>
      <Link to="/" className="account-page__back">
        <ArrowLeft size={14} />
        {t.backButton}
      </Link>

      {/* Greeting */}
      <p className="account-greeting">{greeting}</p>

      {/* Profile card */}
      <motion.div
        className="account-card account-card--profile"
        variants={cardIn}
        initial="hidden"
        animate="visible"
      >
        <div className="account-avatar">
          {isAgent && agent?.logo_url
            ? <img src={optimizedImageUrl(agent.logo_url, { width: 120 })} alt={agent.business_name} className="account-avatar__img" />
            : <div className="account-avatar__placeholder">
                <User size={32} />
              </div>
          }
        </div>
        <div className="account-profile-info">
          <h1 className="account-profile-name">{displayName || '...'}</h1>
          <p className="account-profile-email">{displayEmail}</p>
          {isTraveler && <span className="account-profile-badge">{t.accountTravelerBadge}</span>}
          {isAgent && <span className="account-profile-badge account-profile-badge--agent">{agent.account_type === 'property_owner' ? t.accountOwnerBadge : t.accountAgentBadge}</span>}
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
              <span className="account-card__label">{t.favoritesLink}</span>
              <span className="account-card__sub">{t.savedPropertiesCount(favorites.length)}</span>
            </div>
          </Link>
        </motion.div>

        {isTraveler && (
          <motion.div variants={cardIn}>
            <Link to="/register/traveler" className="account-card account-card--action">
              <div className="account-card__icon account-card__icon--dash">
                <User size={22} />
              </div>
              <div className="account-card__text">
                <span className="account-card__label">{t.travelerAgentPrompt}</span>
                <span className="account-card__sub">{t.travelerAgentPromptSub}</span>
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
              <span className="account-card__label">{t.logoutButton}</span>
            </div>
          </button>
        </motion.div>

        {/* Delete account */}
        <motion.div variants={cardIn}>
          {!confirmDelete ? (
            <button
              className="account-card account-card--action account-card--delete"
              onClick={() => setConfirmDelete(true)}
            >
              <div className="account-card__icon account-card__icon--delete">
                <Trash2 size={22} />
              </div>
              <div className="account-card__text">
                <span className="account-card__label">{t.deleteAccountLabel}</span>
                <span className="account-card__sub">{t.deleteAccountSub}</span>
              </div>
            </button>
          ) : (
            <div className="account-delete-confirm">
              <p className="account-delete-confirm__msg">
                {t.deleteAccountConfirmMsg}
              </p>
              <div className="account-delete-confirm__btns">
                <button
                  className="account-delete-confirm__btn account-delete-confirm__btn--cancel"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  {t.cancelButton}
                </button>
                <button
                  className="account-delete-confirm__btn account-delete-confirm__btn--confirm"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? t.deletingButton : t.deleteForeverButton}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
