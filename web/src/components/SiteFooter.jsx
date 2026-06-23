import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <span className="site-footer__copy">© {new Date().getFullYear()} Deal Radar Pro</span>
        <div className="site-footer__links">
          <Link to="/my/favorites" className="site-footer__link">❤️ {t.favoritesLink || 'המועדפים שלי'}</Link>
          <Link to="/terms" className="site-footer__link">{t.termsLink || 'תנאי שימוש'}</Link>
          <Link to="/privacy" className="site-footer__link">{t.privacyLink || 'פרטיות'}</Link>
          <Link to="/register" className="site-footer__link">{t.headerRegisterButton || 'Register as Agent'}</Link>
        </div>
      </div>
    </footer>
  );
}
