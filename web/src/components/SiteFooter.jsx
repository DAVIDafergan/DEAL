import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <span className="site-footer__copy">© {new Date().getFullYear()} Deal Radar Pro</span>
        <div className="site-footer__links">
          <Link to="/register" className="site-footer__link">{t.headerRegisterButton || 'Register as Agent'}</Link>
          <Link to="/admin" className="site-footer__link site-footer__link--admin">{t.adminLink || 'Admin'}</Link>
        </div>
      </div>
    </footer>
  );
}
