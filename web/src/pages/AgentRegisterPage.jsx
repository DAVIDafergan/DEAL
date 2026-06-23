import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const slide = {
  enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: (dir) => ({ x: dir < 0 ? '60%' : '-60%', opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }),
};

function Field({ label, type = 'text', value, onChange, placeholder, hint, autoFocus, inputMode, error }) {
  const [touched, setTouched] = useState(false);
  const showErr = (touched || error) && error;
  return (
    <div className="agent-form__field">
      <label className="agent-form__label">{label}</label>
      <input
        className={`agent-form__input${showErr ? ' agent-form__input--error' : ''}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
      />
      {hint && !showErr && <span className="agent-form__hint">{hint}</span>}
      {showErr && <span className="agent-form__error-msg">{error}</span>}
    </div>
  );
}

export function AgentRegisterPage() {
  const navigate = useNavigate();
  const { register } = useAgentAuth();
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  const [form, setForm] = useState({
    business_name: '', email: '', password: '', phone: '', whatsapp_number: '', contact_name: '',
  });

  function set(key) { return (val) => setForm((f) => ({ ...f, [key]: val })); }

  function validateStep0() {
    const errs = {};
    if (!form.business_name.trim()) errs.business_name = t.requiredField || 'Required';
    if (!form.email.trim()) errs.email = t.requiredField || 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = t.invalidEmail || 'Invalid email';
    if (!form.password) errs.password = t.requiredField || 'Required';
    else if (form.password.length < 8) errs.password = t.passwordTooShort || 'Minimum 8 characters';
    return errs;
  }

  function goNext() {
    const errs = validateStep0();
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setDir(1);
    setStep(1);
  }

  function goBack() {
    setDir(-1);
    setStep(0);
  }

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
              <p className="agent-form__step-indicator">{t.agentRegisterStep || 'Step'} 1 / 2</p>
              <h2 className="agent-form__step-title">{t.agentRegisterStep1Title || "Let's get started"}</h2>
              <Field
                label={t.agencyNameLabel || 'Agency name'}
                value={form.business_name}
                onChange={set('business_name')}
                error={fieldErrors.business_name}
                autoFocus
              />
              <Field
                label={t.emailLabel || 'Email'}
                type="email"
                inputMode="email"
                value={form.email}
                onChange={set('email')}
                error={fieldErrors.email}
              />
              <Field
                label={t.passwordLabel || 'Password'}
                type="password"
                value={form.password}
                onChange={set('password')}
                hint={t.passwordHint || 'Minimum 8 characters'}
                error={fieldErrors.password}
              />
              <Field
                label={t.phoneLabel || 'Phone'}
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={set('phone')}
              />
              <Field
                label={t.whatsappLabel || 'WhatsApp number'}
                type="tel"
                inputMode="tel"
                value={form.whatsapp_number}
                onChange={set('whatsapp_number')}
                hint="+972501234567"
              />
              <motion.button
                type="button"
                className="agent-form__btn agent-form__btn--primary"
                whileTap={{ scale: 0.97 }}
                onClick={goNext}
              >
                {t.nextStepButton || 'Continue'} <ChevronRight size={18} />
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" className="agent-form__step" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <p className="agent-form__step-indicator">{t.agentRegisterStep || 'Step'} 2 / 2</p>
              <h2 className="agent-form__step-title">{t.agentRegisterStep2Title || 'Almost there!'}</h2>
              <Field
                label={t.contactNameLabel || 'Your name'}
                value={form.contact_name}
                onChange={set('contact_name')}
                hint={form.business_name || undefined}
                autoFocus
              />
              <p className="agent-form__info-note">
                {t.agentPendingNote || 'After registering, your account will be reviewed before going live. You can start uploading your first deal right away — it will be queued until approved.'}
              </p>
              {apiError && <p className="agent-form__api-error">{apiError}</p>}
              <div className="agent-form__actions">
                <button type="button" className="agent-form__btn agent-form__btn--ghost" onClick={goBack}>
                  {t.backButton || 'Back'}
                </button>
                <motion.button
                  type="button"
                  className="agent-form__btn agent-form__btn--primary"
                  disabled={submitting}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                >
                  {submitting ? (t.submittingLabel || 'Submitting…') : (t.registerSubmitButton || 'Create account')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" className="agent-form__step agent-form__step--success" custom={dir} variants={slide} initial="enter" animate="center" exit="exit">
              <CheckCircle size={56} color="var(--color-accent-from)" strokeWidth={1.5} />
              <h2 className="agent-form__step-title">{t.agentRegisteredTitle || "You're in!"}</h2>
              <p className="agent-form__info-note">
                {t.agentRegisteredNote || "Your account is pending review. Meanwhile, add your first deal — it'll go live once approved."}
              </p>
              <motion.button
                type="button"
                className="agent-form__btn agent-form__btn--primary"
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate('/agent/dashboard')}
              >
                {t.goToDashboardButton || 'Go to dashboard →'}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {step < 2 && (
          <p className="agent-form__footer-note">
            {t.alreadyHaveAccount || 'Already have an account?'}{' '}
            <Link to="/agent/login" className="agent-form__footer-link">
              {t.loginLink || 'Login'}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
