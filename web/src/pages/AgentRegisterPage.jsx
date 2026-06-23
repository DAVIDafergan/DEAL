import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, CheckCircle } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } },
  exit: (dir) => ({ x: dir < 0 ? '60%' : '-60%', opacity: 0, transition: { duration: 0.25, ease: 'easeIn' } }),
};

function Field({ label, type = 'text', value, onChange, placeholder, required, autoFocus, inputMode }) {
  const [touched, setTouched] = useState(false);
  const invalid = touched && required && !value.trim();
  return (
    <div className="agent-form__field">
      <label className="agent-form__label">{label}{required && <span className="agent-form__required"> *</span>}</label>
      <input
        className={`agent-form__input${invalid ? ' agent-form__input--error' : ''}`}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        inputMode={inputMode}
      />
      {invalid && <span className="agent-form__error-msg">Required</span>}
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
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    business_name: '', email: '', password: '', phone: '', whatsapp_number: '',
    contact_name: '',
  });

  function set(key) { return (val) => setForm((f) => ({ ...f, [key]: val })); }

  function goNext() { setDir(1); setStep((s) => s + 1); }
  function goBack() { setDir(-1); setStep((s) => s - 1); }

  const step0Valid = form.business_name.trim() && form.email.trim() && form.password.trim().length >= 8;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
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
      setStep(2); // success step
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const steps = [
    // Step 0: minimal required fields
    <motion.div key="step0" className="agent-form__step" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
      <p className="agent-form__step-indicator">{t.agentRegisterStep || 'Step'} 1 / 2</p>
      <h2 className="agent-form__step-title">{t.agentRegisterStep1Title || "Let's get started"}</h2>
      <Field label={t.agencyNameLabel || 'Agency name'} value={form.business_name} onChange={set('business_name')} required autoFocus />
      <Field label={t.emailLabel || 'Email'} type="email" inputMode="email" value={form.email} onChange={set('email')} required />
      <Field label={t.passwordLabel || 'Password'} type="password" value={form.password} onChange={set('password')} placeholder="Minimum 8 characters" required />
      <Field label={t.phoneLabel || 'Phone'} type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} />
      <Field label={t.whatsappLabel || 'WhatsApp number'} type="tel" inputMode="tel" value={form.whatsapp_number} onChange={set('whatsapp_number')} placeholder="+972501234567" />
      <motion.button
        className="agent-form__btn agent-form__btn--primary"
        disabled={!step0Valid}
        whileTap={{ scale: 0.97 }}
        onClick={goNext}
      >
        {t.nextStepButton || 'Continue'} <ChevronRight size={18} />
      </motion.button>
    </motion.div>,

    // Step 1: confirmation + submit
    <motion.div key="step1" className="agent-form__step" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
      <p className="agent-form__step-indicator">{t.agentRegisterStep || 'Step'} 2 / 2</p>
      <h2 className="agent-form__step-title">{t.agentRegisterStep2Title || 'Almost there!'}</h2>
      <Field label={t.contactNameLabel || 'Your name'} value={form.contact_name} onChange={set('contact_name')} placeholder={form.business_name} autoFocus />
      <p className="agent-form__info-note">{t.agentPendingNote || "After registering, your account will be reviewed before going live. You can start uploading your first deal right away — it will be queued until approved."}</p>
      {error && <p className="agent-form__api-error">{error}</p>}
      <div className="agent-form__actions">
        <button className="agent-form__btn agent-form__btn--ghost" onClick={goBack}>{t.backButton || 'Back'}</button>
        <motion.button
          className="agent-form__btn agent-form__btn--primary"
          disabled={submitting}
          whileTap={{ scale: 0.97 }}
          onClick={handleSubmit}
        >
          {submitting ? (t.submittingLabel || 'Submitting…') : (t.registerSubmitButton || 'Create account')}
        </motion.button>
      </div>
    </motion.div>,

    // Step 2: success
    <motion.div key="step2" className="agent-form__step agent-form__step--success" custom={dir} variants={slideVariants} initial="enter" animate="center" exit="exit">
      <CheckCircle size={56} color="var(--color-accent-from)" strokeWidth={1.5} />
      <h2 className="agent-form__step-title">{t.agentRegisteredTitle || "You're in!"}</h2>
      <p className="agent-form__info-note">{t.agentRegisteredNote || "Your account is pending review. Meanwhile, add your first deal — it'll go live once approved."}</p>
      <motion.button
        className="agent-form__btn agent-form__btn--primary"
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate('/agent/dashboard')}
      >
        {t.goToDashboardButton || 'Go to dashboard →'}
      </motion.button>
    </motion.div>,
  ];

  return (
    <div className="agent-register-page">
      <div className="agent-form">
        <AnimatePresence mode="wait" custom={dir}>{steps[step]}</AnimatePresence>
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
