import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle, ArrowLeft, Users, Calendar, MapPin } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { regionLabel } from '../data/propertyOptions.js';

const STATUS_META = {
  pending: { icon: Clock, label: 'ממתינה לתשובת בעל הנכס', className: 'bsp__status--pending' },
  approved: { icon: CheckCircle2, label: 'אושרה!', className: 'bsp__status--approved' },
  rejected: { icon: XCircle, label: 'נדחתה', className: 'bsp__status--rejected' },
};

/** BookingStatusPage — 9.6: "מעקב אחרי בקשת הזמנה עם קישור ייחודי, גם ללא הרשמה". Public route,
 * no login — the token in the URL IS the access control. */
export function BookingStatusPage() {
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

  if (loading) return <div className="bsp container" dir="rtl"><p className="bsp__loading">טוען…</p></div>;

  if (error || !booking) {
    return (
      <div className="bsp container" dir="rtl">
        <p className="bsp__loading">בקשת ההזמנה לא נמצאה. ודאו שהקישור המלא הודבק כראוי.</p>
        <Link to="/" className="bsp__back"><ArrowLeft size={14} /> לדף הבית</Link>
      </div>
    );
  }

  const meta = STATUS_META[booking.status] || STATUS_META.pending;
  const StatusIcon = meta.icon;

  return (
    <div className="bsp container" dir="rtl">
      <Link to="/" className="bsp__back"><ArrowLeft size={14} /> לדף הבית</Link>

      <div className="bsp__card">
        {booking.owner_images?.[0] && <img src={booking.owner_images[0]} alt="" className="bsp__img" />}
        <div className="bsp__body">
          <div className={`bsp__status ${meta.className}`}>
            <StatusIcon size={18} /> {meta.label}
          </div>
          <h1 className="bsp__title">{booking.property_name}{booking.unit_name && booking.unit_name !== booking.property_name ? ` — ${booking.unit_name}` : ''}</h1>
          <p className="bsp__sub"><MapPin size={13} /> {regionLabel(booking.region)}{booking.city ? ` · ${booking.city}` : ''}</p>

          <div className="bsp__details">
            <div className="bsp__detail-row"><Calendar size={15} /><span>{String(booking.check_in).slice(0, 10)} – {String(booking.check_out).slice(0, 10)}</span></div>
            <div className="bsp__detail-row"><Users size={15} /><span>{booking.guest_count} אורחים</span></div>
          </div>

          <p className="bsp__note">
            {booking.status === 'pending' && 'בעל הנכס יחזור אליכם בהקדם — שמרו את הקישור הזה כדי לבדוק שוב מאוחר יותר.'}
            {booking.status === 'approved' && 'ההזמנה אושרה על ידי בעל הנכס. הוא ייצור איתכם קשר להשלמת הפרטים.'}
            {booking.status === 'rejected' && 'לצערנו בעל הנכס לא יכול לאשר את הבקשה הזו. נסו נכס אחר.'}
          </p>

          <Link to={`/property/${booking.property_id}`} className="bsp__property-link">לצפייה בנכס ←</Link>
        </div>
      </div>
    </div>
  );
}
