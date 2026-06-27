import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';
import { userApi } from '../api/client.js';

const TRAVELER_KEY = 'deal_radar_traveler';
const TRAVELER_TOKEN_KEY = 'traveler_token';

export function TravelerLoginPage() {
  const navigate = useNavigate();
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
      localStorage.setItem(TRAVELER_TOKEN_KEY, token);
      localStorage.setItem(TRAVELER_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
      navigate('/');
    } catch (err) {
      setErrors({ form: err.message || 'שגיאה בהתחברות' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential) {
    try {
      const { token, user } = await userApi.googleAuth(credential);
      localStorage.setItem(TRAVELER_TOKEN_KEY, token);
      localStorage.setItem(TRAVELER_KEY, JSON.stringify({ id: user.id, name: user.name, email: user.email }));
      navigate('/');
    } catch (err) {
      setErrors({ form: err.message || 'שגיאת Google' });
    }
  }

  return (
    <div className="traveler-register-page">
      <motion.div
        className="traveler-register-card"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
      >
        <Link to="/register/traveler" className="traveler-register-card__back">
          <ArrowRight size={14} /> הרשמה
        </Link>

        <h1 className="traveler-register-card__title">התחברות מטייל</h1>
        <p className="traveler-register-card__sub">ברוך/ה שבת! המשך לדילים שלך</p>

        <div className="traveler-register-card__google">
          <GoogleLoginButton onSuccess={handleGoogleSuccess} />
        </div>

        <div className="traveler-register-card__divider"><span>או עם אימייל</span></div>

        {errors.form && <p className="traveler-register-card__err" style={{ textAlign: 'center' }}>{errors.form}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label">אימייל</label>
            <input
              className={`traveler-register-card__input${errors.email ? ' is-error' : ''}`}
              type="email"
              inputMode="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="name@gmail.com"
              autoFocus
            />
            {errors.email && <p className="traveler-register-card__err">{errors.email}</p>}
          </div>

          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label">סיסמה</label>
            <input
              className={`traveler-register-card__input${errors.password ? ' is-error' : ''}`}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
              placeholder="הסיסמה שלך"
            />
            {errors.password && <p className="traveler-register-card__err">{errors.password}</p>}
          </div>

          <motion.button
            type="submit"
            className="traveler-register-card__btn"
            whileTap={{ scale: 0.97 }}
            disabled={submitting}
          >
            {submitting ? 'מתחבר...' : 'התחבר'}
          </motion.button>
        </form>

        <p className="traveler-register-card__footer">
          אין עדיין חשבון?{' '}
          <Link to="/register/traveler" className="traveler-register-card__link">
            הרשמה →
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
