import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle, Settings, LogOut, CheckCircle, XCircle, TrendingUp,
  MessageCircle, Home, Zap, BarChart2, Trash2,
} from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi } from '../api/client.js';
import { DealWizard } from '../components/agent/DealWizard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const SHOW_SUBSCRIPTION = false;

const STATUS_ICON = {
  pending: <CheckCircle size={13} color="var(--color-text-muted)" />,
  approved: <CheckCircle size={13} color="var(--color-success,#22c55e)" />,
  rejected: <XCircle size={13} color="var(--color-error,#ef4444)" />,
};

const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

function StatCard({ icon: Icon, label, value, accent, index }) {
  return (
    <motion.div
      className="dash-stat-card"
      custom={index}
      variants={cardAnim}
      initial="hidden"
      animate="visible"
    >
      <div className={`dash-stat-card__icon-wrap${accent ? ' dash-stat-card__icon-wrap--accent' : ''}`}>
        <Icon size={20} />
      </div>
      <div>
        <div className="dash-stat-card__value">{value}</div>
        <div className="dash-stat-card__label">{label}</div>
      </div>
    </motion.div>
  );
}

export function AgentDashboardPage() {
  const { token, agent, loading, logout } = useAgentAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    if (!loading && !token) navigate('/agent/login', { replace: true });
  }, [loading, token, navigate]);

  useEffect(() => {
    if (!token) return;
    agentApi.getDeals(token)
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => setDeals([]))
      .finally(() => setDealsLoading(false));
  }, [token, showWizard]);

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  function handleDealAdded() {
    setShowWizard(false);
    notify(t.dealSubmittedMessage || 'הדיל הוגש לאישור!');
    agentApi.getDeals(token).then(({ deals: d }) => setDeals(d || [])).catch(() => {});
  }

  async function handleDeleteDeal(id) {
    if (!window.confirm(t.confirmDeleteDeal || 'למחוק את הדיל?')) return;
    try {
      await agentApi.deleteDeal(token, id);
      setDeals(prev => prev.filter(d => d.id !== id));
      notify(t.dealDeletedMessage || 'הדיל נמחק');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  const activeDeals = deals.filter(d => d.status !== 'rejected');
  const dealLimit = Infinity;

  if (loading) return (
    <div className="dash-loading">
      <motion.div className="dash-loading__spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
    </div>
  );

  return (
    <div className="dash-page" dir="rtl">
      {/* Wizard overlay */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            className="dash-wizard-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="dash-wizard-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            >
              <DealWizard onSuccess={handleDealAdded} onCancel={() => setShowWizard(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`dash-toast dash-toast--${notification.type}`}
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="dash-topbar">
        <Link to="/" className="dash-topbar__home" title="דף הבית">
          <Home size={18} />
        </Link>
        <div className="dash-topbar__center">
          <span className="dash-topbar__name">{agent?.business_name || 'דשבורד'}</span>
          <span className={`dash-topbar__status dash-topbar__status--${agent?.status}`}>
            {STATUS_ICON[agent?.status]} {agent?.status}
          </span>
        </div>
        <div className="dash-topbar__actions">
          <Link to="/agent/dashboard/settings" className="dash-topbar__btn" title={t.settingsLabel || 'הגדרות'}>
            <Settings size={18} />
          </Link>
          <button className="dash-topbar__btn" onClick={() => { logout(); navigate('/'); }} title={t.logoutButton || 'התנתקות'}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Rejected banner */}
      {agent?.status === 'rejected' && (
        <div className="dash-banner dash-banner--rejected">
          <XCircle size={16} />
          {t.rejectedBanner || 'החשבון שלך נדחה.'}{agent.rejection_reason ? ` סיבה: ${agent.rejection_reason}` : ''}
        </div>
      )}

      {/* Stat cards */}
      <div className="dash-stats container">
        <StatCard icon={Zap} label={t.dealsUsedLabel || 'דילים פעילים'} value={activeDeals.length} accent index={0} />
        <StatCard icon={BarChart2} label={t.leadsCountLabel || 'לידים החודש'} value={agent?.lead_count ?? 0} index={1} />
      </div>

      {/* Profile link */}
      {agent?.slug && (
        <div className="dash-profile-link container">
          <Link to={`/agent/${agent.slug}`} className="dash-profile-link__btn">
            {t.viewPublicProfileButton || 'צפה בפרופיל הציבורי שלך →'}
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="dash-tabs container">
        <div className="dash-tab is-active">
          {t.myDealsTitle || 'הדילים שלי'}
          {activeDeals.length > 0 && <span className="dash-tab__badge">{activeDeals.length}</span>}
        </div>
      </div>

      {/* Deals panel */}
      {true && (
        <div className="dash-deals-panel container">
          <div className="dash-deals-header">
            <h2 className="dash-deals-title">{t.myDealsTitle || 'הדילים שלי'}</h2>
            <motion.button
              className="dash-add-btn"
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowWizard(true)}
            >
              <PlusCircle size={16} /> {t.addDealButton || 'הוסף דיל'}
            </motion.button>
          </div>

          {dealsLoading && <p className="dash-empty">{t.loadingLabel || 'טוען…'}</p>}
          {!dealsLoading && deals.length === 0 && (
            <div className="dash-empty-state">
              <PlusCircle size={40} strokeWidth={1.2} color="var(--color-text-muted)" />
              <p>{t.noDealsYet || "אין עדיין דילים. לחצו 'הוסף דיל' כדי להתחיל."}</p>
            </div>
          )}

          <div className="dash-deals-list">
            {deals.map((deal, i) => (
              <motion.div
                key={deal.id}
                className={`dash-deal-card dash-deal-card--${deal.status}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                layout
              >
                {deal.photo_url && (
                  <img src={deal.photo_url} alt="" className="dash-deal-card__img" />
                )}
                <div className="dash-deal-card__body">
                  <div className="dash-deal-card__dest">{deal.destination_name || deal.destination}</div>
                  <div className="dash-deal-card__meta">
                    {deal.airline && <span>✈ {deal.airline}</span>}
                    {deal.departure_date && <span>📅 {new Date(deal.departure_date).toLocaleDateString('he-IL')}</span>}
                    {deal.hotel_name && <span>🏨 {deal.hotel_name}</span>}
                    {deal.car_type && <span>🚗 {deal.car_type}</span>}
                  </div>
                  <div className="dash-deal-card__price">{deal.price} {deal.currency}</div>
                  {deal.rejection_reason && (
                    <div className="dash-deal-card__rejection">{t.rejectedReasonLabel || 'סיבה'}: {deal.rejection_reason}</div>
                  )}
                </div>
                <div className="dash-deal-card__right">
                  <span className={`dash-deal-status dash-deal-status--${deal.status}`}>
                    {STATUS_ICON[deal.status]} {deal.status}
                  </span>
                  <span className="dash-deal-clicks"><TrendingUp size={12} /> {deal.click_count}</span>
                  {deal.whatsapp_override && <span className="dash-deal-wa"><MessageCircle size={12} /></span>}
                  <motion.button
                    className="dash-deal-delete"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteDeal(deal.id)}
                    title={t.deleteButton || 'מחק'}
                  >
                    <Trash2 size={14} />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
