import { createContext, useContext, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { translations, SUPPORTED_LANGS } from '../i18n/translations.js';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'deal_radar_lang_pref';

/** 9.8: the URL is the single source of truth for which language a given page load renders in
 * (required for hreflang/canonical to mean anything) — /en/* is English, everything else is
 * Hebrew. This derives `lang` from the URL rather than component state, so a shared /en/property/5
 * link always opens in English regardless of any stored preference. */
function langFromPath(pathname) {
  return pathname === '/en' || pathname.startsWith('/en/') ? 'en' : 'he';
}

export function stripLangPrefix(pathname) {
  return pathname === '/en' ? '/' : pathname.startsWith('/en/') ? pathname.slice(3) : pathname;
}

export function withLangPrefix(pathname, lang) {
  if (lang !== 'en') return pathname;
  return pathname === '/' ? '/en' : `/en${pathname}`;
}

export function LanguageProvider({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const lang = langFromPath(location.pathname);
  const detectionRanRef = useRef(false);

  // First-visit browser-language detection + persisted manual override (9.8). Guarded by a ref
  // (not just an empty dep array) so React 18 StrictMode's dev-only double-invoke of effects
  // can't fire this twice and race itself into redirecting back to the wrong language.
  useEffect(() => {
    if (detectionRanRef.current) return;
    detectionRanRef.current = true;

    const saved = localStorage.getItem(STORAGE_KEY);
    const urlLang = langFromPath(window.location.pathname);
    const targetLang = saved || ((navigator.language || '').toLowerCase().startsWith('en') ? 'en' : 'he');
    if (!saved) localStorage.setItem(STORAGE_KEY, targetLang);
    if (targetLang !== urlLang) {
      navigate(withLangPrefix(window.location.pathname + window.location.search, targetLang), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the real <html> element (not just the inner .app-shell div) in sync — browser-native
  // behavior (native form controls, default scrollbar side, assistive tech) reads dir/lang off
  // <html>, and index.html ships with a static dir="rtl" lang="he" that never updates on its own.
  useEffect(() => {
    document.documentElement.dir = translations[lang].dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: (next) => {
        if (!SUPPORTED_LANGS.includes(next)) return;
        localStorage.setItem(STORAGE_KEY, next);
        navigate(withLangPrefix(stripLangPrefix(location.pathname) + location.search, next));
      },
      t: translations[lang],
      dir: translations[lang].dir,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, location.pathname, location.search]
  );

  return (
    <LanguageContext.Provider value={value}>
      <div className="app-shell" dir={value.dir} lang={lang} data-lang={lang}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return ctx;
}
