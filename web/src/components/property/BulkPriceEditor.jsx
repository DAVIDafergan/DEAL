import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, TrendingUp, TrendingDown } from 'lucide-react';
import { propertyApi } from '../../api/client.js';

/** BulkPriceEditor — 11.2 "עריכת מחירים בכמות": every active unit across every one of the
 * owner's published properties, in one flat list, with a percentage bump/cut that applies to
 * every row at once (still individually overridable) and a single save that only PATCHes the
 * units whose price actually changed. Reuses the existing per-unit PATCH endpoint — no new
 * server route needed, this is purely a client-side batch-edit UI over it. */
export function BulkPriceEditor({ token, properties, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]); // { propertyId, propertyName, unitId, unitName, originalPrice, price }
  const [bulkPct, setBulkPct] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const publishable = properties.filter((p) => p.status !== 'draft');
    Promise.all(publishable.map((p) => propertyApi.getOneMine(token, p.id).catch(() => null)))
      .then((results) => {
        const flat = [];
        results.forEach((r, i) => {
          if (!r?.property) return;
          for (const unit of r.property.units || []) {
            if (!unit.is_active) continue;
            flat.push({
              propertyId: publishable[i].id,
              propertyName: publishable[i].name,
              unitId: unit.id,
              unitName: unit.name,
              originalPrice: unit.base_price_night || 0,
              price: unit.base_price_night || 0,
            });
          }
        });
        setRows(flat);
      })
      .finally(() => setLoading(false));
  }, [token, properties]);

  function applyBulkPct(sign) {
    const pct = Number(bulkPct);
    if (!pct) return;
    setRows((prev) => prev.map((r) => ({ ...r, price: Math.round(r.price * (1 + (sign * pct) / 100)) })));
  }

  function setRowPrice(unitId, value) {
    setRows((prev) => prev.map((r) => (r.unitId === unitId ? { ...r, price: value } : r)));
  }

  const changedCount = rows.filter((r) => Number(r.price) !== Number(r.originalPrice)).length;

  async function handleSave() {
    setSaving(true);
    setNotice('');
    const changed = rows.filter((r) => Number(r.price) !== Number(r.originalPrice) && r.price !== '' && Number(r.price) > 0);
    try {
      await Promise.all(changed.map((r) => propertyApi.updateUnit(token, r.propertyId, r.unitId, { base_price_night: Number(r.price) })));
      setNotice(`עודכנו ${changed.length} יחידות`);
      onSaved?.();
      setRows((prev) => prev.map((r) => ({ ...r, originalPrice: r.price })));
    } catch (err) {
      setNotice(err.message || 'שגיאה בעדכון המחירים');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div className="dash-wizard-overlay" style={{ alignItems: 'center', justifyContent: 'center', padding: 16 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="settings-card"
        style={{ maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 className="settings-card__title" style={{ margin: 0 }}>עריכת מחירים בכמות</h2>
          <button type="button" onClick={onClose} aria-label="סגור" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-ash)' }}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <p className="dash-empty-state" style={{ padding: 16 }}>טוען יחידות…</p>
        ) : rows.length === 0 ? (
          <p className="dash-empty-state" style={{ padding: 16 }}>אין יחידות פעילות לעריכה.</p>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <input
                type="number"
                className="settings-field__input"
                style={{ width: 90 }}
                placeholder="%"
                value={bulkPct}
                onChange={(e) => setBulkPct(e.target.value)}
              />
              <button type="button" className="dash-quick-pill" onClick={() => applyBulkPct(1)}>
                <TrendingUp size={14} /> העלאה לכל היחידות
              </button>
              <button type="button" className="dash-quick-pill" onClick={() => applyBulkPct(-1)}>
                <TrendingDown size={14} /> הפחתה לכל היחידות
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {rows.map((r) => (
                <div key={r.unitId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.unitName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--ds-ash)' }}>{r.propertyName}</div>
                  </div>
                  <input
                    type="number"
                    className="settings-field__input"
                    style={{ width: 100, fontWeight: Number(r.price) !== Number(r.originalPrice) ? 700 : 400, borderColor: Number(r.price) !== Number(r.originalPrice) ? 'var(--ds-hearth)' : undefined }}
                    value={r.price}
                    onChange={(e) => setRowPrice(r.unitId, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {notice && <p className="agent-form__hint" style={{ marginTop: 10 }}>{notice}</p>}

            <motion.button
              type="button"
              className="dash-quick-pill dash-quick-pill--primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
              whileTap={{ scale: 0.97 }}
              disabled={changedCount === 0 || saving}
              onClick={handleSave}
            >
              <Save size={15} /> {saving ? 'שומר…' : changedCount > 0 ? `שמור ${changedCount} שינויים` : 'אין שינויים'}
            </motion.button>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
