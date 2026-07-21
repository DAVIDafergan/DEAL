import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Trash2, X } from 'lucide-react';
import { propertyApi } from '../../api/client.js';
import { regionLabel } from '../../data/propertyOptions.js';

function daysLeft(deletedAt) {
  const deletedMs = new Date(deletedAt).getTime();
  const expiresMs = deletedMs + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((expiresMs - Date.now()) / (24 * 60 * 60 * 1000)));
}

/** PropertyTrashPanel — 7.6 "פח מיחזור בדשבורד עם שחזור תוך 30 יום". */
export function PropertyTrashPanel({ token, onClose, onRestored }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    propertyApi.getTrash(token)
      .then(({ properties }) => setItems(properties || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleRestore(id) {
    setRestoringId(id);
    try {
      await propertyApi.restore(token, id);
      setItems((prev) => prev.filter((p) => p.id !== id));
      onRestored?.();
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <motion.div className="dash-wizard-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="settings-card"
        style={{ maxWidth: 480, width: '100%', maxHeight: '80vh', overflowY: 'auto' }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="settings-card__title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Trash2 size={18} /> פח מיחזור
          </h2>
          <button type="button" onClick={onClose} aria-label="סגור" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-ash)', minWidth: 44, minHeight: 44 }}>
            <X size={18} />
          </button>
        </div>
        <p className="agent-form__hint">נכסים שנמחקו נשמרים כאן 30 יום ואפשר לשחזר אותם בכל רגע בטווח הזה.</p>

        {loading && <p className="dash-empty">טוען…</p>}
        {!loading && items.length === 0 && <p className="dash-empty-state">פח המיחזור ריק.</p>}

        <AnimatePresence>
          {items.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--color-border-subtle)' }}
            >
              <div>
                <strong>{p.name}</strong>
                <div className="agent-form__hint" style={{ margin: 0 }}>
                  {regionLabel(p.region)}{p.city ? ` · ${p.city}` : ''} · נמחק לפני {30 - daysLeft(p.deleted_at)} ימים · {daysLeft(p.deleted_at)} ימים לשחזור
                </div>
              </div>
              <motion.button
                type="button"
                className="dash-quick-pill dash-quick-pill--primary"
                whileTap={{ scale: 0.96 }}
                disabled={restoringId === p.id}
                onClick={() => handleRestore(p.id)}
              >
                <RotateCcw size={14} /> {restoringId === p.id ? 'משחזר…' : 'שחזר'}
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
