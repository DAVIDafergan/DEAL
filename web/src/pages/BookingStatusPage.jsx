import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Users, Calendar, MapPin } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { regionLabel } from '../data/propertyOptions.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const STATUS_META = {
  pending: { icon: Clock, labelKey: 'bookingStatusPending', noteKey: 'bookingNotePending', className: 'bsp__status--pending' },
  approved: { icon: CheckCircle2, labelKey: 'bookingStatusApproved', noteKey: 'bookingNoteApproved', className: 'bsp__status--approved' },
  rejected: { icon: XCircle, labelKey: 'bookingStatusRejected', noteKey: 'bookingNoteRejected', className: 'bsp__status--rejected' },
};

/** BookingStatusPage — 9.6: "מעקב אחרי בקשת הזמנה עם קישור ייחודי, גם ללא הרשמה". Public route,
 * no login — the token in the URL IS the access control. */
export function BookingStatusPage() {
  const { t, dir, lang } = useLanguage();
  const { token } = useParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    propertyApi.trackBooking(token)
      .then(({ booking: b }) => setBooking(b))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="bsp container" dir={dir}><p className="bsp__loading">{t.loadingButton}</p></div>;

  if (error || !booking) {
    return (
      <div className="bsp container" dir={dir}>
        <p className="bsp__loading">{t.bookingNotFound}</p>
        <Link to="/" className="bsp__back"><ArrowLeft size={14} /> {t.homeLink}</Link>
      </div>
    );
  }

  const meta = STATUS_META[booking.status] || STATUS_META.pending;
  const StatusIcon = meta.icon;

  return (
    <div className="bsp container" dir={dir}>
      <Link to="/" className="bsp__back"><ArrowLeft size={14} /> {t.homeLink}</Link>

      <div className="bsp__card">
        {booking.owner_images?.[0] && <img src={booking.owner_images[0]} alt="" className="bsp__img" />}
        <div className="bsp__body">
          <div className={`bsp__status ${meta.className}`}>
            <StatusIcon size={18} /> {t[meta.labelKey]}
          </div>
          <h1 className="bsp__title">{booking.property_name}{booking.unit_name && booking.unit_name !== booking.property_name ? ` — ${booking.unit_name}` : ''}</h1>
          <p className="bsp__sub"><MapPin size={13} /> {regionLabel(booking.region, lang)}{booking.city ? ` · ${booking.city}` : ''}</p>

          <div className="bsp__details">
            <div className="bsp__detail-row"><Calendar size={15} /><span>{String(booking.check_in).slice(0, 10)} – {String(booking.check_out).slice(0, 10)}</span></div>
            <div className="bsp__detail-row"><Users size={15} /><span>{t.guestsUpTo(booking.guest_count)}</span></div>
          </div>

          <p className="bsp__note">{t[meta.noteKey]}</p>

          <Link to={`/property/${booking.property_id}`} className="bsp__property-link">{t.viewPropertyLink} ←</Link>
        </div>
      </div>
    </div>
  );
}
