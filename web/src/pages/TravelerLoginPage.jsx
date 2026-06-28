import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';
import { userApi } from '../api/client.js';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';

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

        {errors.form && <p className="traveler-register-card__err" style={{ textAlign: 'center' }} role="alert">{errors.form}</p>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label" htmlFor="tl-email">אימייל</label>
            <input
              id="tl-email"
              className={`traveler-register-card__input${errors.email ? ' is-error' : ''}`}
              type="email"
              inputMode="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="name@gmail.com"
              autoFocus
              aria-describedby={errors.email ? 'tl-email-err' : undefined}
            />
            {errors.email && <p id="tl-email-err" className="traveler-register-card__err" role="alert">{errors.email}</p>}
          </div>

          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label" htmlFor="tl-password">סיסמה</label>
            <input
              id="tl-password"
              className={`traveler-register-card__input${errors.password ? ' is-error' : ''}`}
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(p => ({ ...p, password: '' })); }}
              placeholder="הסיסמה שלך"
              aria-describedby={errors.password ? 'tl-pw-err' : undefined}
            />
            {errors.password && <p id="tl-pw-err" className="traveler-register-card__err" role="alert">{errors.password}</p>}
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
