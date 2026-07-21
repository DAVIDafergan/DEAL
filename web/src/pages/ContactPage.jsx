import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');
  const fieldRefs = useRef({});

  function set(key) {
    return e => { setForm(p => ({ ...p, [key]: e.target.value })); setErrors(p => ({ ...p, [key]: '' })); };
  }

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'נדרש שם';
    if (!form.email.trim()) e.email = 'נדרשת כתובת אימייל';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'כתובת אימייל לא תקינה';
    if (!form.message.trim()) e.message = 'נדרשת הודעה';
    else if (form.message.trim().length < 10) e.message = 'ההודעה קצרה מדי';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      const firstKey = Object.keys(errs)[0];
      fieldRefs.current[firstKey]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fieldRefs.current[firstKey]?.focus();
      return;
    }
    setSubmitting(true);
    setApiError('');
    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'שגיאה בשליחה');
      }
      setSuccess(true);
    } catch (err) {
      setApiError(err.message || 'שגיאה בשליחה, נסה שנית');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="legal-page" dir="rtl">
      <div className="legal-page__inner container" style={{ maxWidth: 560 }}>
        <Link to="/" className="legal-page__back"><ArrowLeft size={16} /> חזרה לדף הבית</Link>
        <h1 className="legal-page__title">צור קשר</h1>

        {success ? (
          <motion.div
            className="contact-success"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <CheckCircle size={48} color="#22c55e" strokeWidth={1.4} />
            <h2 className="contact-success__title">ההודעה נשלחה בהצלחה!</h2>
            <p className="contact-success__sub">נחזור אליך בהקדם. בינתיים אפשר לחזור לדף הבית.</p>
            <Link to="/" className="contact-success__btn">חזרה לדף הבית</Link>
          </motion.div>
        ) : (
          <>
            <p className="contact-page__sub">
              שאלות, הצעות, בעיות טכניות — נשמח לשמוע. ניצור איתך קשר תוך 1–2 ימי עסקים.
            </p>

            {apiError && <p className="contact-page__err" role="alert">{apiError}</p>}

            <form className="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="contact-form__field">
                <label className="contact-form__label" htmlFor="cf-name">שם מלא *</label>
                <input
                  id="cf-name"
                  ref={(el) => (fieldRefs.current.name = el)}
                  className={`contact-form__input${errors.name ? ' is-error' : ''}`}
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="ישראל ישראלי"
                  aria-describedby={errors.name ? 'cf-name-err' : undefined}
                  aria-invalid={errors.name ? 'true' : undefined}
                />
                {errors.name && <p id="cf-name-err" className="contact-form__err" role="alert">{errors.name}</p>}
              </div>

              <div className="contact-form__field">
                <label className="contact-form__label" htmlFor="cf-email">אימייל *</label>
                <input
                  id="cf-email"
                  ref={(el) => (fieldRefs.current.email = el)}
                  className={`contact-form__input${errors.email ? ' is-error' : ''}`}
                  type="email"
                  inputMode="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="name@example.com"
                  aria-describedby={errors.email ? 'cf-email-err' : undefined}
                  aria-invalid={errors.email ? 'true' : undefined}
                />
                {errors.email && <p id="cf-email-err" className="contact-form__err" role="alert">{errors.email}</p>}
              </div>

              <div className="contact-form__field">
                <label className="contact-form__label" htmlFor="cf-phone">טלפון (אופציונלי)</label>
                <input
                  id="cf-phone"
                  className="contact-form__input"
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="050-1234567"
                />
              </div>

              <div className="contact-form__field">
                <label className="contact-form__label" htmlFor="cf-message">הודעה *</label>
                <textarea
                  id="cf-message"
                  ref={(el) => (fieldRefs.current.message = el)}
                  className={`contact-form__input contact-form__textarea${errors.message ? ' is-error' : ''}`}
                  rows={5}
                  value={form.message}
                  onChange={set('message')}
                  placeholder="כתוב את ההודעה שלך כאן…"
                  aria-describedby={errors.message ? 'cf-msg-err' : undefined}
                  aria-invalid={errors.message ? 'true' : undefined}
                />
                {errors.message && <p id="cf-msg-err" className="contact-form__err" role="alert">{errors.message}</p>}
              </div>

              <motion.button
                type="submit"
                className="contact-form__btn"
                disabled={submitting}
                whileTap={{ scale: 0.97 }}
              >
                <Send size={15} />
                {submitting ? 'שולח…' : 'שלח הודעה'}
              </motion.button>
            </form>

            <div className="contact-alt">
              <p>אפשר גם לפנות ישירות:</p>
              <a href="mailto:DA@101.ORG.IL" className="contact-alt__link">DA@101.ORG.IL</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
