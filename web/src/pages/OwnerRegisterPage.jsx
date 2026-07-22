import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';

const slide = {
  enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: (dir) => ({ x: dir < 0 ? '60%' : '-60%', opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }),
};

function Field({ label, type = 'text', value, onChange, placeholder, hint, autoFocus, inputMode, error }) {
  const [touched, setTouched] = useState(false);
  const showErr = (touched || error) && error;
  const fieldId = `of-${label.replace(/[^a-z0-9֐-׿]/gi, '-').toLowerCase()}`;
  const errId = `${fieldId}-err`;
  return (
    <div className="agent-form__field">
      <label className="agent-form__label" htmlFor={fieldId}>{label}</label>
      <input
        id={fieldId}
        className={`agent-form__input${showErr ? ' agent-form__input--error' : ''}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
        aria-describedby={showErr ? errId : undefined}
        aria-invalid={showErr ? 'true' : undefined}
      />
      {hint && !showErr && <span className="agent-form__hint">{hint}</span>}
      {showErr && <span id={errId} className="agent-form__error-msg" role="alert">{error}</span>}
    </div>
  );
}

/** OwnerRegisterPage — same 2-step shell as AgentRegisterPage, property-owner fields + account_type. */
export function OwnerRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/owner/dashboard';
  const { register } = useAgentAuth();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    business_name: '', email: '', password: '', phone: '', whatsapp_number: '', contact_name: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  function set(key) { return (val) => setForm((f) => ({ ...f, [key]: val })); }

  function validateStep0() {
    const errs = {};
    if (!form.business_name.trim()) errs.business_name = 'שדה חובה';
    if (!form.email.trim()) errs.email = 'שדה חובה';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'אימייל לא תקין';
    if (!form.password) errs.password = 'שדה חובה';
    else if (form.password.length < 8) errs.password = 'לפחות 8 תווים';
    if (!termsAccepted) errs.terms = 'יש לאשר את תנאי השימוש';
    return errs;
  }

  function goNext() {
    const errs = validateStep0();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setDir(1);
    setStep(1);
  }

  function goBack() { setDir(-1); setStep(0); }

  async function handleSubmit() {
    setSubmitting(true);
    setApiError(null);
    try {
      await register({
        business_name: form.business_name,
        contact_name: form.contact_name || form.business_name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        whatsapp_number: form.whatsapp_number,
        account_type: 'property_owner',
      });
      setDir(1);
      setStep(2);
    } catch (err) {
      setApiError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="agent-register-page">
      <Link to="/" className="agent-form__back-home">
        <ArrowLeft size={16} /> חזרה לדף הבית
      </Link>
      <div className="agent-form">
        <AnimatePresence mode="wait" custom={dir}>
          {step === 0 && (
            <motion.div key="step0" className="agent-form__step" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <p className="agent-form__step-indicator">שלב 1 / 2</p>
              <h2 className="agent-form__step-title">בואו נתחיל</h2>
              <Field label="שם הצימר / הווילה" value={form.business_name} onChange={set('business_name')} error={fieldErrors.business_name} autoFocus />
              <Field label="אימייל" type="email" inputMode="email" value={form.email} onChange={set('email')} error={fieldErrors.email} />
              <Field label="סיסמה" type="password" value={form.password} onChange={set('password')} hint="לפחות 8 תווים" error={fieldErrors.password} />
              <Field label="טלפון" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
              <Field label="מספר WhatsApp" type="tel" inputMode="tel" value={form.whatsapp_number} onChange={set('whatsapp_number')} hint="+972501234567" />
              <label className="agent-form__terms-row">
                <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="agent-form__terms-checkbox" />
                <span className="agent-form__terms-text">
                  קראתי ואני מסכים/ה ל
                  <Link to="/terms" target="_blank" className="agent-form__terms-link">תנאי שימוש</Link>
                  {' '}ו
                  <Link to="/privacy" target="_blank" className="agent-form__terms-link">מדיניות פרטיות</Link>
                </span>
              </label>
              {fieldErrors.terms && <p className="agent-form__error-msg">{fieldErrors.terms}</p>}
              <motion.button type="button" className="agent-form__btn agent-form__btn--primary" whileTap={{ scale: 0.97 }} onClick={goNext}>
                המשך <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" className="agent-form__step" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <p className="agent-form__step-indicator">שלב 2 / 2</p>
              <h2 className="agent-form__step-title">כמעט סיימנו!</h2>
              <Field label="השם שלך" value={form.contact_name} onChange={set('contact_name')} hint={form.business_name || undefined} autoFocus />
              <p className="agent-form__info-note">
                לאחר ההרשמה תוכלו להוסיף את הנכס הראשון שלכם מיד מהדשבורד.
              </p>
              {apiError && <p className="agent-form__api-error">{apiError}</p>}
              <div className="agent-form__actions">
                <button type="button" className="agent-form__btn agent-form__btn--ghost" onClick={goBack}>חזרה</button>
                <motion.button type="button" className="agent-form__btn agent-form__btn--primary" disabled={submitting} whileTap={{ scale: 0.97 }} onClick={handleSubmit}>
                  {submitting ? 'שולח…' : 'צור חשבון'}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" className="agent-form__step agent-form__step--success" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <CheckCircle size={56} color="var(--color-accent-from)" strokeWidth={1.5} />
              <h2 className="agent-form__step-title">ברוכים הבאים!</h2>
              <p className="agent-form__info-note">
                החשבון שלכם נוצר. הוסיפו את הנכס הראשון שלכם עכשיו.
              </p>
              <motion.button type="button" className="agent-form__btn agent-form__btn--primary" whileTap={{ scale: 0.97 }} onClick={() => navigate(redirectTo)}>
                לדשבורד ←
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 2 && (
          <p className="agent-form__footer-note">
            כבר יש לך חשבון?{' '}
            <Link to="/owner/login" className="agent-form__footer-link">התחברות</Link>
          </p>
        )}
      </div>
    </div>
  );
}
