import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Eye, RefreshCw, ArrowLeft, Trash2, ChevronLeft, ChevronRight, User, LogIn, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client.js';

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
        {deal.click_count != null && <span>👆 {deal.click_count} קליקים</span>}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="admin-pagination">
      <button className="admin-pagination__btn" disabled={page === 1} onClick={() => onPage(page - 1)}><ChevronRight size={16} /></button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
        <button key={p} className={`admin-pagination__btn${p === page ? ' is-active' : ''}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button className="admin-pagination__btn" disabled={page === totalPages} onClick={() => onPage(page + 1)}><ChevronLeft size={16} /></button>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username || !password) { setError('נדרשים שם משתמש וסיסמה'); return; }
    setLoading(true);
    setError('');
    try {
      const { token } = await adminApi.login(username, password);
      adminApi.setToken(token);
      onLogin(token);
    } catch (err) {
      setError(err.message || 'שגיאה בכניסה');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page" dir="rtl">
      <motion.div
        className="admin-login-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="admin-login-card__icon">
          <LogIn size={28} />
        </div>
        <h1 className="admin-login-card__title">פאנל ניהול</h1>
        <p className="admin-login-card__sub">Deal Radar Pro</p>
        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-login-field">
            <label>שם משתמש</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="admin-login-field">
            <label>סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="admin-login-error">{error}</p>}
          <motion.button
            type="submit"
            className="admin-login-btn"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
          >
            {loading ? 'מתחבר…' : 'כניסה'}
          </motion.button>
        </form>
        <Link to="/" className="admin-login-back"><ArrowLeft size={14} /> דף הבית</Link>
      </motion.div>
    </div>
  );
}

export function AdminPage() {
  const [token, setToken] = useState(() => adminApi.getToken());
  const [tab, setTab] = useState('pending-agents');
  const [pendingAgents, setPendingAgents] = useState([]);
  const [allAgents, setAllAgents] = useState([]);
  const [pendingDeals, setPendingDeals] = useState([]);
  const [approvedDeals, setApprovedDeals] = useState([]);
  const [loading, setLoading] = useState(false);
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
    if (!token) return;
    setLoading(true);
    try {
      const [{ agents: pending }, { agents: all }, { deals: pDeals }, { deals: aDeals }] = await Promise.all([
        adminApi.getPendingAgents(token),
        adminApi.getAllAgents(token),
        adminApi.getPendingDeals(token),
        adminApi.getApprovedDeals(token),
      ]);
      setPendingAgents(pending || []);
      setAllAgents(all || []);
      setPendingDeals(pDeals || []);
      setApprovedDeals(aDeals || []);
    } catch (err) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        adminApi.clearToken();
        setToken(null);
      } else {
        notify(err.message || 'שגיאה בטעינה', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (token) load(); }, [token]);

  function handleLogin(tok) { setToken(tok); }
  function handleLogout() { adminApi.clearToken(); setToken(null); }

  async function approveAgent(id) {
    try {
      await adminApi.approveAgent(token, id);
      notify('הסוכן אושר ✓');
      setPendingAgents(prev => prev.filter(a => a.id !== id));
      setAllAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' } : a));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function rejectAgent(id) {
    try {
      await adminApi.rejectAgent(token, id, rejectReason);
      notify('הסוכן נדחה');
      setPendingAgents(prev => prev.filter(a => a.id !== id));
      setAllAgents(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' } : a));
      setRejectId(null); setRejectReason('');
    } catch (err) { notify(err.message, 'error'); }
  }

  async function approveDeal(id) {
    try {
      await adminApi.approveDeal(token, id);
      notify('הדיל אושר ✓');
      setPendingDeals(prev => prev.filter(d => d.id !== id));
    } catch (err) { notify(err.message, 'error'); }
  }

  async function rejectDeal(id) {
    try {
      await adminApi.rejectDeal(token, id, rejectReason);
      notify('הדיל נדחה');
      setPendingDeals(prev => prev.filter(d => d.id !== id));
      setRejectId(null); setRejectReason('');
    } catch (err) { notify(err.message, 'error'); }
  }

  async function deleteDeal(id) {
    try {
      await adminApi.deleteDeal(token, id);
      notify('הדיל נמחק');
      setApprovedDeals(prev => prev.filter(d => d.id !== id));
      setDeleteConfirmId(null);
    } catch (err) { notify(err.message, 'error'); }
  }

  function startReject(id, target) { setRejectId(id); setRejectTarget(target); setRejectReason(''); }

  if (!token) return <LoginScreen onLogin={handleLogin} />;

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
        <Link to="/" className="admin-page__back-btn"><ArrowLeft size={18} /> דף הבית</Link>
        <h1>פאנל ניהול</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="admin-page__refresh" onClick={load} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          </button>
          <button className="admin-page__refresh" onClick={handleLogout} title="התנתקות">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tabs__btn${tab === 'pending-agents' ? ' is-active' : ''}`} onClick={() => setTab('pending-agents')}>
          סוכנים ממתינים {pendingAgents.length > 0 && <span className="admin-tabs__badge">{pendingAgents.length}</span>}
        </button>
        <button className={`admin-tabs__btn${tab === 'all-agents' ? ' is-active' : ''}`} onClick={() => setTab('all-agents')}>
          כל הסוכנים <span className="admin-tabs__badge admin-tabs__badge--neutral">{allAgents.length}</span>
        </button>
        <button className={`admin-tabs__btn${tab === 'pending-deals' ? ' is-active' : ''}`} onClick={() => setTab('pending-deals')}>
          דילים ממתינים {pendingDeals.length > 0 && <span className="admin-tabs__badge">{pendingDeals.length}</span>}
        </button>
        <button className={`admin-tabs__btn${tab === 'active-deals' ? ' is-active' : ''}`} onClick={() => setTab('active-deals')}>
          דילים פעילים <span className="admin-tabs__badge admin-tabs__badge--neutral">{approvedDeals.length}</span>
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>טוען…</p>}

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
                  <span className="admin-row__date">{new Date(agent.created_at).toLocaleDateString('he-IL')}</span>
                </div>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      className="admin-agent-detail"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}
                      onClick={e => e.stopPropagation()}
                    >
                      {agent.phone && <div className="admin-agent-detail__row"><span>טלפון:</span> {agent.phone}</div>}
                      <div className="admin-agent-detail__row"><span>לידים:</span> {agent.lead_count || 0}</div>
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

      {!loading && tab === 'active-deals' && (
        <div className="admin-list">
          {approvedDeals.length === 0 && <p className="admin-list__empty">אין דילים פעילים</p>}
          {approvedDeals.map(deal => (
            <div key={deal.id} className="admin-row">
              <DealPreview deal={deal} />
              <div className="admin-row__actions">
                {deleteConfirmId === deal.id ? (
                  <>
                    <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>למחוק?</span>
                    <button className="admin-row__reject" onClick={() => deleteDeal(deal.id)}>כן, מחק</button>
                    <button onClick={() => setDeleteConfirmId(null)}>ביטול</button>
                  </>
                ) : (
                  <motion.button className="admin-row__delete" whileTap={{ scale: 0.97 }} onClick={() => setDeleteConfirmId(deal.id)}>
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
