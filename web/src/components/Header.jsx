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
        <LanguageSwitcher />
      </div>
    </header>
  );
}
