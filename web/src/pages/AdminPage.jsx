import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, RefreshCw } from 'lucide-react';
import { adminApi } from '../api/client.js';

const ADMIN_PW_KEY = 'admin_pw';

function DealPreview({ deal }) {
  return (
    <div className="admin-deal-preview">
      {deal.photo_url && <img src={deal.photo_url} alt="" className="admin-deal-preview__img" />}
      <div className="admin-deal-preview__info">
        <strong>{deal.destination_name || deal.destination}</strong>
        <span>{deal.departure_date}{deal.return_date ? ` → ${deal.return_date}` : ''}</span>
        <span>{deal.price} {deal.currency}</span>
        {deal.purchase_link && <a href={deal.purchase_link} target="_blank" rel="noopener noreferrer"><Eye size={12} /> Preview link</a>}
        <span>By: {deal.business_name}</span>
        {deal.quality_score !== null && <span>Quality: {Number(deal.quality_score).toFixed(1)}%</span>}
        {deal.value_score !== null && <span>Value: {Number(deal.value_score).toFixed(1)}% vs market</span>}
      </div>
    </div>
  );
}

export function AdminPage() {
  const [pw, setPw] = useState(() => sessionStorage.getItem(ADMIN_PW_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('agents');
  const [pendingAgents, setPendingAgents] = useState([]);
  const [pendingDeals, setPendingDeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null); // 'agent' | 'deal'
  const [notification, setNotification] = useState(null);

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function tryLogin() {
    try {
      await adminApi.getPendingAgents(pw);
      sessionStorage.setItem(ADMIN_PW_KEY, pw);
      setAuthed(true);
      load(pw);
    } catch {
      notify('Wrong password', 'error');
    }
  }

  async function load(password = pw) {
    setLoading(true);
    try {
      const [{ agents }, { deals }] = await Promise.all([
        adminApi.getPendingAgents(password),
        adminApi.getPendingDeals(password),
      ]);
      setPendingAgents(agents || []);
      setPendingDeals(deals || []);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function approveAgent(id) {
    await adminApi.approveAgent(pw, id);
    notify('Agent approved ✓');
    setPendingAgents(prev => prev.filter(a => a.id !== id));
  }

  async function rejectAgent(id) {
    await adminApi.rejectAgent(pw, id, rejectReason);
    notify('Agent rejected');
    setPendingAgents(prev => prev.filter(a => a.id !== id));
    setRejectId(null); setRejectReason('');
  }

  async function approveDeal(id) {
    await adminApi.approveDeal(pw, id);
    notify('Deal approved ✓');
    setPendingDeals(prev => prev.filter(d => d.id !== id));
  }

  async function rejectDeal(id) {
    await adminApi.rejectDeal(pw, id, rejectReason);
    notify('Deal rejected');
    setPendingDeals(prev => prev.filter(d => d.id !== id));
    setRejectId(null); setRejectReason('');
  }

  function startReject(id, target) {
    setRejectId(id); setRejectTarget(target); setRejectReason('');
  }

  if (!authed) {
    return (
      <div className="admin-login">
        <h1>Admin Panel</h1>
        <input
          className="admin-login__input"
          type="password"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && tryLogin()}
          placeholder="Admin password"
          autoFocus
        />
        <button className="admin-login__btn" onClick={tryLogin}>Login</button>
        {notification && <p className="admin-login__error">{notification.msg}</p>}
      </div>
    );
  }

  return (
    <div className="admin-page">
      {notification && (
        <div className={`admin-page__notification admin-page__notification--${notification.type}`}>{notification.msg}</div>
      )}

      <div className="admin-page__header">
        <h1>Admin Panel</h1>
        <button className="admin-page__refresh" onClick={() => load()} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tabs__btn${tab === 'agents' ? ' is-active' : ''}`} onClick={() => setTab('agents')}>
          Agents {pendingAgents.length > 0 && <span className="admin-tabs__badge">{pendingAgents.length}</span>}
        </button>
        <button className={`admin-tabs__btn${tab === 'deals' ? ' is-active' : ''}`} onClick={() => setTab('deals')}>
          Deals {pendingDeals.length > 0 && <span className="admin-tabs__badge">{pendingDeals.length}</span>}
        </button>
      </div>

      {tab === 'agents' && (
        <div className="admin-list">
          {pendingAgents.length === 0 && <p className="admin-list__empty">No pending agents</p>}
          {pendingAgents.map(agent => (
            <div key={agent.id} className="admin-row">
              <div className="admin-row__info">
                <strong>{agent.business_name}</strong>
                <span>{agent.contact_name} · {agent.email}</span>
                {agent.phone && <span>{agent.phone}</span>}
                {agent.license_number && <span>License: {agent.license_number}</span>}
                <span className="admin-row__date">{new Date(agent.created_at).toLocaleDateString()}</span>
              </div>
              <div className="admin-row__actions">
                <motion.button className="admin-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approveAgent(agent.id)}>
                  <CheckCircle size={16} /> Approve
                </motion.button>
                <motion.button className="admin-row__reject" whileTap={{ scale: 0.97 }} onClick={() => startReject(agent.id, 'agent')}>
                  <XCircle size={16} /> Reject
                </motion.button>
              </div>
              {rejectId === agent.id && rejectTarget === 'agent' && (
                <div className="admin-row__reject-form">
                  <input className="admin-row__reject-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason (optional)" autoFocus />
                  <button className="admin-row__reject-confirm" onClick={() => rejectAgent(agent.id)}>Confirm reject</button>
                  <button onClick={() => setRejectId(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'deals' && (
        <div className="admin-list">
          {pendingDeals.length === 0 && <p className="admin-list__empty">No pending deals</p>}
          {pendingDeals.map(deal => (
            <div key={deal.id} className="admin-row">
              <DealPreview deal={deal} />
              <div className="admin-row__actions">
                <motion.button className="admin-row__approve" whileTap={{ scale: 0.97 }} onClick={() => approveDeal(deal.id)}>
                  <CheckCircle size={16} /> Approve
                </motion.button>
                <motion.button className="admin-row__reject" whileTap={{ scale: 0.97 }} onClick={() => startReject(deal.id, 'deal')}>
                  <XCircle size={16} /> Reject
                </motion.button>
              </div>
              {rejectId === deal.id && rejectTarget === 'deal' && (
                <div className="admin-row__reject-form">
                  <input className="admin-row__reject-input" value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection" autoFocus />
                  <button className="admin-row__reject-confirm" onClick={() => rejectDeal(deal.id)}>Confirm reject</button>
                  <button onClick={() => setRejectId(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
