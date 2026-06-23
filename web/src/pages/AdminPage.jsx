import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Eye, RefreshCw, ArrowLeft, Trash2, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client.js';

const ADMIN_PW = 'open';
const AGENTS_PER_PAGE = 25;

function DealPreview({ deal }) {
  return (
    <div className="admin-deal-preview">
      {deal.photo_url && <img src={deal.photo_url} alt="" className="admin-deal-preview__img" />}
      <div className="admin-deal-preview__info">
        <strong>{deal.destination_name || deal.destination}</strong>
        <span>{deal.departure_date}{deal.return_date ? ` → ${deal.return_date}` : ''}</span>
        <span>{deal.price} {deal.currency}</span>
        {deal.purchase_link && <a href={deal.purchase_link} target="_blank" rel="noopener noreferrer"><Eye size={12} /> צפה בלינק</a>}
        <span>סוכן: {deal.business_name}</span>
        {deal.airline && <span>✈ {deal.airline}</span>}
        {deal.hotel_name && <span>🏨 {deal.hotel_name}{deal.hotel_stars ? ` ${'★'.repeat(Number(deal.hotel_stars))}` : ''}</span>}
        {deal.car_type && <span>🚗 {deal.car_type}{deal.car_company ? ` · ${deal.car_company}` : ''}</span>}
        {deal.quality_score !== null && <span>איכות: {Number(deal.quality_score).toFixed(1)}%</span>}
        {deal.value_score !== null && <span>ערך: {Number(deal.value_score).toFixed(1)}% מהממוצע</span>}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button
        className="admin-pagination__btn"
        disabled={page === 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronRight size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          className={`admin-pagination__btn${p === page ? ' is-active' : ''}`}
          onClick={() => onPage(p)}
        >
          {p}
        </button>
      ))}
      <button
        className="admin-pagination__btn"
        disabled={page === totalPages}
        onClick={() => onPage(page + 1)}
      >
        <ChevronLeft size={16} />
      </button>
    </div>
  );
}

