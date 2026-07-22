import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle2, XCircle, CalendarX } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { listTrackedBookings } from '../utils/myBookings.js';

const STATUS_META = {
  pending: { icon: Clock, label: 'ממתינה', className: 'bsp__status--pending' },
  approved: { icon: CheckCircle2, label: 'אושרה', className: 'bsp__status--approved' },
  rejected: { icon: XCircle, label: 'נדחתה', className: 'bsp__status--rejected' },
};

const FILTERS = [
  { key: 'all', label: 'הכל' },
  { key: 'pending', label: 'ממתינות' },
  { key: 'approved', label: 'אושרו' },
  { key: 'rejected', label: 'נדחו' },
];

/** MyBookingsPage — 9.6 "ההזמנות שלי לפי סטטוס": the local list of requests this browser
 * submitted (utils/myBookings.js), each re-fetched live by its tracking token so the status
 * shown is always current, not a stale snapshot from submit time. */
export function MyBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const saved = listTrackedBookings();
    Promise.all(saved.map((s) =>
      propertyApi.trackBooking(s.trackingToken).then(({ booking }) => booking).catch(() => null)
    )).then((results) => setBookings(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  return (
    <div className="settings-page" dir="rtl">
      <div className="settings-page__header">
        <Link to="/account" className="settings-page__back"><ArrowLeft size={16} /> חזרה</Link>
        <h1 className="settings-page__title">ההזמנות שלי</h1>
      </div>

      <div className="dash-quick-row container" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={`dash-quick-pill ${filter === f.key ? 'dash-quick-pill--primary' : ''}`} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="container">
        {loading && <p className="bsp__loading">טוען…</p>}
        {!loading && filtered.length === 0 && (
          <div className="dash-empty-state">
            <CalendarX size={40} strokeWidth={1.2} />
            <p>אין עדיין בקשות הזמנה{filter !== 'all' ? ' בסטטוס הזה' : ''} מהדפדפן הזה.</p>
          </div>
        )}
        <div className="dash-deals-list">
          {filtered.map((b) => {
            const meta = STATUS_META[b.status] || STATUS_META.pending;
            const Icon = meta.icon;
            return (
              <Link key={b.tracking_token} to={`/booking/${b.tracking_token}`} className="dash-deal-card">
                <div className="dash-deal-card__body">
                  <div className="dash-deal-card__dest">{b.property_name}{b.unit_name && b.unit_name !== b.property_name ? ` — ${b.unit_name}` : ''}</div>
                  <div className="dash-deal-card__meta">
                    <span>{String(b.check_in).slice(0, 10)} – {String(b.check_out).slice(0, 10)}</span>
                  </div>
                </div>
                <div className="dash-deal-card__right">
                  <span className={`bsp__status ${meta.className}`}><Icon size={14} /> {meta.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
