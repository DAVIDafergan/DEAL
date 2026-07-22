import { useEffect, useState } from 'react';
import { Link } from '../components/LocalizedLink.jsx';
import { ArrowLeft, Clock, CheckCircle2, XCircle, CalendarX } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { listTrackedBookings } from '../utils/myBookings.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const STATUS_META = {
  pending: { icon: Clock, labelKey: 'myBookingsFilterPending', className: 'bsp__status--pending' },
  approved: { icon: CheckCircle2, labelKey: 'myBookingsFilterApproved', className: 'bsp__status--approved' },
  rejected: { icon: XCircle, labelKey: 'myBookingsFilterRejected', className: 'bsp__status--rejected' },
};

const FILTERS = [
  { key: 'all', labelKey: 'myBookingsFilterAll' },
  { key: 'pending', labelKey: 'myBookingsFilterPending' },
  { key: 'approved', labelKey: 'myBookingsFilterApproved' },
  { key: 'rejected', labelKey: 'myBookingsFilterRejected' },
];

/** MyBookingsPage — 9.6 "ההזמנות שלי לפי סטטוס": the local list of requests this browser
 * submitted (utils/myBookings.js), each re-fetched live by its tracking token so the status
 * shown is always current, not a stale snapshot from submit time. */
export function MyBookingsPage() {
  const { t, dir } = useLanguage();
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
    <div className="settings-page" dir={dir}>
      <div className="settings-page__header">
        <Link to="/account" className="settings-page__back"><ArrowLeft size={16} /> {t.backButton}</Link>
        <h1 className="settings-page__title">{t.myBookingsTitle}</h1>
      </div>

      <div className="dash-quick-row container" style={{ marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={`dash-quick-pill ${filter === f.key ? 'dash-quick-pill--primary' : ''}`} onClick={() => setFilter(f.key)}>
            {t[f.labelKey]}
          </button>
        ))}
      </div>

      <div className="container">
        {loading && <p className="bsp__loading">{t.loadingButton}</p>}
        {!loading && filtered.length === 0 && (
          <div className="dash-empty-state">
            <CalendarX size={40} strokeWidth={1.2} />
            <p>{t.myBookingsEmpty}</p>
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
                  <span className={`bsp__status ${meta.className}`}><Icon size={14} /> {t[meta.labelKey]}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
