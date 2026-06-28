import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'a11y_prefs';
const FONT_SIZES = [100, 110, 120, 130];
const DEFAULT = { textSizeIdx: 0, highContrast: false, noMotion: false, highlightLinks: false, readableFont: false };

function loadPrefs() {
  try { return { ...DEFAULT, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
  catch { return { ...DEFAULT }; }
}

function applyPrefs(prefs) {
  const html = document.documentElement;
  html.style.fontSize = `${FONT_SIZES[prefs.textSizeIdx]}%`;
  html.classList.toggle('a11y-high-contrast', !!prefs.highContrast);
  html.classList.toggle('a11y-no-motion', !!prefs.noMotion);
  html.classList.toggle('a11y-highlight-links', !!prefs.highlightLinks);
  html.classList.toggle('a11y-readable-font', !!prefs.readableFont);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

export function AccessibilityWidget() {
  const { pathname } = useLocation();
  const hidden = pathname.startsWith('/reels');

  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState(loadPrefs);
  const panelRef = useRef(null);
  const btnRef = useRef(null);

  // ALL hooks must run unconditionally — no early returns between them
  useEffect(() => { applyPrefs(prefs); }, [prefs]);

  // Focus management + keyboard trap
  useEffect(() => {
    if (!open || hidden) return;
    const prevFocus = document.activeElement;
    const t = setTimeout(() => {
      const first = panelRef.current?.querySelector('button');
      first?.focus();
    }, 60);

    function onKey(e) {
      if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focs = [...panelRef.current.querySelectorAll('button:not(:disabled)')];
      if (!focs.length) return;
      const first = focs[0]; const last = focs[focs.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      prevFocus?.focus();
    };
  }, [open, hidden]);

  // Hide on reels — AFTER all hooks to satisfy Rules of Hooks
  if (hidden) return null;

  function update(key, val) { setPrefs(p => ({ ...p, [key]: val })); }
  function reset() { setPrefs({ ...DEFAULT }); }

  const isModified = prefs.textSizeIdx !== 0 || prefs.highContrast || prefs.noMotion || prefs.highlightLinks || prefs.readableFont;

  return (
    <>
      <motion.button
        ref={btnRef}
        className={`a11y-trigger${isModified ? ' a11y-trigger--active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-label="פתח כלי נגישות"
        aria-expanded={open}
        aria-haspopup="dialog"
        whileTap={{ scale: 0.9 }}
        title="כלי נגישות ♿"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
          <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.6"/>
          <circle cx="12" cy="5.5" r="1.7" fill="currentColor"/>
          <path d="M7.5 9h9M12 9v7.5M9.5 13.5l-2 4.5M14.5 13.5l2 4.5" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round"/>
        </svg>
        {isModified && <span className="a11y-trigger__dot" aria-hidden="true" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="a11y-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
            <motion.div
              ref={panelRef}
              className="a11y-panel"
              role="dialog"
              aria-modal="true"
              aria-label="הגדרות נגישות"
              dir="rtl"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 16 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            >
              <div className="a11y-panel__header">
                <span className="a11y-panel__title">כלי נגישות</span>
                <button className="a11y-panel__close" onClick={() => setOpen(false)} aria-label="סגור">
                  <X size={15} />
                </button>
              </div>

              {/* Text size */}
              <div className="a11y-panel__section">
                <span className="a11y-panel__label">גודל טקסט</span>
                <div className="a11y-panel__size-row">
                  <button
                    className="a11y-panel__size-btn"
                    onClick={() => update('textSizeIdx', Math.max(0, prefs.textSizeIdx - 1))}
                    disabled={prefs.textSizeIdx === 0}
                    aria-label="הקטן טקסט"
                  >A−</button>
                  <span className="a11y-panel__size-val">{FONT_SIZES[prefs.textSizeIdx]}%</span>
                  <button
                    className="a11y-panel__size-btn a11y-panel__size-btn--lg"
                    onClick={() => update('textSizeIdx', Math.min(FONT_SIZES.length - 1, prefs.textSizeIdx + 1))}
                    disabled={prefs.textSizeIdx === FONT_SIZES.length - 1}
                    aria-label="הגדל טקסט"
                  >A+</button>
                </div>
              </div>

              {/* Toggle rows */}
              {[
                { key: 'highContrast', label: 'ניגודיות גבוהה', emoji: '◑' },
                { key: 'noMotion',     label: 'עצור אנימציות',  emoji: '⏸' },
                { key: 'highlightLinks', label: 'הדגש קישורים', emoji: '🔗' },
                { key: 'readableFont', label: 'גופן קריא',      emoji: 'Aa' },
              ].map(({ key, label, emoji }) => (
                <button
                  key={key}
                  className={`a11y-panel__toggle${prefs[key] ? ' is-on' : ''}`}
                  onClick={() => update(key, !prefs[key])}
                  role="switch"
                  aria-checked={prefs[key]}
                >
                  <span className="a11y-panel__toggle-emoji" aria-hidden="true">{emoji}</span>
                  <span className="a11y-panel__toggle-label">{label}</span>
                  <span className="a11y-panel__toggle-track" aria-hidden="true">
                    <span className="a11y-panel__toggle-thumb" />
                  </span>
                </button>
              ))}

              {/* Reset */}
              <button
                className="a11y-panel__reset"
                onClick={reset}
                disabled={!isModified}
              >
                <RotateCcw size={12} /> איפוס הגדרות
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
