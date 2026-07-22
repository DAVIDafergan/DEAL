import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import {
  PlusCircle, Settings, LogOut, CheckCircle, XCircle, AlertTriangle, Clock,
  MessageCircle, LayoutDashboard, Trash2, Zap, Pencil, ShoppingBag, MousePointerClick,
} from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi } from '../api/client.js';
import { DealWizard } from '../components/agent/DealWizard.jsx';
import { OnboardingTour } from '../components/agent/OnboardingTour.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getGreeting } from '../utils/greeting.js';

const STATUS_ICON = {
  pending: <CheckCircle size={13} />,
  approved: <CheckCircle size={13} />,
  rejected: <XCircle size={13} />,
};

function isDealExpired(deal) {
  const today = new Date().toISOString().slice(0, 10);
  if (deal.expires_at && deal.expires_at < today) return true;
  if (deal.departure_date && deal.departure_date < today) return true;
  return false;
}

const cardAnim = {
  hidden: { opacity: 0, y: 16 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.35 } }),
};

// ── Daily tips ────────────────────────────────────────────────────────────────

const DAILY_TIPS = [
  'דילים עם תמונה איכותית מקבלים פי 2 קליקים — ודא שהווידאו שנבחר אוטומטית מתאים ליעד.',
  'ענה ב-WhatsApp תוך כמה דקות — לקוחות שמקבלים תגובה מהירה יותר נוטים להזמין.',
  'הוסף קישור לצפייה במלון — זה מעלה אמון ושיעור ההמרה של הדיל שלך.',
  'הגדר תבנית WhatsApp מותאמת אישית — כולל שם היעד ותאריכים — כך ההודעה הראשונה כבר מבינה.',
  'דילים עם תאריך חזרה ספציפי נמכרים טוב יותר מ"גמיש" — לקוחות מחפשים מסגרת ברורה.',
  'סמן דילים שנרכשו ("נרכש") — זה בונה אמינות ומראה לקוחות שהדיל עבד.',
  'דיל בלעדי (Exclusive) מוצג עם תג מיוחד — השתמש בו רק כשיש לך מחיר שלא ניתן למצוא אחרת.',
  'עדכן את מלאי הדילים שלך לפחות פעם בשבוע — דילים פגי תוקף פוגעים באמינות.',
  'הוסף תיאור קצר לדיל — משפט אחד שמסביר "מה מיוחד כאן" מייצר יותר קליקים.',
  'פרופיל עם לוגו ותיאור עסקי מלא מקבל פי 3 יצירות קשר מפרופיל ריק.',
];

function getDailyTip() {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
}

// ── KPI card ──────────────────────────────────────────────────────────────────

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

// ── Daily tip widget ──────────────────────────────────────────────────────────

