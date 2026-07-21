import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Logo } from './Logo.jsx';
import { Heart, FileText, Shield, Phone, UserPlus, Accessibility } from 'lucide-react';
import { REGIONS } from '../data/propertyOptions.js';

// 9.2/9.7: region + category links point at the existing query-param search (?region=,
// ?amenities=) for now — they'll switch to the pretty programmatic-SEO URLs (/אזור/[region]
// etc.) once those routes exist (9.7), same destinations, better URLs. Not blocking on that here.
const CATEGORY_LINKS = [
  { label: 'עם ג׳קוזי', to: '/?amenities=has_private_jacuzzi' },
  { label: 'עם בריכה', to: '/?amenities=has_private_pool' },
  { label: 'כשר', to: '/?kosher=kosher' },
  { label: 'למשפחות', to: '/?amenities=is_kid_friendly' },
  { label: 'לקבוצות גדולות', to: '/?guests=10' },
];

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
            <span className="site-footer__col-title">אזורים</span>
            {REGIONS.map((r) => (
              <Link key={r.value} to={`/?region=${r.value}`} className="site-footer__nav-link">{r.label}</Link>
            ))}
          </div>
          <div className="site-footer__col">
            <span className="site-footer__col-title">קטגוריות</span>
            {CATEGORY_LINKS.map((c) => (
              <Link key={c.label} to={c.to} className="site-footer__nav-link">{c.label}</Link>
            ))}
          </div>
          <div className="site-footer__col">
            <span className="site-footer__col-title">ניווט</span>
            <FooterLink to="/my/favorites" icon={Heart} label={t.favoritesLink || 'המועדפים שלי'} />
            <FooterLink to="/contact" icon={Phone} label="צור קשר" />
            <FooterLink to="/register" icon={UserPlus} label="הרשמת בעל צימר" highlight />
          </div>
          <div className="site-footer__col">
            <span className="site-footer__col-title">מידע</span>
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
