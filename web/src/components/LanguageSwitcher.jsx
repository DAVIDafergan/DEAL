import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { SUPPORTED_LANGS } from '../i18n/translations.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const LANG_OPTIONS = {
  he: { label: 'עברית', flag: '🇮🇱' },
  en: { label: 'English', flag: '🇺🇸' },
  es: { label: 'Español', flag: '🇪🇸' },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: { opacity: 0, y: -4, scale: 0.96, transition: { duration: 0.12 } },
};

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const current = LANG_OPTIONS[lang] || LANG_OPTIONS.he;

  return (
    <div className="lang-dropdown" ref={ref}>
      <button
        type="button"
        className="lang-dropdown__trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="lang-dropdown__flag">{current.flag}</span>
        <span className="lang-dropdown__label">{current.label}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <ChevronDown size={13} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="lang-dropdown__menu"
            role="listbox"
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {SUPPORTED_LANGS.map((code) => {
              const opt = LANG_OPTIONS[code];
              const isActive = code === lang;
              return (
                <li key={code} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    className={`lang-dropdown__option${isActive ? ' is-active' : ''}`}
                    onClick={() => { setLang(code); setOpen(false); }}
                  >
                    <span className="lang-dropdown__flag">{opt.flag}</span>
                    <span>{opt.label}</span>
                    {isActive && <span className="lang-dropdown__check">✓</span>}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
