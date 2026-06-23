import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, Settings, LogOut, CheckCircle, Clock, XCircle, TrendingUp, MessageCircle } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { agentApi, billingApi } from '../api/client.js';
import { AddDealForm } from '../components/agent/AddDealForm.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const STATUS_ICON = {
  pending: <Clock size={14} color="var(--color-warning,#f59e0b)" />,
  approved: <CheckCircle size={14} color="var(--color-success,#22c55e)" />,
  rejected: <XCircle size={14} color="var(--color-error,#ef4444)" />,
};

const TIER_BADGE = { basic: '🥉 Basic', pro: '🥈 Pro', unlimited: '🥇 Unlimited' };

export function AgentDashboardPage() {
  const { token, agent, loading, logout } = useAgentAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [deals, setDeals] = useState([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [plans, setPlans] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!loading && !token) navigate('/agent/register', { replace: true });
  }, [loading, token, navigate]);

  useEffect(() => {
    if (!token) return;
    agentApi.getDeals(token)
      .then(({ deals: d }) => setDeals(d || []))
      .catch(() => setDeals([]))
      .finally(() => setDealsLoading(false));
    billingApi.getPlans()
      .then(({ plans: p }) => setPlans(p || []))
      .catch(() => {});
  }, [token, showAddForm]);

  async function handleCheckout(tier) {
    setCheckoutLoading(tier);
    try {
      const { url } = await billingApi.checkout(token, tier);
      window.location.href = url;
    } catch (err) {
      notify(err.message, 'error');
      setCheckoutLoading(null);
    }
  }

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }

  function handleDealAdded() {
    setShowAddForm(false);
    notify(t.dealSubmittedMessage || 'Deal submitted for review!');
    agentApi.getDeals(token).then(({ deals: d }) => setDeals(d || [])).catch(() => {});
  }

  async function handleDeleteDeal(id) {
    if (!window.confirm(t.confirmDeleteDeal || 'Delete this deal?')) return;
    try {
      await agentApi.deleteDeal(token, id);
      setDeals(prev => prev.filter(d => d.id !== id));
      notify(t.dealDeletedMessage || 'Deal deleted');
    } catch (err) {
      notify(err.message, 'error');
    }
  }

  const tierLimits = { basic: 5, pro: 20, unlimited: Infinity };
  const activeDeals = deals.filter(d => d.status !== 'rejected');
  const dealLimit = agent ? (tierLimits[agent.subscription_tier] ?? 5) : 5;
  const isApproved = agent?.status === 'approved';

  if (loading) return <div className="agent-page agent-page--loading">Loading…</div>;

  return (
    <div className="agent-page">
      <AnimatePresence>
        {notification && (
          <motion.div
            className={`agent-page__notification agent-page__notification--${notification.type}`}
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          >
            {notification.msg}
          </motion.div>
        )}
      </AnimatePresence>

      <header className="agent-page__header">
        <div>
          <h1 className="agent-page__title">{agent?.business_name || 'Dashboard'}</h1>
          <span className={`agent-status-badge agent-status-badge--${agent?.status}`}>
            {STATUS_ICON[agent?.status]} {agent?.status}
          </span>
        </div>
        <div className="agent-page__header-actions">
          <Link to="/agent/dashboard/settings" className="agent-page__icon-btn" title={t.settingsLabel || 'Settings'}>
            <Settings size={20} />
          </Link>
          <button className="agent-page__icon-btn" onClick={() => { logout(); navigate('/'); }} title={t.logoutButton || 'Logout'}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Status banner for pending */}
      {agent?.status === 'pending' && (
        <div className="agent-page__banner agent-page__banner--pending">
          <Clock size={16} /> {t.pendingApprovalBanner || 'Your account is pending approval. Deals you add now will be queued.'}
        </div>
      )}

      {/* Subscription card */}
      <section className="agent-page__section">
        <h2 className="agent-page__section-title">{t.subscriptionTitle || 'Subscription'}</h2>
        <div className="agent-sub-card">
          <div className="agent-sub-card__tier">{TIER_BADGE[agent?.subscription_tier] || 'Basic'}</div>
          <div className="agent-sub-card__status">{t.subscriptionStatusLabel || 'Status'}: <strong>{agent?.subscription_status}</strong></div>
          {agent?.subscription_expires_at && (
            <div className="agent-sub-card__expires">{t.expiresLabel || 'Renews'}: {new Date(agent.subscription_expires_at).toLocaleDateString()}</div>
          )}
          <div className="agent-sub-card__usage">
            {t.dealsUsedLabel || 'Deals'}: {activeDeals.length} / {dealLimit === Infinity ? '∞' : dealLimit}
          </div>
          <div className="agent-sub-card__plans">
            {plans.map(plan => (
              <motion.button
                key={plan.id}
                className={`agent-sub-card__plan-btn${agent?.subscription_tier === plan.id ? ' is-current' : ''}`}
                disabled={agent?.subscription_tier === plan.id || checkoutLoading === plan.id || !plan.stripeConfigured}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleCheckout(plan.id)}
                title={!plan.stripeConfigured ? 'Stripe not configured' : ''}
              >
                {plan.label} — ₪{plan.price}/{t.monthLabel || 'mo'}
                {plan.dealsLimit ? ` (${plan.dealsLimit} ${t.dealsLabel || 'deals'})` : ` (${t.unlimitedLabel || 'unlimited'})`}
              </motion.button>
            ))}
          </div>
        </div>
        <p className="agent-page__leads-note">
          <TrendingUp size={14} /> {t.leadsCountLabel || 'Leads sent to you this month'}: <strong>{agent?.lead_count ?? 0}</strong>
        </p>
      </section>

      {/* Deals section */}
      <section className="agent-page__section">
        <div className="agent-page__section-header">
          <h2 className="agent-page__section-title">{t.myDealsTitle || 'My deals'}</h2>
          <motion.button
            className="agent-page__add-btn"
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowAddForm(true)}
            disabled={activeDeals.length >= dealLimit}
          >
            <PlusCircle size={16} /> {t.addDealButton || 'Add deal'}
          </motion.button>
        </div>

        <AnimatePresence>
          {showAddForm && (
            <motion.div
              className="agent-page__form-overlay"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            >
              <AddDealForm onSuccess={handleDealAdded} onCancel={() => setShowAddForm(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {dealsLoading && <p className="agent-page__loading">{t.loadingLabel || 'Loading…'}</p>}
        {!dealsLoading && deals.length === 0 && (
          <p className="agent-page__empty">{t.noDealsYet || "No deals yet. Click 'Add deal' to get started."}</p>
        )}

        <div className="agent-deals-list">
          {deals.map(deal => (
            <motion.div
              key={deal.id}
              className={`agent-deal-row agent-deal-row--${deal.status}`}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {deal.photo_url && <img src={deal.photo_url} alt="" className="agent-deal-row__thumb" />}
              <div className="agent-deal-row__info">
                <span className="agent-deal-row__dest">{deal.destination_name || deal.destination}</span>
                <span className="agent-deal-row__date">{deal.departure_date}</span>
                <span className="agent-deal-row__price">{deal.price} {deal.currency}</span>
                {deal.rejection_reason && (
                  <span className="agent-deal-row__rejection">{t.rejectedReasonLabel || 'Reason'}: {deal.rejection_reason}</span>
                )}
              </div>
              <div className="agent-deal-row__meta">
                <span className="agent-deal-row__status">{STATUS_ICON[deal.status]} {deal.status}</span>
                <span className="agent-deal-row__clicks"><TrendingUp size={12} /> {deal.click_count}</span>
                {deal.whatsapp_override && (
                  <span className="agent-deal-row__wa" title={deal.whatsapp_override}><MessageCircle size={12} /></span>
                )}
              </div>
              <button
                className="agent-deal-row__delete"
                onClick={() => handleDeleteDeal(deal.id)}
                title={t.deleteButton || 'Delete'}
              >×</button>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="agent-page__profile-link">
        {isApproved && agent?.slug && (
          <Link to={`/agent/${agent.slug}`} className="agent-page__view-profile">
            {t.viewPublicProfileButton || 'View my public profile →'}
          </Link>
        )}
      </div>
    </div>
  );
}
