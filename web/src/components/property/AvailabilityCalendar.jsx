import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, Save, X } from 'lucide-react';
import { propertyApi } from '../../api/client.js';

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function monthMatrix(year, month) {
  // month is 0-indexed. Returns a flat array of Date|null for a calendar grid starting Sunday.
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = first.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  return cells;
}

/**
 * AvailabilityCalendar — visual month grid for setting per-date availability. No new global
 * CSS: the shell/buttons reuse .dash-quick-pill / .dash-empty-state, the grid cells are styled
 * entirely via var(--ds-*) inline styles (same tokens as theme.css), matching the "single
 * accent color in dashboards" rule from DESIGN_SYSTEM.md §3.2 — teal for available, muted for
 * blocked, nothing else.
 */
export function AvailabilityCalendar({ propertyId, token, onClose }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState({}); // dateStr -> boolean (true = available)
  const [pendingChanges, setPendingChanges] = useState({}); // dateStr -> boolean, only edits not yet saved
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoading(true);
    const from = toDateStr(new Date(Date.UTC(year, month, 1)));
    const to = toDateStr(new Date(Date.UTC(year, month + 1, 0)));
    propertyApi.getAvailability(propertyId, { from, to })
      .then(({ availability: rows }) => {
        const map = {};
        for (const row of rows) map[row.date.slice(0, 10)] = Boolean(row.is_available);
        setAvailability(map);
        setPendingChanges({});
      })
      .catch(() => setAvailability({}))
      .finally(() => setLoading(false));
  }, [propertyId, year, month]);

  function isAvailable(dateStr) {
    if (Object.hasOwn(pendingChanges, dateStr)) return pendingChanges[dateStr];
    if (Object.hasOwn(availability, dateStr)) return availability[dateStr];
    return true; // no row = available by default (see core/db/index.js availability table)
  }

  function toggleDate(dateStr) {
    setSaved(false);
    setPendingChanges((prev) => ({ ...prev, [dateStr]: !isAvailable(dateStr) }));
  }

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  async function handleSave() {
    const dates = Object.entries(pendingChanges).map(([date, is_available]) => ({ date, is_available }));
    if (dates.length === 0) return;
    setSaving(true);
    try {
      await propertyApi.setAvailability(token, propertyId, dates);
      setAvailability((prev) => ({ ...prev, ...pendingChanges }));
      setPendingChanges({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // keep pendingChanges so the owner doesn't lose their edits on a transient failure
    } finally {
      setSaving(false);
    }
  }

  const cells = monthMatrix(year, month);
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const hasPending = Object.keys(pendingChanges).length > 0;

  return (
    <div className="settings-card" dir="rtl" style={{ maxWidth: 420 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 className="settings-card__title" style={{ margin: 0 }}>לוח זמינות</h2>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="סגור" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ds-ash)' }}>
            <X size={18} />
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 0 12px' }}>
        <button type="button" className="dash-quick-pill" style={{ padding: '6px 10px' }} onClick={() => changeMonth(-1)} aria-label="חודש קודם">
          <ChevronRight size={16} />
        </button>
        <strong>{monthLabel}</strong>
        <button type="button" className="dash-quick-pill" style={{ padding: '6px 10px' }} onClick={() => changeMonth(1)} aria-label="חודש הבא">
          <ChevronLeft size={16} />
        </button>
      </div>

      {loading ? (
        <p className="dash-empty-state" style={{ padding: 16 }}>טוען…</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--ds-ash)', fontWeight: 600 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              const dateStr = toDateStr(date);
              const available = isAvailable(dateStr);
              const changed = Object.hasOwn(pendingChanges, dateStr);
              return (
                <motion.button
                  key={dateStr}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => toggleDate(dateStr)}
                  title={available ? 'פנוי — לחץ לחסימה' : 'חסום — לחץ לפתיחה'}
                  style={{
                    aspectRatio: '1', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: changed ? '2px solid var(--ds-teal)' : '1px solid var(--color-border)',
                    background: available ? 'rgba(23,195,178,0.12)' : 'var(--color-surface-elevated)',
                    color: available ? 'var(--ds-teal)' : 'var(--ds-ash)',
                    fontSize: '0.8rem', fontWeight: 600,
                    textDecoration: available ? 'none' : 'line-through',
                  }}
                >
                  {date.getUTCDate()}
                </motion.button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 12, fontSize: '0.75rem', color: 'var(--ds-ash)' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'rgba(23,195,178,0.12)', border: '1px solid var(--ds-teal)', verticalAlign: 'middle', marginInlineEnd: 4 }} />פנוי</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', verticalAlign: 'middle', marginInlineEnd: 4 }} />חסום</span>
          </div>

          <motion.button
            type="button"
            className="dash-quick-pill dash-quick-pill--primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
            whileTap={{ scale: 0.97 }}
            disabled={!hasPending || saving}
            onClick={handleSave}
          >
            <Save size={15} /> {saving ? 'שומר…' : saved ? 'נשמר ✓' : hasPending ? `שמור ${Object.keys(pendingChanges).length} שינויים` : 'שמור'}
          </motion.button>
        </>
      )}
    </div>
  );
}
