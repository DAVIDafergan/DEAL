import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageCircle, CheckCircle, ExternalLink, Users, BedDouble, Bath, ShieldAlert, Send, Clock } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { getCurrencySymbol } from '../utils/currency.js';
import { regionLabel, propertyTypeLabel, kosherLabel, AMENITIES } from '../data/propertyOptions.js';
import { PropertyImageCarousel } from '../components/PropertyImageCarousel.jsx';
import { PropertyUnitCard } from '../components/PropertyUnitCard.jsx';
import { OwnerCard } from '../components/property/OwnerCard.jsx';

function activeAmenityLabels(property) {
  return AMENITIES.filter((a) => property[a.value]).map((a) => a.label);
}

/** ClaimFlow — the "אני בעל הנכס" flow: request code (owner auth required) → enter code → pending. */
function ClaimFlow({ propertyId }) {
  const { token } = useAgentAuth();
  const [step, setStep] = useState('idle'); // idle | requested | done
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <p className="agent-form__hint" style={{ marginTop: 8 }}>
        כדי לתבוע בעלות על הנכס יש להתחבר או להירשם כבעל צימר קודם.{' '}
        <Link to={`/owner/login?next=/property/${propertyId}`}>התחברות</Link>
        {' '}·{' '}
        <Link to={`/owner/register?next=/property/${propertyId}`}>הרשמה</Link>
      </p>
    );
  }

  async function handleRequestCode() {
    setSubmitting(true);
    setError('');
    try {
      const { sentTo: masked } = await propertyApi.requestClaim(token, propertyId);
      setSentTo(masked);
      setStep('requested');
    } catch (err) {
      setError(err.message || 'שגיאה בשליחת הקוד');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    setSubmitting(true);
    setError('');
    try {
      await propertyApi.verifyClaim(token, propertyId, code);
      setStep('done');
    } catch (err) {
      setError(err.message || 'קוד שגוי או שפג תוקפו');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <p className="deal-modal__desc">
        <CheckCircle size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
        אומת בהצלחה! הבקשה שלך ממתינה לאישור מנהל, לרוב תוך יום עסקים. הנכס יופיע ב"הנכסים שלי" בדשבורד.
        {' '}<Link to="/owner/dashboard">לדשבורד</Link>
      </p>
    );
  }

  if (step === 'requested') {
    return (
      <div className="agent-form__field" style={{ marginTop: 8 }}>
        <label className="agent-form__label">קוד אימות נשלח ל-{sentTo} — הזן אותו כאן</label>
        <input className="agent-form__input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        {error && <p className="agent-form__error-msg">{error}</p>}
        <motion.button className="deal-modal__btn deal-modal__btn--book" style={{ marginTop: 8 }} whileTap={{ scale: 0.97 }} disabled={submitting || !code} onClick={handleVerify}>
          {submitting ? 'מאמת…' : 'אמת קוד'}
        </motion.button>
      </div>
    );
  }

  return (
    <>
      {error && <p className="agent-form__error-msg">{error}</p>}
      <motion.button className="deal-modal__btn deal-modal__btn--share" whileTap={{ scale: 0.97 }} disabled={submitting} onClick={handleRequestCode}>
        {submitting ? 'שולח…' : 'אני בעל הנכס'}
      </motion.button>
    </>
  );
}

// Mirrors server/services/bookingNotifications.js estimateBookingPrice — client-side so the
// estimate shows live before submission (7.5: "חישוב והצגת המחיר המשוער לפני שליחה").
function estimatePrice(unit, checkIn, checkOut) {
  if (!unit?.base_price_night || !checkIn || !checkOut) return null;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const nights = Math.round((end - start) / (24 * 60 * 60 * 1000));
  if (nights <= 0) return null;
  let total = 0;
  const d = new Date(start);
  for (let i = 0; i < nights; i++) {
    const isWeekend = d.getDay() === 5 || d.getDay() === 6; // Friday/Saturday
    total += (isWeekend && unit.weekend_price) ? Number(unit.weekend_price) : Number(unit.base_price_night);
    d.setDate(d.getDate() + 1);
  }
  return { nights, total };
}

