import { useState } from 'react';
import { X, BellPlus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { alertApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

/** CreateAlertModal — 11.14: "notify me" — no account, just an email + the current search
 * criteria (region/budget/dates already on screen, prefilled from `filters`). */
export function CreateAlertModal({ filters, onClose }) {
  const { t, dir } = useLanguage();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await alertApi.create({
        email: email.trim(),
        region: filters?.region || undefined,
        maxPrice: filters?.maxPrice || undefined,
        checkIn: filters?.checkIn || undefined,
        checkOut: filters?.checkOut || undefined,
        guestCapacity: filters?.guests || undefined,
      });
      setDone(true);
    } catch (err) {
      setError(err.message || t.alertCreateError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wishlist-modal-overlay" dir={dir} onClick={onClose}>
      <motion.div className="wishlist-modal" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="wishlist-modal__close" onClick={onClose} aria-label={t.closeButton}>
          <X size={18} />
        </button>
        {!done ? (
          <form onSubmit={handleSubmit}>
            <h2 className="wishlist-modal__title"><BellPlus size={18} /> {t.alertCreateTitle}</h2>
            <p className="wishlist-modal__sub">{t.alertCreateSub}</p>
            <input
              type="email"
              required
              className="agent-form__input"
              placeholder={t.alertEmailPlaceholder}
              value={email}
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="agent-form__error">{error}</p>}
            <button type="submit" className="wishlist-modal__submit" disabled={submitting || !email.trim()}>
              {submitting ? t.wishlistCreating : t.alertCreateButton}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Check size={32} style={{ color: 'var(--ds-olive)' }} />
            <h2 className="wishlist-modal__title" style={{ justifyContent: 'center' }}>{t.alertReadyTitle}</h2>
            <p className="wishlist-modal__sub">{t.alertReadySub}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
