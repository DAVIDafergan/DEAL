import { createContext, useContext, useMemo, useState } from 'react';
import { translations, SUPPORTED_LANGS } from '../i18n/translations.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('he');

  const value = useMemo(
    () => ({
      lang,
      setLang: (next) => SUPPORTED_LANGS.includes(next) && setLang(next),
      t: translations[lang],
      dir: translations[lang].dir,
    }),
    [lang]
  );

  return (
    <LanguageContext.Provider value={value}>
      <div className="app-shell" dir={value.dir} data-lang={lang}>
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
