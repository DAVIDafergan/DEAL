import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, MessageCircle, Users, Calendar } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { propertyApi } from '../api/client.js';

const STATUS_LABELS = { pending: 'חדשה', approved: 'אושרה', rejected: 'נדחתה' };

function buildWhatsAppUrl(phone, customerName, propertyName) {
  const text = `שלום ${customerName}, בנוגע לבקשת ההזמנה שלך ל${propertyName} ב-Dealim`;
  let clean = (phone || '').replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 10) clean = '972' + clean.slice(1);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

/** OwnerBookingsPage — 7.5 dashboard "בקשות הזמנה": every booking request across all of this
 * owner's properties, with approve/reject and a WhatsApp shortcut to the customer. */
export function OwnerBookingsPage() {
  const { token, loading } = useAgentAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | pending | approved | rejected

  useEffect(() => {
    if (!loading && !token) navigate('/owner/login', { replace: true });
  }, [loading, token, navigate]);

  function refresh() {
    if (!token) return;
    propertyApi.getMyBookingRequests(token)
      .then(({ requests: r }) => setRequests(r || []))
      .catch(() => setRequests([]))
      .finally(() => setRequestsLoading(false));
  }

  useEffect(refresh, [token]);

  async function handleStatus(bookingId, status) {
    setUpdatingId(bookingId);
    try {
      await propertyApi.setBookingRequestStatus(token, bookingId, status);
      setRequests((prev) => prev.map((r) => (r.id === bookingId ? { ...r, status } : r)));
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = filter === 'all' ? requests : requests.filter((r) => r.status === filter);
  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  if (loading) return <div className="dash-loading"><motion.div className="dash-loading__spinner" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }} /></div>;

  return (
    <div className="settings-page" dir="rtl">
      <div className="settings-page__header">
        <Link to="/owner/dashboard" className="settings-page__back">
          <ArrowLeft size={16} /> חזרה לדשבורד
        </Link>
        <h1 className="settings-page__title">
          בקשות הזמנה
          {pendingCount > 0 && <span className="dash-tab__badge" style={{ marginInlineStart: 8 }}>{pendingCount} חדשות</span>}
        </h1>
      </div>

      <div className="dash-quick-row container" style={{ marginBottom: 16 }}>
        {['all', 'pending', 'approved', 'rejected'].map((f) => (
          <button
            key={f}
            type="button"
            className={`dash-quick-pill ${filter === f ? 'dash-quick-pill--primary' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'הכל' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="dash-deals-panel container">
        {requestsLoading && <p className="dash-empty">טוען…</p>}
        {!requestsLoading && filtered.length === 0 && (
          <div className="dash-empty-state">
            <Calendar size={40} strokeWidth={1.2} />
            <p>אין בקשות הזמנה{filter !== 'all' ? ` בסטטוס "${STATUS_LABELS[filter]}"` : ''} כרגע.</p>
          </div>
        )}

        <div className="dash-deals-list">
          <AnimatePresence>
            {filtered.map((r) => (
              <motion.div
                key={r.id}
                className={`dash-deal-card dash-deal-card--${r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'approved' : 'rejected'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                layout
              >
                <div className="dash-deal-card__body">
                  <div className="dash-deal-card__dest">{r.property_name}{r.unit_name ? ` — ${r.unit_name}` : ''}</div>
                  <div className="dash-deal-card__meta">
                    <span><Calendar size={12} style={{ verticalAlign: 'middle' }} /> {String(r.check_in).slice(0, 10)} – {String(r.check_out).slice(0, 10)}</span>
                    <span><Users size={12} style={{ verticalAlign: 'middle' }} /> {r.guest_count} אורחים</span>
                  </div>
                  <div className="dash-deal-card__meta">
                    <span>{r.customer_name} · {r.customer_phone}</span>
                  </div>
                  {r.message && <p className="agent-form__hint">"{r.message}"</p>}
                </div>
                <div className="dash-deal-card__right">
                  <span className={`dash-deal-status dash-deal-status--${r.status === 'pending' ? 'pending' : r.status === 'approved' ? 'approved' : 'rejected'}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  <a className="dash-deal-edit" href={buildWhatsAppUrl(r.customer_phone, r.customer_name, r.property_name)} target="_blank" rel="noopener noreferrer" title="וואטסאפ ללקוח">
                    <MessageCircle size={14} />
                    <span className="dash-deal-btn-label">וואטסאפ</span>
                  </a>
                  {r.status === 'pending' && (
                    <>
                      <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} disabled={updatingId === r.id} onClick={() => handleStatus(r.id, 'approved')} title="אשר">
                        <Check size={14} />
                        <span className="dash-deal-btn-label">אשר</span>
                      </motion.button>
                      <motion.button className="dash-deal-edit" whileTap={{ scale: 0.9 }} disabled={updatingId === r.id} onClick={() => handleStatus(r.id, 'rejected')} title="דחה">
                        <X size={14} />
                        <span className="dash-deal-btn-label">דחה</span>
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
