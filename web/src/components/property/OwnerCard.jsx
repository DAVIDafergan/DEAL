import { Link } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from '../SocialIcons.jsx';

const SOCIAL_LINKS = [
  { key: 'website', Icon: Globe, label: 'אתר' },
  { key: 'facebook_url', Icon: FacebookIcon, label: 'פייסבוק' },
  { key: 'instagram_url', Icon: InstagramIcon, label: 'אינסטגרם' },
  { key: 'tiktok_url', Icon: TikTokIcon, label: 'טיקטוק' },
  { key: 'youtube_url', Icon: YouTubeIcon, label: 'יוטיוב' },
];

/** OwnerCard — 7.7 public property page: "כרטיס בעלים עם תמונה, שם, תיאור קצר, אייקוני רשתות,
 * וקישור לכל הנכסים שלו". Only rendered when the property has a verified owner (property.owner
 * is only attached server-side when owner_id is set — see propertyStore.attachOwnerCard). */
export function OwnerCard({ owner }) {
  if (!owner) return null;
  const socials = SOCIAL_LINKS.filter(({ key }) => owner[key]);

  return (
    <div className="owner-card">
      {owner.logo_url
        ? <img src={owner.logo_url} alt={owner.business_name} className="owner-card__avatar" loading="lazy" />
        : <div className="owner-card__avatar-placeholder">{owner.business_name?.[0] || '?'}</div>}

      <div className="owner-card__body">
        <div className="owner-card__name">{owner.business_name}</div>
        {owner.description && <p className="owner-card__desc">{owner.description.slice(0, 90)}{owner.description.length > 90 ? '…' : ''}</p>}
        {socials.length > 0 && (
          <div className="owner-card__socials">
            {socials.map(({ key, Icon, label }) => (
              <a key={key} href={owner[key]} target="_blank" rel="noopener noreferrer" aria-label={label} className="owner-card__social-link">
                <Icon />
              </a>
            ))}
          </div>
        )}
      </div>

      {owner.slug && (
        <Link to={`/owner/${owner.slug}`} className="owner-card__link">
          כל הנכסים
        </Link>
      )}
    </div>
  );
}
