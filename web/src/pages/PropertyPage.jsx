import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, MessageCircle, CheckCircle, ExternalLink, Users, Bath, ShieldAlert, Send, Clock, Heart, Share2, CalendarClock, Info } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { regionLabel, propertyTypeLabel, kosherLabel } from '../data/propertyOptions.js';
import { PropertyGallery } from '../components/property/PropertyGallery.jsx';
import { PropertyAmenitiesBar } from '../components/property/PropertyAmenitiesBar.jsx';
import { PropertyUnitsTable } from '../components/property/PropertyUnitsTable.jsx';
import { PublicAvailabilityCalendar } from '../components/property/PublicAvailabilityCalendar.jsx';
import { OwnerCard } from '../components/property/OwnerCard.jsx';
import { PropertyPageSkeleton } from '../components/property/PropertyPageSkeleton.jsx';
import { PropertyGrid } from '../components/PropertyGrid.jsx';

/** BackLink — 7.8: "כפתור חזרה ששומר על מצב החיפוש והגלילה". Going back in browser history
 * (rather than a hard Link to "/") preserves the previous page's URL query params (7.2's filter
 * state lives there) and its scroll position automatically. Falls back to a plain link home when
 * there's no in-app history to go back to (e.g. the property page was opened directly/shared). */
