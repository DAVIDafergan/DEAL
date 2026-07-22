import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';

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

function formatShort(dateStr, locale) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

/** HeroDateRangeField — 11.3: replaces the two raw native <input type=date> fields, which
 * rendered the browser's own locale-agnostic "dd.mm.yyyy" placeholder regardless of site
 * language and looked like a stray form control rather than a designed field. A single button
 * shows a real Hebrew/English label + the picked range; clicking opens a popover calendar where
 * the first click sets check-in and the second (later) date sets check-out and closes — a real
 * two-click range, not two separate fields to fill in one at a time. */
export function HeroDateRangeField({ checkIn, checkOut, onChange }) {
  const { t, dir } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const rootRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isOpen]);

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  }

  function pickDate(dateStr) {
    if (!checkIn || (checkIn && checkOut) || dateStr <= checkIn) {
      onChange({ checkIn: dateStr, checkOut: '' });
    } else {
      onChange({ checkIn, checkOut: dateStr });
      setIsOpen(false);
    }
  }

  function clearRange(e) {
    e.stopPropagation();
    onChange({ checkIn: '', checkOut: '' });
  }

  const todayStr = toDateStr(today);
  const cells = monthMatrix(year, month);
  const monthLabel = new Date(Date.UTC(year, month, 1)).toLocaleDateString(t.calLocale, { month: 'long', year: 'numeric' });
  const PrevIcon = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const NextIcon = dir === 'rtl' ? ChevronLeft : ChevronRight;

  const displayLabel = checkIn && checkOut
    ? `${formatShort(checkIn, t.calLocale)} – ${formatShort(checkOut, t.calLocale)}`
    : checkIn
      ? `${formatShort(checkIn, t.calLocale)} – ${t.heroDatePickCheckout}`
      : t.heroDatePickerPlaceholder;

  return (
    <div className="hero-search__field hero-search__field--dates" ref={rootRef}>
      <label className="hero-search__label" htmlFor="hs-date-trigger"><span className="icon-draw icon-draw--once"><CalendarDays size={12} /></span> {t.heroSearchWhen}</label>
      <button
        id="hs-date-trigger"
        type="button"
        className="hero-search__input hero-date-trigger"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <span className={checkIn ? '' : 'hero-date-trigger__placeholder'}>{displayLabel}</span>
        {checkIn && (
          <span className="hero-date-trigger__clear" onClick={clearRange} role="button" tabIndex={-1} aria-label={t.heroDateClear}>
            <X size={13} />
          </span>
        )}
      </button>

      {isOpen && (
        <div className="hero-date-popover" dir={dir}>
          <div className="pub-cal__head">
            <button type="button" className="pub-cal__nav-btn" onClick={() => changeMonth(-1)} aria-label={t.calPrevMonth}><PrevIcon size={16} /></button>
            <strong>{monthLabel}</strong>
            <button type="button" className="pub-cal__nav-btn" onClick={() => changeMonth(1)} aria-label={t.calNextMonth}><NextIcon size={16} /></button>
          </div>
          <div className="pub-cal__grid pub-cal__grid--labels">
            {t.calWeekdays.map((d, i) => <div key={i}>{d}</div>)}
          </div>
          <div className="pub-cal__grid">
            {cells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} />;
              const dateStr = toDateStr(date);
              const isPast = dateStr < todayStr;
              const isStart = dateStr === checkIn;
              const isEnd = dateStr === checkOut;
              const inRange = checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;
              return (
                <button
                  type="button"
                  key={dateStr}
                  disabled={isPast}
                  className={`hero-date-cell${isStart || isEnd ? ' is-selected' : ''}${inRange ? ' is-in-range' : ''}${isPast ? ' is-past' : ''}`}
                  onClick={() => pickDate(dateStr)}
                >
                  {date.getUTCDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
