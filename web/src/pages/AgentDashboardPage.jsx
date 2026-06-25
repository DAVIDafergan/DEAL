import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  PlusCircle, Settings, LogOut, CheckCircle, XCircle, TrendingUp,
  MessageCircle, LayoutDashboard, Trash2, Zap, Pencil,
} from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi } from '../api/client.js';
import { DealWizard } from '../components/agent/DealWizard.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const STATUS_ICON = {
  pending: <CheckCircle size={13} />,
  approved: <CheckCircle size={13} />,
  rejected: <XCircle size={13} />,
};

const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

function KpiCard({ icon: Icon, label, value, iconColor, iconBg, index }) {
  return (
    <motion.div
      className="dash-kpi"
      custom={index}
      variants={cardAnim}
      initial="hidden"
      animate="visible"
    >
      <div className="dash-kpi__icon-box" style={{ background: iconBg, color: iconColor }}>
        <Icon size={24} />
      </div>
      <div className="dash-kpi__value">{value}</div>
      <div className="dash-kpi__label">{label}</div>
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
  const [editingDeal, setEditingDeal] = useState(null);

  useEffect(() => {
    if (!loading && !token) navigate('/agent/login', { replace: true });
  }, [loading, token, navigate]);

  function refreshDeals() {
    if (!token) return;
    agentApi.getDeals(token)
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => setDeals([]))
      .finally(() => setDealsLoading(false));
  }

  useEffect(() => {
    refreshDeals();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  function handleDealAdded() {
    setShowWizard(false);
    notify(t.dealSubmittedMessage || 'הדיל הוגש לאישור!');
    refreshDeals();
  }

  function handleDealEdited() {
    setEditingDeal(null);
    notify('הדיל עודכן ונשלח לאישור מחדש');
    refreshDeals();
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

  if (loading) return (
    <div className="dash-loading">
      <motion.div className="dash-loading__spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
    </div>
  );

  return (
    <div className="dash-page" dir="rtl">
      {/* Wizard overlay — new deal */}
      <AnimatePresence>
        {showWizard && (
          <motion.div className="dash-wizard-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="dash-wizard-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            >
              <DealWizard onSuccess={handleDealAdded} onCancel={() => setShowWizard(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard overlay — edit deal */}
      <AnimatePresence>
        {editingDeal && (
          <motion.div className="dash-wizard-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              className="dash-wizard-sheet"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            >
              <DealWizard
                initialData={editingDeal}
                dealId={editingDeal.id}
                onSuccess={handleDealEdited}
                onCancel={() => setEditingDeal(null)}
              />
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

      {/* Rejected banner */}
      {agent?.status === 'rejected' && (
        <div className="dash-banner dash-banner--rejected">
          <XCircle size={16} />
          {t.rejectedBanner || 'החשבון שלך נדחה.'}{agent.rejection_reason ? ` סיבה: ${agent.rejection_reason}` : ''}
        </div>
      )}

      {/* Page title */}
      <div className="dash-page-header container">
        <div className="dash-page-header__top">
          <div>
            <h1 className="dash-page-title">
              {t.dashboardTitle || 'דשבורד סוכן'}
            </h1>
            {agent?.business_name && (
              <p className="dash-page-sub">ברוך הבא, {agent.business_name}</p>
            )}
          </div>
          {agent?.status && (
            <span className={`dash-topbar__status dash-topbar__status--${agent.status}`}>
              {agent.status === 'approved' ? 'פעיל' : agent.status === 'pending' ? 'ממתין' : 'נדחה'}
            </span>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="dash-kpis container">
        <KpiCard
          icon={Zap}
          label={t.dealsUsedLabel || 'דילים פעילים'}
          value={activeDeals.length}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          index={0}
        />
        <KpiCard
          icon={TrendingUp}
          label={t.leadsCountLabel || 'לידים החודש'}
          value={agent?.lead_count ?? 0}
          iconColor="#059669"
          iconBg="rgba(5,150,105,0.12)"
          index={1}
        />
      </div>

      {/* Quick actions */}
      <div className="dash-quick-actions container">
        <h3 className="dash-section-title">{t.quickActionsTitle || 'פעולות מהירות'}</h3>
        <div className="dash-quick-row">
          <motion.button
            className="dash-quick-pill dash-quick-pill--primary"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowWizard(true)}
          >
            <span className="dash-quick-pill__dot"><PlusCircle size={15} /></span>
            {t.addDealButton || 'הוסף דיל'}
          </motion.button>
          {agent?.slug && (
            <Link to={`/agent/${agent.slug}`} className="dash-quick-pill">
              <span className="dash-quick-pill__dot"><LayoutDashboard size={15} /></span>
              {t.viewPublicProfileButton || 'פרופיל ציבורי'}
            </Link>
          )}
          <Link to="/agent/dashboard/settings" className="dash-quick-pill">
            <span className="dash-quick-pill__dot"><Settings size={15} /></span>
            {t.settingsLink || 'הגדרות'}
          </Link>
          <motion.button
            className="dash-quick-pill dash-quick-pill--ghost"
            whileTap={{ scale: 0.97 }}
            onClick={() => { logout(); navigate('/'); }}
          >
            <span className="dash-quick-pill__dot"><LogOut size={15} /></span>
            {t.logoutButton || 'התנתקות'}
          </motion.button>
        </div>
      </div>

      {/* Deals section */}
      <div className="dash-deals-panel container">
        <div className="dash-deals-header">
          <h3 className="dash-section-title" style={{ margin: 0 }}>
            {t.myDealsTitle || 'הדילים שלי'}
            {activeDeals.length > 0 && (
              <span className="dash-tab__badge" style={{ marginRight: 8 }}>{activeDeals.length}</span>
            )}
          </h3>
        </div>

        {dealsLoading && <p className="dash-empty">{t.loadingLabel || 'טוען…'}</p>}
        {!dealsLoading && deals.length === 0 && (
          <div className="dash-empty-state">
            <PlusCircle size={40} strokeWidth={1.2} />
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
                </div>
                <div className="dash-deal-card__price">{deal.price} {deal.currency}</div>
                {deal.rejection_reason && (
                  <div className="dash-deal-card__rejection">{t.rejectedReasonLabel || 'סיבה'}: {deal.rejection_reason}</div>
                )}
              </div>
              <div className="dash-deal-card__right">
                <span className={`dash-deal-status dash-deal-status--${deal.status}`}>
                  {STATUS_ICON[deal.status]}
                  {deal.status === 'approved' ? 'מאושר' : deal.status === 'pending' ? 'ממתין' : 'נדחה'}
                </span>
                <span className="dash-deal-clicks"><TrendingUp size={12} /> {deal.click_count}</span>
                {deal.whatsapp_override && <span className="dash-deal-wa"><MessageCircle size={12} /></span>}
                <motion.button
                  className="dash-deal-edit"
                  whileTap={{ scale: 0.9 }}
                  onClick={e => { e.stopPropagation(); setEditingDeal(deal); }}
                  title="ערוך דיל"
                >
                  <Pencil size={14} />
                </motion.button>
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
    </div>
  );
}
