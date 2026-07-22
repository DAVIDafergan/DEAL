import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { ArrowLeft, Plane } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { adminApi, agentApi } from '../api/client.js';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';
import { Logo } from '../components/Logo.jsx';

export function AgentLoginPage() {
  const navigate = useNavigate();
  const { login, token, loading, register } = useAgentAuth();
  const { t } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!loading && token) navigate('/agent/dashboard', { replace: true });
  }, [loading, token, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      try {
        const { token: adminTok } = await adminApi.login(username, password);
        adminApi.setToken(adminTok);
        navigate('/admin', { replace: true });
        return;
      } catch {}
      await login(username, password);
      navigate('/agent/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'שגיאה בכניסה');
      setSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credential) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await agentApi.googleAuth(credential);
      if (res.isNew) {
        navigate(`/agent/register?googleEmail=${encodeURIComponent(res.email)}&googleName=${encodeURIComponent(res.name || '')}`);
        return;
      }
      const { token: agentTok } = res;
      localStorage.setItem('agent_token', agentTok);
      window.location.replace('/agent/dashboard');
    } catch (err) {
      setError(err.message || 'שגיאה בכניסה עם Google');
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="auth-page" dir="rtl">
      <Link to="/" className="auth-page__back">
        <ArrowLeft size={16} /> חזרה לדף הבית
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
            פלטפורמת הדילים הבלעדית לסוכני נסיעות מובילים
          </p>
        </div>

        <div className="auth-card__body">
          <GoogleLoginButton onSuccess={handleGoogleSuccess} />

          <div className="auth-card__divider">
            <span>או התחבר עם אימייל</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="al-username">
                {t.emailLabel || 'אימייל / שם משתמש'}
              </label>
              <input
                id="al-username"
                className="auth-form__input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                required
                autoComplete="username"
                placeholder="agent@example.com"
                aria-describedby={error ? 'al-error' : undefined}
              />
            </div>
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="al-password">
                {t.passwordLabel || 'סיסמה'}
              </label>
              <input
                id="al-password"
                className="auth-form__input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p
                id="al-error"
                className="auth-form__error"
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {error}
              </motion.p>
            )}

            <motion.button
              className="auth-form__btn"
              type="submit"
              disabled={submitting || !username || !password}
              whileTap={{ scale: 0.97 }}
            >
              {submitting ? 'מתחבר…' : t.loginButton || 'כניסה'}
            </motion.button>
          </form>

          <p className="auth-card__footer-note">
            אין לך חשבון?{' '}
            <Link to="/register" className="auth-card__footer-link">
              הרשמה כסוכן →
            </Link>
          </p>
        </div>
      </motion.div>

      {/* Decorative background */}
      <div className="auth-page__bg" aria-hidden="true">
        <Plane size={280} className="auth-page__bg-icon" />
      </div>
    </div>
  );
}
