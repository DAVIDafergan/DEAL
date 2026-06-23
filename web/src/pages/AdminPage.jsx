import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Eye, RefreshCw, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '../api/client.js';

const ADMIN_PW = 'open';

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

export function AdminPage() {
  const [tab, setTab] = useState('agents');
  const [pendingAgents, setPendingAgents] = useState([]);
  const [pendingDeals, setPendingDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState(null);
  const [notification, setNotification] = useState(null);

  function notify(msg, type = 'success') {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const [{ agents }, { deals }] = await Promise.all([
        adminApi.getPendingAgents(ADMIN_PW),
        adminApi.getPendingDeals(ADMIN_PW),
      ]);
      setPendingAgents(agents || []);
      setPendingDeals(deals || []);
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
    } catch (err) { notify(err.message, 'error'); }
  }

  async function rejectAgent(id) {
    try {
      await adminApi.rejectAgent(ADMIN_PW, id, rejectReason);
      notify('הסוכן נדחה');
      setPendingAgents(prev => prev.filter(a => a.id !== id));
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

  function startReject(id, target) {
    setRejectId(id); setRejectTarget(target); setRejectReason('');
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
        <button className={`admin-tabs__btn${tab === 'agents' ? ' is-active' : ''}`} onClick={() => setTab('agents')}>
          סוכנים {pendingAgents.length > 0 && <span className="admin-tabs__badge">{pendingAgents.length}</span>}
        </button>
        <button className={`admin-tabs__btn${tab === 'deals' ? ' is-active' : ''}`} onClick={() => setTab('deals')}>
          דילים {pendingDeals.length > 0 && <span className="admin-tabs__badge">{pendingDeals.length}</span>}
        </button>
      </div>

      {loading && <p style={{ textAlign: 'center', padding: 32, color: 'var(--color-text-muted)' }}>טוען…</p>}

      {!loading && tab === 'agents' && (
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

      {!loading && tab === 'deals' && (
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
    </div>
  );
}
