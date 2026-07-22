import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { ArrowLeft, Globe } from 'lucide-react';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';
import { userApi } from '../api/client.js';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { Logo } from '../components/Logo.jsx';

export function TravelerRegisterPage() {
  const navigate = useNavigate();
  const { travelerLogin } = useTravelerAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'נדרש שם';
    if (!email.trim()) e.email = 'נדרשת כתובת אימייל';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'האימייל אינו תקין — בדוק שכתבת כתובת מלאה';
    if (!password || password.length < 6) e.password = 'סיסמה חייבת להכיל לפחות 6 תווים';
    if (!termsAccepted) e.terms = 'יש לאשר את תנאי השימוש';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const { token, user } = await userApi.register({ name: name.trim(), email: email.trim(), password });
      travelerLogin(token, user);
      navigate('/');
    } catch (err) {
      setErrors({ form: err.message || 'שגיאה ברישום, נסה שנית' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential) {
    try {
      const { token, user } = await userApi.googleAuth(credential);
      travelerLogin(token, user);
      navigate('/');
    } catch (err) {
      setErrors({ form: err.message || 'שגיאת Google, נסה שנית' });
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <Link to="/register" className="auth-page__back">
        <ArrowLeft size={16} /> חזרה לבחירה
      </Link>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="auth-card__hero">
          <div className="auth-card__logo">
            <Logo size={42} />
          </div>
          <h1 className="auth-card__welcome">ברוכים הבאים</h1>
          <p className="auth-card__sub">
            הצטרף לקהילת המטיילים החכמים של ישראל
          </p>
        </div>

        <div className="auth-card__body">
          <GoogleLoginButton onSuccess={handleGoogleSuccess} />

          <div className="auth-card__divider">
            <span>או הירשם עם אימייל</span>
          </div>

          {errors.form && (
            <motion.p className="auth-form__error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {errors.form}
            </motion.p>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="tr-name">שם מלא *</label>
              <input
                id="tr-name"
                className={`auth-form__input${errors.name ? ' is-error' : ''}`}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
                placeholder="ישראל ישראלי"
                autoFocus
                aria-describedby={errors.name ? 'tr-name-err' : undefined}
              />
              {errors.name && <p id="tr-name-err" className="auth-form__field-err" role="alert">{errors.name}</p>}
            </div>

            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="tr-email">אימייל *</label>
              <input
                id="tr-email"
                className={`auth-form__input${errors.email ? ' is-error' : ''}`}
                type="email"
                inputMode="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="name@gmail.com"
                aria-describedby={errors.email ? 'tr-email-err' : undefined}
              />
              {errors.email && <p id="tr-email-err" className="auth-form__field-err" role="alert">{errors.email}</p>}
            </div>

            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="tr-password">סיסמה *</label>
              <input
                id="tr-password"
                className={`auth-form__input${errors.password ? ' is-error' : ''}`}
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                placeholder="לפחות 6 תווים"
                aria-describedby={errors.password ? 'tr-pw-err' : undefined}
              />
              {errors.password && <p id="tr-pw-err" className="auth-form__field-err" role="alert">{errors.password}</p>}
            </div>

            <label className="auth-form__terms">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => { setTermsAccepted(e.target.checked); setErrors(p => ({ ...p, terms: '' })); }}
              />
              <span>
                קראתי ואני מאשר/ת את{' '}
                <Link to="/terms" className="auth-form__terms-link" target="_blank">תנאי השימוש</Link>
                {' '}ו
                <Link to="/privacy" className="auth-form__terms-link" target="_blank">מדיניות הפרטיות</Link>
              </span>
            </label>
            {errors.terms && <p className="auth-form__field-err" role="alert">{errors.terms}</p>}

            <motion.button
              type="submit"
              className="auth-form__btn"
              whileTap={{ scale: 0.97 }}
              disabled={!termsAccepted || submitting}
            >
              {submitting ? 'רושם…' : 'יאללה, בוא נלך 🚀'}
            </motion.button>
          </form>

          <p className="auth-card__footer-note">
            כבר יש לך חשבון?{' '}
            <Link to="/register/traveler/login" className="auth-card__footer-link">התחברות →</Link>
          </p>
          <p className="auth-card__footer-note">
            סוכן נסיעות?{' '}
            <Link to="/agent/register" className="auth-card__footer-link">הרשמה כסוכן →</Link>
          </p>
        </div>
      </motion.div>

      <div className="auth-page__bg" aria-hidden="true">
        <Globe size={260} className="auth-page__bg-icon" />
      </div>
    </div>
  );
}
