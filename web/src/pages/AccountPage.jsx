import { useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, LogOut, User, Trash2, Pencil, KeyRound, ListChecks, BellRing, X, Check } from 'lucide-react';
import { BackButton } from '../components/BackButton.jsx';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { useRecentlyViewed } from '../hooks/useRecentlyViewed.js';
import { getGreeting } from '../utils/greeting.js';
import { agentApi, userApi, alertApi } from '../api/client.js';
import { optimizedImageUrl } from '../utils/imageUrl.js';
import { getMyWishlists } from '../components/CreateWishlistModal.jsx';
import { RecentlyViewedStrip } from '../components/RecentlyViewedStrip.jsx';
import { RecentSearches } from '../components/RecentSearches.jsx';
import { listRecentSearches } from '../utils/recentSearches.js';
import { regionLabel } from '../data/propertyOptions.js';

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
  const { traveler, travelerToken, travelerLogout, updateTravelerProfile } = useTravelerAuth();
  const { t, dir } = useLanguage();
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 11.15 — personal area additions: edit name / change password, plus surfacing three things
  // that already existed as standalone localStorage utilities (wishlists, recently viewed,
  // recent searches) but had nowhere account-level to live, plus the customer's own alerts.
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [myWishlists] = useState(() => getMyWishlists());
  const recentlyViewedIds = useRecentlyViewed();
  const [recentSearches] = useState(() => listRecentSearches());
  const [myAlerts, setMyAlerts] = useState([]);

  useEffect(() => {
    if (!travelerToken) return;
    alertApi.getMine(travelerToken).then(({ alerts }) => setMyAlerts(alerts || [])).catch(() => setMyAlerts([]));
  }, [travelerToken]);

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
    navigate('/register/traveler/login?next=/account', { replace: true });
    return null;
  }

  const displayName = isAgent ? (agent.contact_name || agent.business_name) : traveler?.name || '';
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

  function startEditProfile() {
    setProfileName(displayName);
    setEditingProfile(true);
  }

  async function saveProfile() {
    if (!profileName.trim()) return;
    setSavingProfile(true);
    try {
      await userApi.updateProfile(travelerToken, profileName.trim());
      updateTravelerProfile({ name: profileName.trim() });
      setEditingProfile(false);
    } catch (err) {
      alert(err.message || t.accountEditError);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);
    try {
      await userApi.changePassword(travelerToken, currentPassword, newPassword);
      setPasswordSaved(true);
      setCurrentPassword('');
      setNewPassword('');
      setTimeout(() => { setPasswordSaved(false); setShowPasswordForm(false); }, 2000);
    } catch (err) {
      setPasswordError(err.message || t.accountPasswordError);
    } finally {
      setSavingPassword(false);
    }
  }

  async function cancelAlert(id) {
    try {
      await alertApi.deleteMine(travelerToken, id);
      setMyAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  function handlePickRecentSearch(s) {
    const params = new URLSearchParams();
    if (s.region) params.set('region', s.region);
    if (s.city) params.set('city', s.city);
    if (s.checkIn) params.set('checkin', s.checkIn);
    if (s.checkOut) params.set('checkout', s.checkOut);
    if (s.guests) params.set('guests', s.guests);
    navigate(`/?${params.toString()}`);
  }

  return (
    <div className="account-page container" dir={dir}>
      <BackButton />

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
        {isTraveler && !editingProfile && (
          <button type="button" className="account-edit-btn" onClick={startEditProfile} aria-label={t.accountEditProfile}>
            <Pencil size={15} />
          </button>
        )}
      </motion.div>

      {isTraveler && editingProfile && (
        <motion.div className="account-card" variants={cardIn} initial="hidden" animate="visible">
          <label className="account-form__label">{t.accountNameLabel}
            <input className="agent-form__input" value={profileName} onChange={(e) => setProfileName(e.target.value)} maxLength={120} />
          </label>
          <div className="account-form__actions">
            <button className="account-form__save" disabled={savingProfile || !profileName.trim()} onClick={saveProfile}>
              <Check size={15} /> {savingProfile ? t.accountSaving : t.accountSave}
            </button>
            <button className="account-form__cancel" onClick={() => setEditingProfile(false)}><X size={15} /> {t.cancelButton}</button>
          </div>
        </motion.div>
      )}

      {isTraveler && (
        <motion.div className="account-card" variants={cardIn} initial="hidden" animate="visible">
          <button type="button" className="account-card__section-toggle" onClick={() => setShowPasswordForm((s) => !s)}>
            <KeyRound size={18} /> {t.accountChangePassword}
          </button>
          {showPasswordForm && (
            <form className="account-form" onSubmit={savePassword}>
              <input type="password" className="agent-form__input" placeholder={t.accountCurrentPassword} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              <input type="password" className="agent-form__input" placeholder={t.accountNewPassword} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
              {passwordError && <p className="agent-form__error">{passwordError}</p>}
              <button type="submit" className="account-form__save" disabled={savingPassword}>
                {passwordSaved ? <><Check size={15} /> {t.accountSaved}</> : savingPassword ? t.accountSaving : t.accountSave}
              </button>
            </form>
          )}
        </motion.div>
      )}

      {isTraveler && myWishlists.length > 0 && (
        <motion.div className="account-card" variants={cardIn} initial="hidden" animate="visible">
          <h2 className="account-card__section-title"><ListChecks size={18} /> {t.accountMyCollections}</h2>
          <div className="wishlist-my-lists" style={{ padding: 0 }}>
            {myWishlists.map((w) => <Link key={w.token} to={`/list/${w.token}`} className="wishlist-my-lists__chip">{w.name}</Link>)}
          </div>
        </motion.div>
      )}

      {isTraveler && recentSearches.length > 0 && (
        <motion.div className="account-card" variants={cardIn} initial="hidden" animate="visible">
          <RecentSearches searches={recentSearches} onPick={handlePickRecentSearch} />
        </motion.div>
      )}

      {isTraveler && recentlyViewedIds.length > 0 && (
        <motion.div variants={cardIn} initial="hidden" animate="visible">
          <RecentlyViewedStrip propertyIds={recentlyViewedIds} />
        </motion.div>
      )}

      {isTraveler && myAlerts.length > 0 && (
        <motion.div className="account-card" variants={cardIn} initial="hidden" animate="visible">
          <h2 className="account-card__section-title"><BellRing size={18} /> {t.accountMyAlerts}</h2>
          {myAlerts.map((a) => (
            <div key={a.id} className="account-alert-row">
              <span>
                {a.region ? regionLabel(a.region, 'he') : t.accountAlertAnyRegion}
                {a.max_price ? ` · ${t.priceFromPrefix}${Math.round(a.max_price)} ₪` : ''}
                {a.check_in ? ` · ${new Date(a.check_in).toLocaleDateString('he-IL')}` : ''}
              </span>
              <button type="button" className="account-alert-row__cancel" onClick={() => cancelAlert(a.id)}><X size={14} /></button>
            </div>
          ))}
        </motion.div>
      )}

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
