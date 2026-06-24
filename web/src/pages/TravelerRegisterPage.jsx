import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const TRAVELER_KEY = 'deal_radar_traveler';

export function TravelerRegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  function validate() {
    const e = {};
    if (!name.trim()) e.name = 'נדרש שם';
    if (!email.trim()) e.email = 'נדרשת כתובת אימייל';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'האימייל אינו תקין — בדוק שכתבת כתובת מלאה (לדוגמה: name@gmail.com)';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    localStorage.setItem(TRAVELER_KEY, JSON.stringify({ name: name.trim(), email: email.trim(), joinedAt: Date.now() }));
    setDone(true);
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

        <form onSubmit={handleSubmit} noValidate>
          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label">שם *</label>
            <input
              className={`traveler-register-card__input${errors.name ? ' is-error' : ''}`}
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErrors(p => ({ ...p, name: '' })); }}
              placeholder="איך לקרוא לך?"
              autoFocus
            />
            {errors.name && <p className="traveler-register-card__err">{errors.name}</p>}
          </div>

          <div className="traveler-register-card__field">
            <label className="traveler-register-card__label">אימייל *</label>
            <input
              className={`traveler-register-card__input${errors.email ? ' is-error' : ''}`}
              type="email"
              inputMode="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(p => ({ ...p, email: '' })); }}
              placeholder="name@gmail.com"
            />
            {errors.email && <p className="traveler-register-card__err">{errors.email}</p>}
          </div>

          <motion.button
            type="submit"
            className="traveler-register-card__btn"
            whileTap={{ scale: 0.97 }}
          >
            יאללה, בוא נלך
          </motion.button>
        </form>

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
