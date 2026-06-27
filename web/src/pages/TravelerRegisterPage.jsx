import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';
import { userApi } from '../api/client.js';

const TRAVELER_KEY = 'deal_radar_traveler';
const TRAVELER_TOKEN_KEY = 'traveler_token';

export function TravelerRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
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
      localStorage.setItem(TRAVELER_TOKEN_KEY, token);
      localStorage.setItem(TRAVELER_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email, joinedAt: Date.now() }));
      setDone(true);
    } catch (err) {
      setErrors({ form: err.message || 'שגיאה ברישום, נסה שנית' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential) {
    try {
      const { token, user } = await userApi.googleAuth(credential);
      localStorage.setItem(TRAVELER_TOKEN_KEY, token);
      localStorage.setItem(TRAVELER_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email, joinedAt: Date.now() }));
      setName(user.name);
      setDone(true);
    } catch (err) {
      setErrors({ form: err.message || 'שגיאת Google, נסה שנית' });
    }
  }

  if (done) {
    return (
      <div className="traveler-register-page">
        <motion.div
          className="traveler-register-card"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <CheckCircle size={52} strokeWidth={1.4} color="var(--ds-teal, #17c3b2)" />
          <h2 className="traveler-register-card__title">ברוך/ה הבא/ה, {name}!</h2>
          <p className="traveler-register-card__note">
            החשבון שלך נוצר. לחץ ❤️ על כל דיל כדי לשמור אותו למועדפים.
          </p>
          <motion.button
            className="traveler-register-card__btn"
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/')}
          >
            בוא נמצא דיל →
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="traveler-register-page">
      <motion.div
        className="traveler-register-card"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <Link to="/register" className="traveler-register-card__back">
          <ArrowRight size={14} /> חזרה לבחירה
        </Link>

        <h1 className="traveler-register-card__title">הצטרף כמטייל</h1>
        <p className="traveler-register-card__sub">שמור דילים, עקוב אחרי יעדים, קבל התראות</p>

        <div className="traveler-register-card__google">
          <GoogleLoginButton onSuccess={handleGoogleSuccess} />
        </div>

        <div className="traveler-register-card__divider"><span>או עם אימייל</span></div>

        {errors.form && <p className="traveler-register-card__err" style={{ textAlign: 'center' }}>{errors.form}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label" htmlFor="tr-name">שם *</label>
            <input
              id="tr-name"
              className={`traveler-register-card__input${errors.name ? ' is-error' : ''}`}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
              placeholder="איך לקרוא לך?"
              autoFocus
              aria-describedby={errors.name ? 'tr-name-err' : undefined}
              aria-invalid={errors.name ? 'true' : undefined}
            />
            {errors.name && <p id="tr-name-err" className="traveler-register-card__err" role="alert">{errors.name}</p>}
          </div>

          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label" htmlFor="tr-email">אימייל *</label>
            <input
              id="tr-email"
              className={`traveler-register-card__input${errors.email ? ' is-error' : ''}`}
              type="email"
              inputMode="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="name@gmail.com"
              aria-describedby={errors.email ? 'tr-email-err' : undefined}
              aria-invalid={errors.email ? 'true' : undefined}
            />
            {errors.email && <p id="tr-email-err" className="traveler-register-card__err" role="alert">{errors.email}</p>}
          </div>

          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label" htmlFor="tr-password">סיסמה *</label>
            <input
              id="tr-password"
              className={`traveler-register-card__input${errors.password ? ' is-error' : ''}`}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
              placeholder="לפחות 6 תווים"
              aria-describedby={errors.password ? 'tr-pw-err' : undefined}
              aria-invalid={errors.password ? 'true' : undefined}
            />
            {errors.password && <p id="tr-pw-err" className="traveler-register-card__err" role="alert">{errors.password}</p>}
          </div>

          <div className="traveler-register-card__terms">
            <label className="traveler-register-card__terms-label">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => { setTermsAccepted(e.target.checked); setErrors(p => ({ ...p, terms: '' })); }}
                className="traveler-register-card__checkbox"
              />
              קראתי ואני מאשר/ת את{' '}
              <Link to="/terms" className="traveler-register-card__link" target="_blank">תנאי השימוש</Link>
              {' '}ו
              <Link to="/privacy" className="traveler-register-card__link" target="_blank">מדיניות הפרטיות</Link>
            </label>
            {errors.terms && <p className="traveler-register-card__err">{errors.terms}</p>}
          </div>

          <motion.button
            type="submit"
            className="traveler-register-card__btn"
            whileTap={{ scale: 0.97 }}
            disabled={!termsAccepted || submitting}
          >
            {submitting ? 'רושם...' : 'יאללה, בוא נלך'}
          </motion.button>
        </form>

        <p className="traveler-register-card__footer">
          כבר יש לך חשבון?{' '}
          <Link to="/register/traveler/login" className="traveler-register-card__link">
            התחברות →
          </Link>
        </p>
        <p className="traveler-register-card__footer">
          סוכן נסיעות?{' '}
          <Link to="/agent/register" className="traveler-register-card__link">
            הרשמה כסוכן →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