export function AdminPage() {
  const [tab, setTab] = useState('pending-agents');
  const [pendingAgents, setPendingAgents] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [pendingDeals, setPendingDeals] = useState([]);
  const [approvedDeals, setApprovedDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [notification, setNotification] = useState(null);
  const [agentsPage, setAgentsPage] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const [{ agents: pending }, { agents: all }, { deals: pDeals }, { deals: aDeals }] = await Promise.all([
        adminApi.getPendingAgents(ADMIN_PW),
        adminApi.getAllAgents(ADMIN_PW),
        adminApi.getPendingDeals(ADMIN_PW),
        adminApi.getApprovedDeals(ADMIN_PW),
      ]);
      setPendingAgents(pending || []);
      setAllAgents(all || []);
      setPendingDeals(pDeals || []);
      setApprovedDeals(aDeals || []);
    } catch (err) {
      notify(err.message || 'שגיאה בטעינה', 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function approveAgent(id) {
    try {
      await adminApi.approveAgent(ADMIN_PW, id);
      notify('הסוכן אושר ✓');
      setPendingAgents(prev => prev.filter(a => a.id !== id));
      setAllAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function rejectAgent(id) {
    try {
      await adminApi.rejectAgent(ADMIN_PW, id, rejectReason);
      notify('הסוכן נדחה');
      setPendingAgents(prev => prev.filter(a => a.id !== id));
      setAllAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
      setRejectId(null); setRejectReason('');
    } catch (err) { notify(err.message, 'error'); }
  }

  async function approveDeal(id) {
    try {
      await adminApi.approveDeal(ADMIN_PW, id);
      notify('הדיל אושר ✓');
      setPendingDeals(prev => prev.filter(d => d.id !== id));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function rejectDeal(id) {
    try {
      await adminApi.rejectDeal(ADMIN_PW, id, rejectReason);
      notify('הדיל נדחה');
      setPendingDeals(prev => prev.filter(d => d.id !== id));
      setRejectId(null); setRejectReason('');
    } catch (err) { notify(err.message, 'error'); }
  }

  async function deleteDeal(id) {
    try {
      await adminApi.deleteDeal(ADMIN_PW, id);
      notify('הדיל נמחק');
      setApprovedDeals(prev => prev.filter(d => d.id !== id));
      setDeleteConfirmId(null);
    } catch (err) { notify(err.message, 'error'); }
  }

  function startReject(id, target) {
    setRejectId(id); setRejectTarget(target); setRejectReason('');
  }

  const totalAgentsPages = Math.ceil(allAgents.length / AGENTS_PER_PAGE);
  const pagedAgents = allAgents.slice((agentsPage - 1) * AGENTS_PER_PAGE, agentsPage * AGENTS_PER_PAGE);

  function statusLabel(s) {
    if (s === 'approved') return { label: 'מאושר', cls: 'admin-status--approved' };
    if (s === 'rejected') return { label: 'נדחה', cls: 'admin-status--rejected' };
    return { label: 'ממתין', cls: 'admin-status--pending' };
  }

  return (
    <div className="admin-page" dir="rtl">
      {notification && (
        <div className={`admin-page__notification admin-page__notification--${notification.type}`}>{notification.msg}</div>
      )}

      <div className="admin-page__header">
        <Link to="/" className="admin-page__back-btn">
          <ArrowLeft size={18} /> דף הבית
        </Link>
        <h1>פאנל ניהול</h1>
        <button className="admin-page__refresh" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tabs__btn${tab === 'pending-agents' ? ' is-active' : ''}`} onClick={() => setTab('pending-agents')}>
          סוכנים ממתינים {pendingAgents.length > 0 && <span className="admin-tabs__badge">{pendingAgents.length}</span>}
        </button>
        <button className={`admin-tabs__btn${tab === 'all-agents' ? ' is-active' : ''}`} onClick={() => setTab('all-agents')}>
          כל הסוכנים {allAgents.length > 0 && <span className="admin-tabs__badge admin-tabs__badge--neutral">{allAgents.length}</span>}
        </button>
        <button className={`admin-tabs__btn${tab === 'pending-deals' ? ' is-active' : ''}`} onClick={() => setTab('pending-deals')}>
          דילים ממתינים {pendingDeals.length > 0 && <span className="admin-tabs__badge">{pendingDeals.length}</span>}
        </button>
        <button className={`admin-tabs__btn${tab === 'active-deals' ? ' is-active' : ''}`} onClick={() => setTab('active-deals')}>
          דילים פעילים {approvedDeals.length > 0 && <span className="admin-tabs__badge admin-tabs__badge--neutral">{approvedDeals.length}</span>}
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>טוען…</p>}

      {/* Pending agents */}
      {!loading && tab === 'pending-agents' && (
        <div className="admin-list">
          {pendingAgents.length === 0 && <p className="admin-list__empty">אין סוכנים ממתינים</p>}
          {pendingAgents.map(agent => (
            <div key={agent.id} className="admin-row">
              <div className="admin-row__info">
                <strong>{agent.business_name}</strong>
                <span>{agent.contact_name} · {agent.email}</span>
                {agent.phone && <span>{agent.phone}</span>}
                {agent.license_number && <span>רישיון: {agent.license_number}</span>}
                <span className="admin-row__date">{new Date(agent.created_at).toLocaleDateString('he-IL')}</span>
              </div>
              <div className="admin-row__actions">
                <motion.button className="admin-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approveAgent(agent.id)}>
                  <CheckCircle size={16} /> אשר
                </motion.button>
                <motion.button className="admin-row__reject" whileTap={{ scale: 0.97 }} onClick={() => startReject(agent.id, 'agent')}>
                  <XCircle size={16} /> דחה
                </motion.button>
              </div>
              {rejectId === agent.id && rejectTarget === 'agent' && (
                <div className="admin-row__reject-form">
                  <input className="admin-row__reject-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="סיבה (אופציונלי)" autoFocus />
                  <button className="admin-row__reject-confirm" onClick={() => rejectAgent(agent.id)}>אשר דחייה</button>
                  <button onClick={() => setRejectId(null)}>ביטול</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* All agents */}
      {!loading && tab === 'all-agents' && (
        <div className="admin-list">
          {allAgents.length === 0 && <p className="admin-list__empty">אין סוכנים</p>}
          {pagedAgents.map(agent => {
            const { label, cls } = statusLabel(agent.status);
            const isExpanded = selectedAgent === agent.id;
            return (
              <div key={agent.id} className="admin-row admin-row--clickable" onClick={() => setSelectedAgent(isExpanded ? null : agent.id)}>
                <div className="admin-row__info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} style={{ opacity: 0.5 }} />
                    <strong>{agent.business_name}</strong>
                    <span className={`admin-status ${cls}`}>{label}</span>
                  </div>
                  <span>{agent.contact_name} · {agent.email}</span>
                  {agent.subscription_tier && <span>מנוי: {agent.subscription_tier} ({agent.subscription_status || 'לא פעיל'})</span>}
                  <span className="admin-row__date">{new Date(agent.created_at).toLocaleDateString('he-IL')}</span>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="admin-agent-detail"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {agent.phone && <div className="admin-agent-detail__row"><span>טלפון:</span> {agent.phone}</div>}
                      <div className="admin-agent-detail__row"><span>לידים:</span> {agent.lead_count || 0}</div>
                      <div className="admin-agent-detail__row"><span>סוג מנוי:</span> {agent.subscription_tier || '—'}</div>
                      <div className="admin-agent-detail__row"><span>סטטוס מנוי:</span> {agent.subscription_status || '—'}</div>
                      <div className="admin-agent-detail__row">
                        <a href={`/agent/${agent.slug}`} target="_blank" rel="noopener noreferrer" className="admin-agent-detail__link">
                          <Eye size={12} /> פרופיל ציבורי
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          <Pagination page={agentsPage} totalPages={totalAgentsPages} onPage={setAgentsPage} />
        </div>
      )}

      {/* Pending deals */}
      {!loading && tab === 'pending-deals' && (
        <div className="admin-list">
          {pendingDeals.length === 0 && <p className="admin-list__empty">אין דילים ממתינים</p>}
          {pendingDeals.map(deal => (
            <div key={deal.id} className="admin-row">
              <DealPreview deal={deal} />
              <div className="admin-row__actions">
                <motion.button className="admin-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approveDeal(deal.id)}>
                  <CheckCircle size={16} /> אשר
                </motion.button>
                <motion.button className="admin-row__reject" whileTap={{ scale: 0.97 }} onClick={() => startReject(deal.id, 'deal')}>
                  <XCircle size={16} /> דחה
                </motion.button>
              </div>
              {rejectId === deal.id && rejectTarget === 'deal' && (
                <div className="admin-row__reject-form">
                  <input className="admin-row__reject-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="סיבה לדחייה" autoFocus />
                  <button className="admin-row__reject-confirm" onClick={() => rejectDeal(deal.id)}>אשר דחייה</button>
                  <button onClick={() => setRejectId(null)}>ביטול</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active/approved deals */}
      {!loading && tab === 'active-deals' && (
        <div className="admin-list">
          {approvedDeals.length === 0 && <p className="admin-list__empty">אין דילים פעילים</p>}
          {approvedDeals.map(deal => (
            <div key={deal.id} className="admin-row">
              <DealPreview deal={deal} />
              <div className="admin-active-deal__meta">
                <span className="admin-active-deal__clicks">👆 {deal.click_count || 0} קליקים</span>
              </div>
              <div className="admin-row__actions">
                {deleteConfirmId === deal.id ? (
                  <>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>למחוק?</span>
                    <button className="admin-row__reject" onClick={() => deleteDeal(deal.id)}>כן, מחק</button>
                    <button onClick={() => setDeleteConfirmId(null)}>ביטול</button>
                  </>
                ) : (
                  <motion.button
                    className="admin-row__delete"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDeleteConfirmId(deal.id)}
                  >
                    <Trash2 size={14} /> מחק
                  </motion.button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