function BookingRequestForm({ propertyId, unit, unitName, currency }) {
  const [form, setForm] = useState({ check_in: '', check_out: '', guest_count: 2, customer_name: '', customer_phone: '', customer_email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // 'success' | 'error' | null
  const [confirmation, setConfirmation] = useState(null); // { id, priceEstimate }

  function set(key) { return (e) => setForm((f) => ({ ...f, [key]: e.target.value })); }

  const priceEstimate = estimatePrice(unit, form.check_in, form.check_out);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await propertyApi.requestBooking(propertyId, { ...form, unit_id: unit?.id });
      setConfirmation(res);
      setResult('success');
    } catch {
      setResult('error');
    } finally {
      setSubmitting(false);
    }
  }

  if (result === 'success') {
    return (
      <div className="settings-card" style={{ marginTop: 16 }}>
        <p className="deal-modal__desc">
          <CheckCircle size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
          בקשתך הועברה לבעל הנכס. הוא יחזור אליך לאישור ההזמנה.
        </p>
        <div className="deal-modal__details" style={{ marginTop: 8 }}>
          <div className="deal-modal__detail-row">
            <span className="deal-modal__detail-label">מספר בקשה</span>
            <span>#{confirmation?.id}</span>
          </div>
          <div className="deal-modal__detail-row">
            <span className="deal-modal__detail-label">תאריכים</span>
            <span>{form.check_in} – {form.check_out}</span>
          </div>
          {unitName && (
            <div className="deal-modal__detail-row">
              <span className="deal-modal__detail-label">יחידה</span>
              <span>{unitName}</span>
            </div>
          )}
          {confirmation?.priceEstimate && (
            <div className="deal-modal__detail-row">
              <span className="deal-modal__detail-label">מחיר משוער</span>
              <span>{Math.round(confirmation.priceEstimate.total)} {confirmation.priceEstimate.currencySymbol} ({confirmation.priceEstimate.nights} לילות)</span>
            </div>
          )}
        </div>
        {form.customer_email && <p className="agent-form__hint" style={{ marginTop: 8 }}>אישור נשלח גם לאימייל שלך.</p>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="settings-card" style={{ marginTop: 16 }}>
      <h2 className="settings-card__title">בקשת הזמנה{unitName ? ` — ${unitName}` : ''}</h2>
      <div className="agent-form__field">
        <label className="agent-form__label">תאריך כניסה</label>
        <input className="agent-form__input" type="date" required value={form.check_in} onChange={set('check_in')} />
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">תאריך יציאה</label>
        <input className="agent-form__input" type="date" required value={form.check_out} onChange={set('check_out')} />
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">מספר אורחים</label>
        <input className="agent-form__input" type="number" min="1" value={form.guest_count} onChange={set('guest_count')} />
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">שם מלא</label>
        <input className="agent-form__input" required value={form.customer_name} onChange={set('customer_name')} />
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">טלפון</label>
        <input className="agent-form__input" type="tel" required value={form.customer_phone} onChange={set('customer_phone')} />
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">אימייל (אופציונלי — לקבלת אישור)</label>
        <input className="agent-form__input" type="email" value={form.customer_email} onChange={set('customer_email')} />
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">הודעה (אופציונלי)</label>
        <input className="agent-form__input" value={form.message} onChange={set('message')} />
      </div>
      {priceEstimate && (
        <div className="deal-modal__detail-row" style={{ background: 'var(--color-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
          <span className="deal-modal__detail-label">מחיר משוער</span>
          <span>{Math.round(priceEstimate.total)} {getCurrencySymbol(currency)} · {priceEstimate.nights} לילות</span>
        </div>
      )}
      {result === 'error' && <p className="agent-form__error-msg">שגיאה בשליחת הבקשה, נסו שוב</p>}
      <motion.button type="submit" className="deal-modal__btn deal-modal__btn--book" whileTap={{ scale: 0.97 }} disabled={submitting}>
        <Send size={16} /> {submitting ? 'שולח…' : 'שלח בקשת הזמנה'}
      </motion.button>
    </form>
  );
}

export function PropertyPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const bookingRef = useRef(null);

  useEffect(() => {
    propertyApi.get(id)
      .then(({ property: p }) => {
        setProperty(p);
        setSelectedUnitId(p.units?.[0]?.id ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>טוען…</div>;
  if (error || !property) {
    return (
      <div className="agent-social-profile agent-social-profile--error" dir="rtl">
        <p>הנכס לא נמצא</p>
        <Link to="/">← חזרה</Link>
      </div>
    );
  }

  const isClaimed = property.status === 'claimed' || property.status === 'active';
  const isPendingClaim = property.status === 'pending';
  const amenities = activeAmenityLabels(property);
  const units = property.units || [];
  const isMultiUnit = units.length > 1;
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
  const capacity = property.total_guest_capacity ?? property.guest_capacity;
  const bedrooms = property.max_bedrooms ?? property.bedrooms;
  const priceFrom = property.price_from ?? property.base_price_night;

  function handleBookUnit(unit) {
    setSelectedUnitId(unit.id);
    bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="agent-social-profile" dir="rtl">
      <div className="agent-social-profile__topbar container">
        <Link to="/" className="agent-social-profile__back-clean">
          <ArrowLeft size={14} /> חזרה
        </Link>
      </div>

      <div className="container" style={{ maxWidth: 640 }}>
        {isClaimed ? (
          <PropertyImageCarousel images={property.owner_images || []} alt={property.name} />
        ) : (
          <div className="deal-modal__media" style={{ borderRadius: 'var(--radius-lg)', height: 280 }}>
            <div className="deal-modal__media-placeholder" />
            <div className="deal-modal__media-gradient" />
            <div className="deal-modal__price-overlay">
              <span className="adc__exclusive-badge" style={{ position: 'static' }}>
                <ShieldAlert size={12} /> בעל הנכס טרם אימת את העמוד
              </span>
            </div>
          </div>
        )}

        <div className="deal-modal__body" style={{ padding: '20px 4px' }}>
          <h1 className="deal-modal__title">{property.name}</h1>
          <p className="deal-modal__country">
            {propertyTypeLabel(property.property_type)} · {regionLabel(property.region)}{property.city ? ` · ${property.city}` : ''}
          </p>

          {isClaimed && property.owner_id && (
            <div className="deal-modal__agent-row">
              <span className="deal-modal__agent-badge">
                <CheckCircle size={13} /> מאומת ע"י הבעלים
              </span>
            </div>
          )}

          {isClaimed && <OwnerCard owner={property.owner} />}

          <motion.div className="deal-modal__details" initial="hidden" animate="visible">
            {(capacity || bedrooms || property.bathrooms) && (
              <div className="deal-modal__detail-row">
                <Users size={15} />
                <span>
                  {[
                    capacity ? `עד ${capacity} אורחים` : null,
                    bedrooms ? `${bedrooms} חדרי שינה` : null,
                    property.bathrooms ? `${property.bathrooms} חדרי רחצה` : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
            {amenities.length > 0 && (
              <div className="deal-modal__detail-row">
                <BedDouble size={15} />
                <div className="deal-modal__detail-block">
                  <span className="deal-modal__detail-label">מתקנים משותפים</span>
                  <span>{amenities.join(' · ')}</span>
                </div>
              </div>
            )}
            {property.kosher_level !== 'not_applicable' && (
              <div className="deal-modal__detail-row">
                <Bath size={15} opacity={0.5} />
                <span>{kosherLabel(property.kosher_level)}</span>
              </div>
            )}
            {priceFrom && (
              <div className="deal-modal__detail-row">
                <span className="deal-modal__detail-label">{isMultiUnit ? 'החל מ-' : 'מחיר ללילה'}</span>
                <span>{Math.round(priceFrom)} {getCurrencySymbol(property.currency)}</span>
              </div>
            )}
          </motion.div>

          {property.description && <p className="deal-modal__desc">{property.description}</p>}

          {isMultiUnit && (
            <div style={{ marginTop: 20 }}>
              <h2 className="settings-card__title" style={{ marginBottom: 10 }}>יחידות במתחם</h2>
              {units.map((unit) => (
                <PropertyUnitCard
                  key={unit.id}
                  unit={unit}
                  currency={property.currency}
                  isSelected={unit.id === selectedUnitId}
                  onBook={handleBookUnit}
                />
              ))}
            </div>
          )}

          {!isClaimed && (
            <>
              <p className="deal-modal__desc" style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                המידע בעמוד זה נאסף ממקורות פומביים ועשוי להיות לא מעודכן.
                {property.source_url && (
                  <> לעמוד הרשמי: <a href={property.source_url} target="_blank" rel="noopener noreferrer">{property.source_url}</a></>
                )}
              </p>
              <div className="deal-modal__actions">
                {property.source_url && (
                  <a className="deal-modal__btn deal-modal__btn--hotel" href={property.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={16} /> לאתר הרשמי של הצימר
                  </a>
                )}
              </div>
              {isPendingClaim ? (
                <p className="deal-modal__desc">
                  <Clock size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                  תביעת הבעלות על נכס זה כבר הוגשה וממתינה לאישור מנהל.
                </p>
              ) : null}
              <p className="agent-form__hint" style={{ marginTop: 4 }}>
                לא רלוונטי? <Link to="/remove">בקשת הסרת הנכס</Link>
              </p>
              {!isPendingClaim && (
                <ClaimFlow propertyId={property.id} />
              )}
            </>
          )}

          {isClaimed && property.whatsapp && (
            <div className="deal-modal__actions">
              <a
                className="deal-modal__btn deal-modal__btn--wa"
                href={`https://wa.me/${property.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={18} /> WhatsApp
              </a>
            </div>
          )}
        </div>

        <div ref={bookingRef}>
          {selectedUnit && (
            <BookingRequestForm
              propertyId={property.id}
              unit={selectedUnit}
              unitName={isMultiUnit ? selectedUnit.name : null}
              currency={property.currency}
            />
          )}
        </div>
      </div>
    </div>
  );
}