function BackLink({ className, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== 'default';
  if (hasHistory) {
    return <button type="button" className={className} onClick={() => navigate(-1)}>{children}</button>;
  }
  return <Link to="/" className={className}>{children}</Link>;
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

// 7.8: "ולידציה תוך כדי הקלדה, הודעה ליד השדה הבעייתי, גלילה אליו אוטומטית"
function validateBookingForm(form) {
  const errors = {};
  if (!form.check_in) errors.check_in = 'יש לבחור תאריך כניסה';
  if (!form.check_out) errors.check_out = 'יש לבחור תאריך יציאה';
  if (form.check_in && form.check_out && form.check_out <= form.check_in) {
    errors.check_out = 'תאריך היציאה חייב להיות אחרי תאריך הכניסה';
  }
  if (!form.customer_name.trim()) errors.customer_name = 'יש להזין שם מלא';
  if (!form.customer_phone.trim()) errors.customer_phone = 'יש להזין מספר טלפון';
  else if (form.customer_phone.replace(/[^0-9]/g, '').length < 9) errors.customer_phone = 'מספר הטלפון קצר מדי';
  return errors;
}

function BookingRequestForm({ propertyId, unit, unitName, currency }) {
  const [form, setForm] = useState({ check_in: '', check_out: '', guest_count: 2, customer_name: '', customer_phone: '', customer_email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // 'success' | 'error' | null
  const [confirmation, setConfirmation] = useState(null); // { id, priceEstimate }
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState({});
  const fieldRefs = useRef({});

  function set(key) {
    return (e) => {
      const next = { ...form, [key]: e.target.value };
      setForm(next);
      if (touched[key]) setFieldErrors(validateBookingForm(next));
    };
  }
  function markTouched(key) {
    return () => {
      setTouched((t) => ({ ...t, [key]: true }));
      setFieldErrors(validateBookingForm(form));
    };
  }

  const priceEstimate = estimatePrice(unit, form.check_in, form.check_out);

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validateBookingForm(form);
    setFieldErrors(errors);
    setTouched({ check_in: true, check_out: true, customer_name: true, customer_phone: true });
    const firstErrorKey = Object.keys(errors)[0];
    if (firstErrorKey) {
      fieldRefs.current[firstErrorKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldRefs.current[firstErrorKey]?.focus();
      return;
    }
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
    <form onSubmit={handleSubmit} noValidate className="settings-card" style={{ marginTop: 16 }}>
      <h2 className="settings-card__title">בקשת הזמנה{unitName ? ` — ${unitName}` : ''}</h2>
      <div className="agent-form__field">
        <label className="agent-form__label">תאריך כניסה</label>
        <input
          ref={(el) => (fieldRefs.current.check_in = el)}
          className={`agent-form__input${fieldErrors.check_in ? ' agent-form__input--error' : ''}`}
          type="date" value={form.check_in} onChange={set('check_in')} onBlur={markTouched('check_in')}
        />
        {fieldErrors.check_in && <p className="agent-form__error-msg">{fieldErrors.check_in}</p>}
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">תאריך יציאה</label>
        <input
          ref={(el) => (fieldRefs.current.check_out = el)}
          className={`agent-form__input${fieldErrors.check_out ? ' agent-form__input--error' : ''}`}
          type="date" value={form.check_out} onChange={set('check_out')} onBlur={markTouched('check_out')}
        />
        {fieldErrors.check_out && <p className="agent-form__error-msg">{fieldErrors.check_out}</p>}
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">מספר אורחים</label>
        <input className="agent-form__input" type="number" min="1" value={form.guest_count} onChange={set('guest_count')} />
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">שם מלא</label>
        <input
          ref={(el) => (fieldRefs.current.customer_name = el)}
          className={`agent-form__input${fieldErrors.customer_name ? ' agent-form__input--error' : ''}`}
          value={form.customer_name} onChange={set('customer_name')} onBlur={markTouched('customer_name')}
        />
        {fieldErrors.customer_name && <p className="agent-form__error-msg">{fieldErrors.customer_name}</p>}
      </div>
      <div className="agent-form__field">
        <label className="agent-form__label">טלפון</label>
        <input
          ref={(el) => (fieldRefs.current.customer_phone = el)}
          className={`agent-form__input${fieldErrors.customer_phone ? ' agent-form__input--error' : ''}`}
          type="tel" value={form.customer_phone} onChange={set('customer_phone')} onBlur={markTouched('customer_phone')}
        />
        {fieldErrors.customer_phone && <p className="agent-form__error-msg">{fieldErrors.customer_phone}</p>}
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
  const [similar, setSimilar] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const bookingRef = useRef(null);
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    propertyApi.get(id)
      .then(({ property: p }) => {
        setProperty(p);
        setSelectedUnitId(p.units?.[0]?.id ?? null);
        propertyApi.search({ region: p.region, limit: 5 })
          .then(({ properties: list }) => setSimilar((list || []).filter((x) => x.id !== p.id).slice(0, 4)))
          .catch(() => setSimilar([]));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: property.name, url }); return; } catch { /* fall through to clipboard */ }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  if (loading) return <div dir="rtl"><PropertyPageSkeleton /></div>;
  if (error || !property) {
    return (
      <div className="agent-social-profile agent-social-profile--error" dir="rtl">
        <p>הנכס לא נמצא</p>
        <BackLink className="agent-social-profile__back-clean">← חזרה</BackLink>
      </div>
    );
  }

  const isClaimed = property.status === 'claimed' || property.status === 'active';
  const isPendingClaim = property.status === 'pending';
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

  const favKey = { id: property.id, deal_source: 'property', name: property.name, image: property.owner_images?.[0] };

  return (
    <div className="pp" dir="rtl">
      <div className="pp__topbar container">
        <BackLink className="agent-social-profile__back-clean">
          <ArrowLeft size={14} /> חזרה
        </BackLink>
      </div>

      <nav className="property-breadcrumbs container" aria-label="פירורי לחם">
        <Link to="/">בית</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <Link to={`/?region=${property.region}`}>{regionLabel(property.region)}</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <span aria-current="page">{property.name}</span>
      </nav>

      <div className="container pp__layout">
        <div className="pp__main">
          {isClaimed ? (
            <PropertyGallery images={property.owner_images || []} alt={property.name} />
          ) : (
            <div className="deal-modal__media" style={{ borderRadius: 'var(--radius-lg)', height: 320 }}>
              <div className="deal-modal__media-placeholder" />
              <div className="deal-modal__media-gradient" />
              <div className="deal-modal__price-overlay">
                <span className="adc__exclusive-badge" style={{ position: 'static' }}>
                  <ShieldAlert size={12} /> בעל הנכס טרם אימת את העמוד
                </span>
              </div>
            </div>
          )}

          <div className="pp__header">
            <div>
              <h1 className="pp__title">{property.name}</h1>
              <p className="pp__subtitle">
                {propertyTypeLabel(property.property_type)} · {regionLabel(property.region)}{property.city ? ` · ${property.city}` : ''}
              </p>
              {isClaimed && property.owner_id && (
                <span className="pp__verified-badge">
                  <CheckCircle size={13} /> מאומת ע"י הבעלים
                </span>
              )}
            </div>
            <div className="pp__header-actions">
              <button type="button" className={`pp__icon-btn${isFavorite(favKey) ? ' is-fav' : ''}`} onClick={() => toggleFavorite(favKey)} aria-label="הוסף למועדפים">
                <Heart size={18} />
              </button>
              <button type="button" className="pp__icon-btn" onClick={handleShare} aria-label="שתף">
                <Share2 size={18} />
              </button>
              {shareCopied && <span className="pp__share-toast">הקישור הועתק!</span>}
            </div>
          </div>

          <PropertyAmenitiesBar property={property} />

          <motion.div className="deal-modal__details" initial="hidden" animate="visible">
            {Boolean(capacity || bedrooms || property.bathrooms) && (
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
            <section className="pp__section">
              <h2 className="pp__section-title">יחידות במתחם</h2>
              <PropertyUnitsTable
                units={units}
                currency={property.currency}
                selectedUnitId={selectedUnitId}
                onSelectUnit={setSelectedUnitId}
                onBook={() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
            </section>
          )}

          {isClaimed && selectedUnit && (
            <section className="pp__section">
              <h2 className="pp__section-title"><CalendarClock size={17} /> לוח זמינות</h2>
              <PublicAvailabilityCalendar propertyId={property.id} unitId={isMultiUnit ? selectedUnit.id : undefined} />
            </section>
          )}

          {isClaimed && <OwnerCard owner={property.owner} />}

          <section className="pp__section pp__policies">
            <h2 className="pp__section-title"><Info size={17} /> מדיניות</h2>
            <ul className="pp__policies-list">
              <li>שעות צ׳ק אין/אאוט — לתיאום ישיר מול בעל הנכס</li>
              <li>מינימום לילות: {selectedUnit?.min_nights || property.min_nights || 1}</li>
              <li>מדיניות ביטולים — לבירור מול בעל הנכס לפני אישור ההזמנה</li>
            </ul>
          </section>

          {!isClaimed && (
            <section className="pp__section">
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
            </section>
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

          {similar.length > 0 && (
            <section className="pp__section pp__similar">
              <h2 className="pp__section-title">נכסים דומים באזור</h2>
              <PropertyGrid properties={similar} isLoading={false} />
            </section>
          )}
        </div>

        <div className="pp__booking" ref={bookingRef}>
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

      {/* 9.4 mobile sticky bar — price + CTA only; taps scroll to the real form above */}
      {priceFrom && (
        <div className="pp__mobile-bar">
          <div>
            <strong>{Math.round(priceFrom)} {getCurrencySymbol(property.currency)}</strong>
            <span>ללילה</span>
          </div>
          <button type="button" onClick={() => bookingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            הזמן עכשיו
          </button>
        </div>
      )}
    </div>
  );
}
