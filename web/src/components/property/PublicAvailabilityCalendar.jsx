import { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { propertyApi } from '../../api/client.js';
import { useLanguage } from '../../context/LanguageContext.jsx';

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
  const { t, dir } = useLanguage();
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
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString(t.calLocale, { month: 'long', year: 'numeric' });
  const todayStr = toDateStr(today);
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;
  // 11.3: "available/booked" used to only show up buried in the legend at the bottom of the
  // calendar with no immediate answer to "is it free right now" — this is that answer, in the
  // calendar's own header where it has context.
  const isTodayAvailable = year === today.getFullYear() && month === today.getMonth()
    ? (Object.hasOwn(availability, todayStr) ? availability[todayStr] : true)
    : null;

  return (
    <div className="pub-cal">
      <div className="pub-cal__head">
        <button type="button" className="pub-cal__nav-btn" onClick={() => changeMonth(-1)} aria-label={t.calPrevMonth}><PrevIcon size={16} /></button>
        <strong>{monthLabel}</strong>
        <button type="button" className="pub-cal__nav-btn" onClick={() => changeMonth(1)} aria-label={t.calNextMonth}><NextIcon size={16} /></button>
      </div>
      {!loading && isTodayAvailable !== null && (
        <span className={`pub-cal__today-status${isTodayAvailable ? ' is-available' : ' is-blocked'}`}>
          {isTodayAvailable ? t.calAvailable : t.calBlocked} — {t.calToday}
        </span>
      )}

      {loading ? (
        <p className="pub-cal__loading">{t.calLoadingAvailability}</p>
      ) : (
        <>
          <div className="pub-cal__grid pub-cal__grid--labels">
            {t.calWeekdays.map((d, i) => <div key={i}>{d}</div>)}
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
                  title={isPast ? '' : available ? t.calAvailable : t.calBlocked}
                >
                  {date.getUTCDate()}
                </div>
              );
            })}
          </div>
          <div className="pub-cal__legend">
            <span><i className="pub-cal__dot is-available" />{t.calAvailable}</span>
            <span><i className="pub-cal__dot is-blocked" />{t.calBlocked}</span>
          </div>
        </>
      )}
    </div>
  );
}
