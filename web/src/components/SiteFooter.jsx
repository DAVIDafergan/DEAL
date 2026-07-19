import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Logo } from './Logo.jsx';
import { Heart, FileText, Shield, Phone, UserPlus, Accessibility } from 'lucide-react';

export function SiteFooter() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer" dir="rtl">
      <div className="site-footer__inner container">

        {/* Brand column */}
        <div className="site-footer__brand">
          <Link to="/" className="site-footer__logo-link" aria-label="Dealim – דף הבית">
            <Logo size={32} />
          </Link>
          <p className="site-footer__tagline">
            צימרים ווילות בישראל<br />ישירות מבעלי הנכס
          </p>
          <a
            href="https://wa.me/972556674329"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer__credit"
          >
            פותח ע"י DA ניהול פרויקטים ויזמות ↗
          </a>
        </div>

        {/* Navigation columns */}
        <div className="site-footer__cols">
          <div className="site-footer__col">
            <span className="site-footer__col-title">ניווט</span>
            <FooterLink to="/my/favorites" icon={Heart} label={t.favoritesLink || 'המועדפים שלי'} />
            <FooterLink to="/contact" icon={Phone} label="צור קשר" />
            <FooterLink to="/register" icon={UserPlus} label="הרשמת בעל צימר" highlight />
          </div>
          <div className="site-footer__col">
            <FooterLink to="/terms" icon={FileText} label={t.termsLink || 'תנאי שימוש'} />
            <FooterLink to="/privacy" icon={Shield} label={t.privacyLink || 'מדיניות פרטיות'} />
            <FooterLink to="/accessibility" icon={Accessibility} label="הצהרת נגישות" />
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>© {new Date().getFullYear()} Dealim. כל הזכויות שמורות.</span>
      </div>
    </footer>
  );
}

function FooterLink({ to, icon: Icon, label, highlight }) {
  return (
    <Link to={to} className={`site-footer__nav-link${highlight ? ' site-footer__nav-link--highlight' : ''}`}>
      <Icon size={13} />
      {label}
    </Link>
  );
}
