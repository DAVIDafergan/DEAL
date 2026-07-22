import { Link } from '../LocalizedLink.jsx';
import { Globe, ShieldCheck } from 'lucide-react';
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from '../SocialIcons.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { optimizedImageUrl } from '../../utils/imageUrl.js';

const SOCIAL_LINKS = [
  { key: 'website', Icon: Globe, labelKey: 'socialWebsite' },
  { key: 'facebook_url', Icon: FacebookIcon, labelKey: 'socialFacebook' },
  { key: 'instagram_url', Icon: InstagramIcon, labelKey: 'socialInstagram' },
  { key: 'tiktok_url', Icon: TikTokIcon, labelKey: 'socialTiktok' },
  { key: 'youtube_url', Icon: YouTubeIcon, labelKey: 'socialYoutube' },
];

/** OwnerCard — 7.7 public property page: "כרטיס בעלים עם תמונה, שם, תיאור קצר, אייקוני רשתות,
 * וקישור לכל הנכסים שלו". Only rendered when the property has a verified owner (property.owner
 * is only attached server-side when owner_id is set — see propertyStore.attachOwnerCard).
 * owner.description is seller-entered content and intentionally NOT translated (9.8: "תוכן
 * שהמוכר הזין נשאר בשפת המקור") — there's no stored content-language field to base a language
 * badge on, so one isn't shown; see DECISIONS.md 9.8. */
export function OwnerCard({ owner }) {
  const { t } = useLanguage();
  if (!owner) return null;
  const socials = SOCIAL_LINKS.filter(({ key }) => owner[key]);

  return (
    <div className="owner-card">
      {owner.logo_url
        ? <img src={optimizedImageUrl(owner.logo_url, { width: 96 })} alt={owner.business_name} className="owner-card__avatar" loading="lazy" />
        : <div className="owner-card__avatar-placeholder">{owner.business_name?.[0] || '?'}</div>}

      <div className="owner-card__body">
        <div className="owner-card__name">
          {owner.business_name}
          {owner.trust_label && (
            <span className={`owner-card__trust owner-card__trust--${owner.trust_label}`}>
              <ShieldCheck size={12} /> {t[`ownerTrust_${owner.trust_label}`]}
            </span>
          )}
        </div>
        {owner.description && <p className="owner-card__desc">{owner.description.slice(0, 90)}{owner.description.length > 90 ? '…' : ''}</p>}
        {socials.length > 0 && (
          <div className="owner-card__socials">
            {socials.map(({ key, Icon, labelKey }) => (
              <a key={key} href={owner[key]} target="_blank" rel="noopener noreferrer" aria-label={t[labelKey]} className="owner-card__social-link">
                <Icon />
              </a>
            ))}
          </div>
        )}
      </div>

      {owner.slug && (
        <Link to={`/owner/${owner.slug}`} className="owner-card__link">
          {t.ownerCardAllProperties}
        </Link>
      )}
    </div>
  );
}
