import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="top-bar">
      <div className="container top-bar__inner">
        <div className="brand-block">
          <Logo />
          <span className="brand-sub">{t.brandSub}</span>
        </div>
        <div className="top-bar__actions">
          <Link to="/feed" className="top-bar__vibe-link">
            {t.vibeFeedNavLabel}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
