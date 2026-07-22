import { Link } from './LocalizedLink.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { Logo } from './Logo.jsx';
import { Heart, FileText, Shield, Phone, UserPlus, Accessibility, Trash2 } from 'lucide-react';
import { InstagramIcon, FacebookIcon, YouTubeIcon } from './SocialIcons.jsx';
import { REGIONS, PROPERTY_TYPES, regionLabel, propertyTypeLabel } from '../data/propertyOptions.js';

// 11.2: no real social accounts exist for the site yet — these only render if actually
// configured via env, rather than linking to invented/guessed URLs (see DECISIONS.md 11.2).
const SOCIAL_LINKS = [
  { key: 'instagram', url: import.meta.env.VITE_SOCIAL_INSTAGRAM, icon: InstagramIcon },
  { key: 'facebook', url: import.meta.env.VITE_SOCIAL_FACEBOOK, icon: FacebookIcon },
  { key: 'youtube', url: import.meta.env.VITE_SOCIAL_YOUTUBE, icon: YouTubeIcon },
].filter((s) => s.url);

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
            <span className="site-footer__col-title">{t.footerTypesTitle}</span>
            {PROPERTY_TYPES.map((p) => (
              <Link key={p.value} to={`/?type=${p.value}`} className="site-footer__nav-link">{propertyTypeLabel(p.value, lang)}</Link>
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
            <FooterLink to="/remove" icon={Trash2} label={t.footerRemoveListing} />
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <span>{t.footerRights(new Date().getFullYear())}</span>
        {SOCIAL_LINKS.length > 0 && (
          <div className="site-footer__social">
            {SOCIAL_LINKS.map(({ key, url, icon: Icon }) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer" aria-label={key} className="site-footer__social-link">
                <Icon size={16} />
              </a>
            ))}
          </div>
        )}
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
