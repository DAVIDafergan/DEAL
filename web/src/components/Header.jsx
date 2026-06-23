import { useLanguage } from '../context/LanguageContext.jsx';
import { LanguageSwitcher } from './LanguageSwitcher.jsx';
import { Logo } from './Logo.jsx';

/** Header — חלק מטאב "טיסות" (BottomNav מטפל בניווט בין הטאבים, אין יותר צורך בלינק כפול). */
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
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
