import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { propertyApi } from '../../api/client.js';

const WEEKDAY_LABELS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

function monthMatrix(year, month) {
  const first = new Date(Date.UTC(year, month, 1));
  const startOffset = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(Date.UTC(year, month, d)));
  return cells;
}

/** PublicAvailabilityCalendar — 9.4 "לוח זמינות": read-only month grid for a guest, scoped to
 * the selected unit. Reuses the same public GET availability endpoint the owner's editable
 * calendar uses — no new backend, just no edit controls here. */
export function PublicAvailabilityCalendar({ propertyId, unitId }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [availability, setAvailability] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const from = toDateStr(new Date(Date.UTC(year, month, 1)));
    const to = toDateStr(new Date(Date.UTC(year, month + 1, 0)));
    propertyApi.getAvailability(propertyId, { from, to, unit_id: unitId })
      .then(({ availability: rows }) => {
        const map = {};
        for (const row of rows) map[row.date.slice(0, 10)] = Boolean(row.is_available);
        setAvailability(map);
      })
      .catch(() => setAvailability({}))
      .finally(() => setLoading(false));
  }, [propertyId, unitId, year, month]);

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  const cells = monthMatrix(year, month);
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const todayStr = toDateStr(today);

  return (
    <div className="pub-cal">
      <div className="pub-cal__head">
        <button type="button" className="pub-cal__nav-btn" onClick={() => changeMonth(-1)} aria-label="חודש קודם"><ChevronRight size={16} /></button>
        <strong>{monthLabel}</strong>
        <button type="button" className="pub-cal__nav-btn" onClick={() => changeMonth(1)} aria-label="חודש הבא"><ChevronLeft size={16} /></button>
      </div>

      {loading ? (
        <p className="pub-cal__loading">טוען זמינות…</p>
      ) : (
        <>
          <div className="pub-cal__grid pub-cal__grid--labels">
            {WEEKDAY_LABELS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="pub-cal__grid">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const dateStr = toDateStr(date);
              const isPast = dateStr < todayStr;
              const available = Object.hasOwn(availability, dateStr) ? availability[dateStr] : true;
              return (
                <div
                  key={dateStr}
                  className={`pub-cal__cell${isPast ? ' is-past' : available ? ' is-available' : ' is-blocked'}`}
                  title={isPast ? '' : available ? 'פנוי' : 'תפוס'}
                >
                  {date.getUTCDate()}
                </div>
              );
            })}
          </div>
          <div className="pub-cal__legend">
            <span><i className="pub-cal__dot is-available" />פנוי</span>
            <span><i className="pub-cal__dot is-blocked" />תפוס</span>
          </div>
        </>
      )}
    </div>
  );
}
