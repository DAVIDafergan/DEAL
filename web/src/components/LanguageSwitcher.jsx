import { SUPPORTED_LANGS } from '../i18n/translations.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const LABELS = { he: 'HE', en: 'EN', es: 'ES' };

export function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="lang-switcher" role="group" aria-label="Language switcher">
      {SUPPORTED_LANGS.map((code) => (
        <button
          key={code}
          type="button"
          className={`lang-pill ${code === lang ? 'is-active' : ''}`}
          onClick={() => setLang(code)}
        >
          {LABELS[code]}
        </button>
      ))}
    </div>
  );
}