function DailyTip() {
  return (
    <motion.div
      className="dash-daily-tip"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.35 }}
    >
      <span className="dash-daily-tip__icon" aria-hidden="true">💡</span>
      <div>
        <span className="dash-daily-tip__label">טיפ היום</span>
        <p className="dash-daily-tip__text">{getDailyTip()}</p>
      </div>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function AgentDashboardPage() {
  const { token, agent, loading, logout, refreshAgent } = useAgentAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !token) navigate('/agent/login', { replace: true });
  }, [loading, token, navigate]);

  // Show onboarding tour on first visit (once agent data is loaded)
  useEffect(() => {
    if (agent && !agent.has_seen_onboarding) {
      setShowOnboarding(true);
    }
  }, [agent]);

  function refreshDeals() {
    if (!token) return;
    agentApi.getDeals(token)
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => setDeals([]))
      .finally(() => setDealsLoading(false));
    agentApi.getMyStats(token)
      .then(s => setStats(s))
      .catch(() => {});
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
    notify(t.dealSubmittedMessage || 'הדיל פורסם!');
    refreshDeals();
  }

  function handleDealEdited() {
    setEditingDeal(null);
    notify('הדיל עודכן בהצלחה');
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

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await agentApi.deleteMe(token);
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      notify(err.message || 'שגיאה במחיקת החשבון', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  async function handleMarkPurchased(id) {
    try {
      const { purchase_count } = await agentApi.markPurchased(token, id);
      setDeals(prev => prev.map(d => d.id === id ? { ...d, purchase_count } : d));
      notify(`סומן כנרכש ✓ (${purchase_count})`);
    } catch (err) {
      notify(err.message || 'שגיאה', 'error');
    }
  }

  const handleOnboardingComplete = useCallback(async () => {
    setShowOnboarding(false);
    try {
      await agentApi.updateMe(token, { has_seen_onboarding: 1 });
      if (refreshAgent) refreshAgent();
    } catch {}
  }, [token, refreshAgent]);

  const activeDeals = deals.filter(d => d.status !== 'rejected' && !isDealExpired(d));
  const sortedDeals = [
    ...deals.filter(d => !isDealExpired(d)),
    ...deals.filter(d => isDealExpired(d)),
  ];
  const greeting = getGreeting(agent?.business_name || agent?.contact_name || '');

  if (loading) return (
    <div className="dash-loading">
      <motion.div className="dash-loading__spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} />
    </div>
  );

  return (
    <div className="dash-page" dir="rtl">
      {/* Onboarding tour */}
      {showOnboarding && <OnboardingTour onComplete={handleOnboardingComplete} />}

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

      {/* Page header */}
      <div className="dash-page-header container">
        <div className="dash-page-header__top">
          <div>
            <p className="dash-greeting">{greeting}</p>
            <h1 className="dash-page-title">
              {t.dashboardTitle || 'דשבורד סוכן'}
            </h1>
          </div>
          {agent?.status && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <span className={`dash-topbar__status dash-topbar__status--${agent.status}`}>
                {agent.status === 'approved' ? 'פעיל' : agent.status === 'pending' ? 'ממתין' : 'נדחה'}
              </span>
              {agent.has_seen_onboarding ? (
                <button
                  className="dash-replay-tour"
                  onClick={() => setShowOnboarding(true)}
                  title="הצג שוב את ההסבר"
                >
                  ▶ הסבר
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div id="onb-kpis" className="dash-kpis container">
        <KpiCard
          icon={Zap}
          label={t.dealsUsedLabel || 'דילים פעילים'}
          value={activeDeals.length}
          iconColor="#2563EB"
          iconBg="rgba(37,99,235,0.12)"
          index={0}
        />
        <KpiCard
          icon={ShoppingBag}
          label="נרכשו"
          value={stats?.total_purchases ?? 0}
          iconColor="#059669"
          iconBg="rgba(5,150,105,0.12)"
          index={1}
        />
        <KpiCard
          icon={MousePointerClick}
          label="קליקים"
          value={stats?.total_clicks ?? 0}
          iconColor="#f59e0b"
          iconBg="rgba(245,158,11,0.12)"
          index={2}
        />
      </div>

      {/* Daily tip */}
      <div className="container">
        <DailyTip />
      </div>

      {/* Quick actions */}
      <div className="dash-quick-actions container">
        <h3 className="dash-section-title">{t.quickActionsTitle || 'פעולות מהירות'}</h3>
        <div className="dash-quick-row">
          <motion.button
            id="onb-add-deal"
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
          <Link id="onb-settings" to="/agent/dashboard/settings" className="dash-quick-pill">
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

          <motion.button
            className="dash-quick-pill dash-quick-pill--danger"
            whileTap={{ scale: 0.97 }}
            onClick={() => setConfirmDelete(true)}
          >
            <span className="dash-quick-pill__dot"><Trash2 size={15} /></span>
            מחיקת חשבון
          </motion.button>
        </div>

        {/* Inline delete confirmation */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              className="dash-delete-confirm"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <AlertTriangle size={18} className="dash-delete-confirm__icon" />
              <span className="dash-delete-confirm__msg">
                כל הדילים והנתונים יימחקו לצמיתות. אי אפשר לשחזר.
              </span>
              <div className="dash-delete-confirm__btns">
                <button
                  className="dash-delete-confirm__btn dash-delete-confirm__btn--cancel"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  ביטול
                </button>
                <button
                  className="dash-delete-confirm__btn dash-delete-confirm__btn--confirm"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? 'מוחק…' : 'מחק לצמיתות'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Deals section */}
      <div id="onb-deals-list" className="dash-deals-panel container">
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
          {sortedDeals.map((deal, i) => {
            const expired = isDealExpired(deal);
            return (
            <motion.div
              key={deal.id}
              className={`dash-deal-card dash-deal-card--${deal.status}${expired ? ' dash-deal-card--expired' : ''}`}
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
                {(deal.purchase_count > 0) && (
                  <div className="dash-deal-purchased-badge">
                    <CheckCircle size={11} /> נרכש {deal.purchase_count > 1 ? `×${deal.purchase_count}` : ''}
                  </div>
                )}
                {deal.rejection_reason && (
                  <div className="dash-deal-card__rejection">{t.rejectedReasonLabel || 'סיבה'}: {deal.rejection_reason}</div>
                )}
              </div>
              <div className="dash-deal-card__right">
                <span className={`dash-deal-status${expired ? ' dash-deal-status--expired' : ` dash-deal-status--${deal.status}`}`}>
                  {expired ? <Clock size={13} /> : STATUS_ICON[deal.status]}
                  {expired ? 'פג תוקף' : deal.status === 'approved' ? 'מאושר' : deal.status === 'pending' ? 'ממתין' : 'נדחה'}
                </span>
                <span className="dash-deal-clicks"><MousePointerClick size={12} /> {deal.click_count}</span>
                {deal.whatsapp_override && <span className="dash-deal-wa"><MessageCircle size={12} /></span>}
                <motion.button
                  className="dash-deal-purchased-btn"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleMarkPurchased(deal.id)}
                  title="סמן כנרכש"
                >
                  <ShoppingBag size={13} />
                  <span className="dash-deal-btn-label">נרכש</span>
                </motion.button>
                <motion.button
                  className="dash-deal-edit"
                  whileTap={{ scale: 0.9 }}
                  onClick={e => { e.stopPropagation(); setEditingDeal(deal); }}
                  title="ערוך דיל"
                >
                  <Pencil size={14} />
                  <span className="dash-deal-btn-label">ערוך</span>
                </motion.button>
                <motion.button
                  className="dash-deal-delete"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteDeal(deal.id)}
                  title={t.deleteButton || 'מחק'}
                >
                  <Trash2 size={14} />
                  <span className="dash-deal-btn-label">מחק</span>
                </motion.button>
              </div>
            </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
