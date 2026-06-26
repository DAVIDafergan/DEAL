import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { adminApi, agentApi } from '../api/client.js';
import { GoogleLoginButton } from '../components/GoogleLoginButton.jsx';

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
      // Try admin login first (works with non-email usernames like "admin")
      try {
        const { token: adminTok } = await adminApi.login(username, password);
        adminApi.setToken(adminTok);
        navigate('/admin', { replace: true });
        return;
      } catch {}
      // Fall through to agent login
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
        // New Google user — go to agent registration with pre-filled values
        navigate(`/agent/register?googleEmail=${encodeURIComponent(res.email)}&googleName=${encodeURIComponent(res.name || '')}`);
        return;
      }
      // Existing agent — store token via context
      const { token: agentTok, agent } = res;
      localStorage.setItem('agent_token', agentTok);
      // Trigger context re-hydration via page reload (simplest reliable approach)
      window.location.replace('/agent/dashboard');
    } catch (err) {
      setError(err.message || 'שגיאה בכניסה עם Google');
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="agent-register-page">
      <Link to="/" className="agent-form__back-home">
        <ArrowLeft size={16} /> {t.backToFeedButton || '← חזרה'}
      </Link>
      <motion.div
        className="agent-form"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h2 className="agent-form__step-title">{t.agentLoginTitle || 'כניסה לסוכנים'}</h2>

        <GoogleLoginButton onSuccess={handleGoogleSuccess} />

        <div className="agent-form__divider">
          <span>או</span>
        </div>

        <form onSubmit={handleSubmit} className="agent-form__step">
          <div className="agent-form__field">
            <label className="agent-form__label">{t.emailLabel || 'Email / שם משתמש'}</label>
            <input
              className="agent-form__input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              required
              autoComplete="username"
            />
          </div>
          <div className="agent-form__field">
            <label className="agent-form__label">{t.passwordLabel || 'סיסמה'}</label>
            <input
              className="agent-form__input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && <p className="agent-form__api-error">{error}</p>}
          <motion.button
            className="agent-form__btn agent-form__btn--primary"
            type="submit"
            disabled={submitting || !username || !password}
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? (t.submittingLabel || 'מתחבר…') : (t.loginButton || 'כניסה')}
          </motion.button>
        </form>
        <p className="agent-form__footer-note">
          {t.noAccountPrompt || 'אין לך חשבון?'}{' '}
          <Link to="/agent/register" className="agent-form__footer-link">
            {t.registerLink || 'הרשמה'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
