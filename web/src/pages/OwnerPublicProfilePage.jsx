import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Share2, MessageCircle, CheckCircle, ArrowLeft, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { propertyApi } from '../api/client.js';
import { PropertyCard } from '../components/PropertyCard.jsx';
import { FacebookIcon, InstagramIcon, TikTokIcon, YouTubeIcon } from '../components/SocialIcons.jsx';

const SOCIAL_LINKS = [
  { key: 'website', Icon: Globe, label: 'אתר' },
  { key: 'facebook_url', Icon: FacebookIcon, label: 'פייסבוק' },
  { key: 'instagram_url', Icon: InstagramIcon, label: 'אינסטגרם' },
  { key: 'tiktok_url', Icon: TikTokIcon, label: 'טיקטוק' },
  { key: 'youtube_url', Icon: YouTubeIcon, label: 'יוטיוב' },
];

/** OwnerPublicProfilePage — same agent-social-profile shell as AgentPublicProfilePage, properties instead of deals. */
export function OwnerPublicProfilePage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    propertyApi.getByOwnerSlug(slug)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function shareProfile() {
    const url = `https://dealim.org/owner/${slug}`;
    if (navigator.share) {
      await navigator.share({ title: data?.owner?.business_name, url });
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  if (loading) return (
    <div className="agent-social-profile" dir="rtl">
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>טוען…</div>
    </div>
  );

  if (error || !data) return (
    <div className="agent-social-profile agent-social-profile--error" dir="rtl">
      <p>בעל הנכס לא נמצא</p>
      <Link to="/">← חזרה</Link>
    </div>
  );

  const { owner, properties } = data;
  const waNumber = owner.whatsapp_number;

  return (
    <div className="agent-social-profile" dir="rtl">
      <div className="agent-social-profile__topbar container">
        <Link to="/" className="agent-social-profile__back-clean">
          <ArrowLeft size={14} /> חזרה
        </Link>
      </div>

      <div className="agent-social-profile__header container agent-social-profile__header--clean">
        <div className="agent-social-profile__avatar-wrap">
          {owner.logo_url
            ? <img src={owner.logo_url} alt={owner.business_name} className="agent-social-profile__avatar" />
            : <div className="agent-social-profile__avatar-placeholder">{owner.business_name[0]}</div>}
        </div>

        <div className="agent-social-profile__meta">
          <div className="agent-social-profile__name-row">
            <h1 className="agent-social-profile__name">{owner.business_name}</h1>
            <span className="agent-social-profile__verified">
              <CheckCircle size={16} /> מאומת
            </span>
          </div>

          <div className="agent-social-profile__stats">
            <div className="agent-social-profile__stat">
              <strong>{properties.length}</strong>
              <span>נכסים</span>
            </div>
            {owner.response_hours && (
              <div className="agent-social-profile__stat">
                <span className="agent-social-profile__stat-detail">🕐 {owner.response_hours}</span>
              </div>
            )}
          </div>

          {owner.description && <p className="agent-social-profile__bio">{owner.description}</p>}

          {SOCIAL_LINKS.some(({ key }) => owner[key]) && (
            <div className="owner-card__socials" style={{ marginBottom: 4 }}>
              {SOCIAL_LINKS.filter(({ key }) => owner[key]).map(({ key, Icon, label }) => (
                <a key={key} href={owner[key]} target="_blank" rel="noopener noreferrer" aria-label={label} className="owner-card__social-link">
                  <Icon />
                </a>
              ))}
            </div>
          )}

          <div className="agent-social-profile__cta">
            {waNumber && (
              <a className="agent-social-profile__wa-btn" href={`https://wa.me/${waNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} /> WhatsApp
              </a>
            )}
            <motion.button className="agent-social-profile__share-btn" whileTap={{ scale: 0.97 }} onClick={shareProfile}>
              <Share2 size={15} /> {shareCopied ? 'הועתק!' : 'שיתוף'}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="agent-social-profile__divider container" />

      <section className="agent-social-profile__deals container">
        <h2 className="agent-social-profile__deals-title">
          נכסים <span className="agent-social-profile__deals-count"> ({properties.length})</span>
        </h2>

        {properties.length === 0 && <p className="agent-social-profile__empty">אין נכסים פעילים כרגע</p>}

        <div className="agent-social-profile__deals-grid">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      </section>
    </div>
  );
}
