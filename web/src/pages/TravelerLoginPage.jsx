import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Globe } from 'lucide-react';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';
import { userApi } from '../api/client.js';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { Logo } from '../components/Logo.jsx';

export function TravelerLoginPage() {
  const navigate = useNavigate();
  const { travelerLogin } = useTravelerAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!email.trim()) errs.email = 'נדרשת כתובת אימייל';
    if (!password) errs.password = 'נדרשת סיסמה';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      const { token, user } = await userApi.login(email.trim(), password);
      travelerLogin(token, user);
      navigate('/');
    } catch (err) {
      setErrors({ form: err.message || 'שגיאה בהתחברות — בדוק אימייל וסיסמה' });
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
      setErrors({ form: err.message || 'שגיאת Google' });
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <Link to="/register/traveler" className="auth-page__back">
        <ArrowLeft size={16} /> הרשמה
      </Link>

      <motion.div
        className="auth-card"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="auth-card__hero">
          <div className="auth-card__logo">
            <Logo size={42} />
          </div>
          <h1 className="auth-card__welcome">ברוכים הבאים</h1>
          <p className="auth-card__sub">ברוך/ה שבת! המשך לדילים שלך</p>
        </div>

        <div className="auth-card__body">
          <GoogleLoginButton onSuccess={handleGoogleSuccess} />

          <div className="auth-card__divider">
            <span>או התחבר עם אימייל</span>
          </div>

          {errors.form && (
            <motion.p className="auth-form__error" role="alert" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {errors.form}
            </motion.p>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="tl-email">אימייל</label>
              <input
                id="tl-email"
                className={`auth-form__input${errors.email ? ' is-error' : ''}`}
                type="email"
                inputMode="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
                placeholder="name@gmail.com"
                autoFocus
                aria-describedby={errors.email ? 'tl-email-err' : undefined}
              />
              {errors.email && <p id="tl-email-err" className="auth-form__field-err" role="alert">{errors.email}</p>}
            </div>

            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="tl-password">סיסמה</label>
              <input
                id="tl-password"
                className={`auth-form__input${errors.password ? ' is-error' : ''}`}
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
                placeholder="הסיסמה שלך"
                aria-describedby={errors.password ? 'tl-pw-err' : undefined}
              />
              {errors.password && <p id="tl-pw-err" className="auth-form__field-err" role="alert">{errors.password}</p>}
            </div>

            <motion.button
              type="submit"
              className="auth-form__btn"
              whileTap={{ scale: 0.97 }}
              disabled={submitting}
            >
              {submitting ? 'מתחבר…' : 'כניסה'}
            </motion.button>
          </form>

          <p className="auth-card__footer-note">
            אין עדיין חשבון?{' '}
            <Link to="/register/traveler" className="auth-card__footer-link">הרשמה →</Link>
          </p>
        </div>
      </motion.div>

      <div className="auth-page__bg" aria-hidden="true">
        <Globe size={260} className="auth-page__bg-icon" />
      </div>
    </div>
  );
}
