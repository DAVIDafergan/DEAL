import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';

/**
 * DeletePropertyModal — 7.6: "חלון אישור שדורש הקלדת שם הנכס", plus an explicit warning when the
 * property has pending booking requests (deletion is still allowed — it's soft/reversible — but
 * the owner should know before doing it).
 */
export function DeletePropertyModal({ property, pendingBookingCount = 0, onConfirm, onCancel, deleting }) {
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === property.name;

  return (
    <motion.div
      className="dash-wizard-overlay"
      style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="settings-card"
        style={{ maxWidth: 420, width: '100%' }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="settings-card__title" style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trash2 size={18} /> מחיקת "{property.name}"
        </h2>
        <p className="agent-form__hint">
          הנכס יעלם מהאתר ומהחיפוש מיד. הנתונים נשמרים בפח המיחזור לדשבורד למשך 30 יום, ואפשר לשחזר בכל עת בטווח הזה.
        </p>
        {pendingBookingCount > 0 && (
          <p className="agent-form__error-msg" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={15} />
            לנכס זה יש {pendingBookingCount} בקשות הזמנה פעילות (ממתינות). מחיקתו לא תבטל אותן, אבל הלקוחות לא יוכלו לצפות בנכס יותר.
          </p>
        )}
        <div className="agent-form__field" style={{ marginTop: 8 }}>
          <label className="agent-form__label">הקלידו את שם הנכס לאישור: <strong>{property.name}</strong></label>
          <input className="agent-form__input" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={property.name} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          <button type="button" className="agent-form__btn" style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-primary)' }} onClick={onCancel}>
            ביטול
          </button>
          <motion.button
            type="button"
            className="agent-form__btn"
            style={{ background: matches ? '#dc2626' : 'var(--color-border)', color: '#fff', flex: 1 }}
            whileTap={matches ? { scale: 0.97 } : {}}
            disabled={!matches || deleting}
            onClick={onConfirm}
          >
            {deleting ? 'מוחק…' : 'מחק נכס'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
