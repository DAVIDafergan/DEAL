import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Logo } from './Logo.jsx';

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <div className="site-footer__brand">
          <Link to="/" className="site-footer__logo-link">
            <Logo size={28} />
          </Link>
          <a
            href="https://wa.me/972556674329"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer__credit"
          >
            האתר פותח ע״י DA ניהול פרויקטים ויזמות
          </a>
        </div>
        <div className="site-footer__links">
          <Link to="/my/favorites" className="site-footer__link">❤️ {t.favoritesLink || 'המועדפים שלי'}</Link>
          <Link to="/terms" className="site-footer__link">{t.termsLink || 'תנאי שימוש'}</Link>
          <Link to="/privacy" className="site-footer__link">{t.privacyLink || 'פרטיות'}</Link>
          <Link to="/accessibility" className="site-footer__link">הצהרת נגישות</Link>
          <Link to="/register" className="site-footer__link">{t.headerRegisterButton || 'Register as Agent'}</Link>
        </div>
      </div>
    </footer>
  );
}
