import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { adminApi, agentApi } from '../api/client.js';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';
import { Logo } from '../components/Logo.jsx';

/** OwnerLoginPage — same auth-card shell as AgentLoginPage, owner copy + owner dashboard redirect. */
export function OwnerLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, token, loading } = useAgentAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Only ever redirect to a relative in-app path — never let ?next= drive an open redirect.
  const next = searchParams.get('next');
  const redirectTo = next && next.startsWith('/') && !next.startsWith('//') ? next : '/owner/dashboard';

  useEffect(() => {
    if (!loading && token) navigate(redirectTo, { replace: true });
  }, [loading, token, navigate, redirectTo]);

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
      navigate(redirectTo, { replace: true });
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
        navigate(`/owner/register?googleEmail=${encodeURIComponent(res.email)}&googleName=${encodeURIComponent(res.name || '')}`);
        return;
      }
      const { token: ownerTok } = res;
      localStorage.setItem('agent_token', ownerTok);
      window.location.replace('/owner/dashboard');
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
        <div className="auth-card__hero">
          <div className="auth-card__logo">
            <Logo size={42} />
          </div>
          <h1 className="auth-card__welcome">ברוכים הבאים</h1>
          <p className="auth-card__sub">האזור האישי לבעלי צימרים ווילות</p>
        </div>

        <div className="auth-card__body">
          <GoogleLoginButton onSuccess={handleGoogleSuccess} />

          <div className="auth-card__divider"><span>או התחבר עם אימייל</span></div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="ol-username">אימייל / שם משתמש</label>
              <input
                id="ol-username"
                className="auth-form__input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
                autoComplete="username"
                placeholder="owner@example.com"
                aria-describedby={error ? 'ol-error' : undefined}
              />
            </div>
            <div className="auth-form__field">
              <label className="auth-form__label" htmlFor="ol-password">סיסמה</label>
              <input
                id="ol-password"
                className="auth-form__input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <motion.p id="ol-error" className="auth-form__error" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                {error}
              </motion.p>
            )}

            <motion.button className="auth-form__btn" type="submit" disabled={submitting || !username || !password} whileTap={{ scale: 0.97 }}>
              {submitting ? 'מתחבר…' : 'כניסה'}
            </motion.button>
          </form>

          <p className="auth-card__footer-note">
            אין לך חשבון?{' '}
            <Link to="/owner/register" className="auth-card__footer-link">הרשמה כבעל צימר →</Link>
          </p>
        </div>
      </motion.div>

      <div className="auth-page__bg" aria-hidden="true">
        <Home size={280} className="auth-page__bg-icon" />
      </div>
    </div>
  );
}
