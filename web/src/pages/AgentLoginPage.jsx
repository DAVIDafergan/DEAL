import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export function AgentLoginPage() {
  const navigate = useNavigate();
  const { login, token, loading } = useAgentAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
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
      await login(email, password);
      navigate('/agent/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="agent-register-page">
      <motion.div
        className="agent-form"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h2 className="agent-form__step-title">{t.agentLoginTitle || 'Agent Login'}</h2>
        <form onSubmit={handleSubmit} className="agent-form__step">
          <div className="agent-form__field">
            <label className="agent-form__label">{t.emailLabel || 'Email'}</label>
            <input
              className="agent-form__input"
              type="email"
              inputMode="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="agent-form__field">
            <label className="agent-form__label">{t.passwordLabel || 'Password'}</label>
            <input
              className="agent-form__input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="agent-form__api-error">{error}</p>}
          <motion.button
            className="agent-form__btn agent-form__btn--primary"
            type="submit"
            disabled={submitting || !email || !password}
            whileTap={{ scale: 0.97 }}
          >
            {submitting ? (t.submittingLabel || 'Logging in…') : (t.loginButton || 'Login')}
          </motion.button>
        </form>
        <p className="agent-form__footer-note">
          {t.noAccountPrompt || "Don't have an account?"}{' '}
          <Link to="/agent/register" className="agent-form__footer-link">
            {t.registerLink || 'Register'}
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
