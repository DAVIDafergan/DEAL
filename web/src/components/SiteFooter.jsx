import { Link } from './LocalizedLink.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Logo } from './Logo.jsx';
import { Heart, FileText, Shield, Phone, UserPlus, Accessibility } from 'lucide-react';
import { REGIONS, regionLabel } from '../data/propertyOptions.js';

// 9.7/9.8: category link targets stay Hebrew-slugged (/קטגוריה/כשר) even on the English site —
// the programmatic-SEO category pages only exist at these paths (see server/seo/categories.js);
// LocalizedLink still prefixes them with /en correctly, but the landing page's own generated
// copy (h1/intro/FAQ) is Hebrew-only server-side content, a documented gap (DECISIONS.md 9.8).
const CATEGORY_LINK_SLUGS = [
  { labelKey: 'categoryJacuzzi', slug: "ג'קוזי" },
  { labelKey: 'categoryPool', slug: 'בריכה' },
  { labelKey: 'categoryKosher', slug: 'כשר' },
  { labelKey: 'categoryFamilies', slug: 'למשפחות' },
  { labelKey: 'categoryGroups', slug: 'לקבוצות-גדולות' },
];

export function SiteFooter() {
  const { t, dir, lang } = useLanguage();
  return (
    <footer className="site-footer" dir={dir}>
      <div className="site-footer__inner container">

        {/* Brand column */}
        <div className="site-footer__brand">
          <Link to="/" className="site-footer__logo-link" aria-label={`Dealim – ${t.homeLink}`}>
            <Logo size={32} />
          </Link>
          <p className="site-footer__tagline">
            {t.footerTagline}<br />{t.footerTaglineSub}
          </p>
          <a
            href="https://wa.me/972556674329"
            target="_blank"
            rel="noopener noreferrer"
            className="site-footer__credit"
          >
            {t.footerCredit}
          </a>
        </div>

        {/* Navigation columns */}
        <div className="site-footer__cols">
          <div className="site-footer__col">
            <span className="site-footer__col-title">{t.footerRegionsTitle}</span>
            {REGIONS.map((r) => (
              <Link key={r.value} to={`/אזור/${encodeURIComponent(r.label)}`} className="site-footer__nav-link">{regionLabel(r.value, lang)}</Link>
            ))}
          </div>
          <div className="site-footer__col">
            <span className="site-footer__col-title">{t.footerCategoriesTitle}</span>
            {CATEGORY_LINK_SLUGS.map((c) => (
              <Link key={c.labelKey} to={`/קטגוריה/${encodeURIComponent(c.slug)}`} className="site-footer__nav-link">{t[c.labelKey]}</Link>
            ))}
          </div>
          <div className="site-footer__col">
            <span className="site-footer__col-title">{t.footerNavTitle}</span>
            <FooterLink to="/my/favorites" icon={Heart} label={t.favoritesLink} />
            <FooterLink to="/contact" icon={Phone} label={t.footerContact} />
            <FooterLink to="/register" icon={UserPlus} label={t.footerOwnerRegister} highlight />
          </div>
          <div className="site-footer__col">
            <span className="site-footer__col-title">{t.footerInfoTitle}</span>
            <FooterLink to="/terms" icon={FileText} label={t.termsLink} />
            <FooterLink to="/privacy" icon={Shield} label={t.privacyLink} />
            <FooterLink to="/accessibility" icon={Accessibility} label={t.accessibilityLink} />
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>{t.footerRights(new Date().getFullYear())}</span>
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
