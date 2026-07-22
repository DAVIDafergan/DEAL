import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from '../components/LocalizedLink.jsx';
import { ArrowLeft, ShieldOff, CheckCircle } from 'lucide-react';
import { removeApi } from '../api/client.js';
import { Logo } from '../components/Logo.jsx';

/** RemovePage — public self-service removal (Step 5.5). Same auth-page/auth-card shell as the
 * login pages. Immediate, automatic, no admin approval — per the compliance SLA. */
export function RemovePage() {
  const [type, setType] = useState('phone');
  const [value, setValue] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('idle'); // idle | requested | done
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [removedCount, setRemovedCount] = useState(0);

  async function handleRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await removeApi.request({ type, value });
      if (res.sentTo) setSentTo(res.sentTo);
      setStep('requested');
    } catch (err) {
      setError(err.message || 'שגיאה בשליחת הבקשה');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await removeApi.verify({ type, value, code });
      setRemovedCount(res.removedCount || 0);
      setStep('done');
    } catch (err) {
      setError(err.message || 'קוד שגוי או שפג תוקפו');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page" dir="rtl">
      <Link to="/" className="auth-page__back">
        <ArrowLeft size={16} /> חזרה לדף הבית
      </Link>

      <motion.div className="auth-card" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>
        <div className="auth-card__hero">
          <div className="auth-card__logo"><Logo size={42} /></div>
          <h1 className="auth-card__welcome">הסרת נכס</h1>
          <p className="auth-card__sub">
            נכס שלכם מופיע ב-Dealim ואתם רוצים להסיר אותו? הזינו טלפון או דומיין האתר שלכם —
            ההסרה מיידית, אוטומטית ולצמיתות.
          </p>
        </div>

        <div className="auth-card__body">
          {step === 'done' ? (
            <p className="deal-modal__desc">
              <CheckCircle size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
              {removedCount > 0
                ? `${removedCount} נכס/ים הוסרו מ-Dealim ונחסמו לצמיתות. לא ייסרקו או ייווצרו מחדש בעתיד.`
                : 'הבקשה עובדה. אם נמצא נכס תואם, הוא הוסר.'}
            </p>
          ) : step === 'requested' ? (
            <form onSubmit={handleVerify} className="auth-form">
              <p className="agent-form__hint">קוד אימות נשלח {sentTo ? `ל-${sentTo}` : ''}</p>
              <div className="auth-form__field">
                <label className="auth-form__label" htmlFor="rp-code">קוד אימות</label>
                <input id="rp-code" className="auth-form__input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
              </div>
              {error && <p className="auth-form__error" role="alert">{error}</p>}
              <motion.button className="auth-form__btn" type="submit" disabled={submitting || !code} whileTap={{ scale: 0.97 }}>
                <ShieldOff size={16} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                {submitting ? 'מסיר…' : 'אמת והסר לצמיתות'}
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleRequest} className="auth-form">
              <div className="auth-form__field">
                <label className="auth-form__label">מה תרצו להזין?</label>
                <div className="settings-field__wa-row">
                  <select className="settings-field__country-code" value={type} onChange={(e) => setType(e.target.value)}>
                    <option value="phone">טלפון</option>
                    <option value="domain">דומיין האתר</option>
                  </select>
                  <input
                    className="auth-form__input"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={type === 'phone' ? '0501234567' : 'my-zimmer.co.il'}
                    autoFocus
                    required
                  />
                </div>
              </div>
              {error && <p className="auth-form__error" role="alert">{error}</p>}
              <motion.button className="auth-form__btn" type="submit" disabled={submitting || !value} whileTap={{ scale: 0.97 }}>
                {submitting ? 'שולח…' : 'שלח קוד אימות'}
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>

      <div className="auth-page__bg" aria-hidden="true">
        <ShieldOff size={280} className="auth-page__bg-icon" />
      </div>
    </div>
  );
}
