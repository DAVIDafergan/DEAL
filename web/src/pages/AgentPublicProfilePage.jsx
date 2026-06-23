import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share2, MessageCircle, ExternalLink, CheckCircle, ArrowLeft, Heart } from 'lucide-react';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getCurrencySymbol } from '../utils/currency.js';
import { DealDetailModal } from '../components/DealDetailModal.jsx';
import { useFavorites } from '../hooks/useFavorites.js';

function buildWhatsAppUrl(number, template, dest, dates) {
  const text = (template || `שלום, ראיתי את הדיל שלכם ל-{destination} ({dates}) ב-Deal Radar Pro ואני מתעניין`)
    .replace('{destination}', dest || '')
    .replace('{dates}', dates || '');
  return `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
}

function addUtmParams(url, dealId) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'deal-radar');
    u.searchParams.set('utm_medium', 'referral');
    u.searchParams.set('utm_campaign', 'agent_deal');
    u.searchParams.set('deal_id', String(dealId));
    return u.toString();
  } catch { return url; }
}

export function AgentPublicProfilePage() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    agentApi.getPublicProfile(slug)
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  async function shareProfile() {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: data?.agent?.business_name, url });
    } else {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  async function trackAndOpen(deal, url) {
    try { await agentApi.trackClick(deal.id); } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (loading) return (
    <div className="agent-profile agent-profile--loading" dir="rtl">
      <div className="agent-profile-hero agent-profile-hero--skeleton" />
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-muted)' }}>טוען…</div>
    </div>
  );

  if (error) return (
    <div className="agent-profile agent-profile--error" dir="rtl">
      <p>{t.agentNotFoundMessage || 'Agent not found'}</p>
      <Link to="/">{t.backToFeedButton || '← Back'}</Link>
    </div>
  );

  const { agent, deals } = data;
  const waNumber = agent.whatsapp_number;

  return (
    <div className="agent-profile" dir="rtl">
      {selectedDeal && <DealDetailModal deal={{ ...selectedDeal, agent_whatsapp: waNumber, agent_whatsapp_template: agent.whatsapp_template }} onClose={() => setSelectedDeal(null)} />}

      {/* Luxury hero header */}
      <div className="agent-profile-hero">
        <div className="agent-profile-hero__bg" />
        <div className="agent-profile-hero__content">
          <Link to="/" className="agent-profile-hero__back">
            <ArrowLeft size={16} /> {t.backToFeedButton || 'חזרה'}
          </Link>

          <motion.div
            className="agent-profile-hero__card"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <div className="agent-profile-hero__logo-wrap">
              {agent.logo_url
                ? <img src={agent.logo_url} alt={agent.business_name} className="agent-profile-hero__logo" />
                : <div className="agent-profile-hero__logo-placeholder">{agent.business_name[0]}</div>}
            </div>

            <div className="agent-profile-hero__info">
              <h1 className="agent-profile-hero__name">{agent.business_name}</h1>
              <div className="agent-profile-hero__verified">
                <CheckCircle size={15} />
                <span>{t.verifiedAgentBadge || 'סוכן מאומת'}</span>
              </div>
              {agent.description && <p className="agent-profile-hero__desc">{agent.description}</p>}
              {agent.response_hours && (
                <p className="agent-profile-hero__hours">🕐 {agent.response_hours}</p>
              )}
            </div>

            <div className="agent-profile-hero__actions">
              {waNumber && (
                <a
                  className="agent-profile-hero__wa-btn"
                  href={buildWhatsAppUrl(waNumber, agent.whatsapp_template, null, null)}
                  target="_blank" rel="noopener noreferrer"
                >
                  <MessageCircle size={18} /> {t.contactWhatsAppButton || 'WhatsApp'}
                </a>
              )}
              <motion.button className="agent-profile-hero__share-btn" whileTap={{ scale: 0.97 }} onClick={shareProfile}>
                <Share2 size={15} /> {shareCopied ? (t.copiedToClipboard || 'הועתק!') : (t.shareButton || 'שתף')}
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Deals section */}
      <div className="agent-profile-deals">
        <h2 className="agent-profile-deals__title">
          {t.agentDealsTitle || 'דילים פעילים'} <span className="agent-profile-deals__count">({deals.length})</span>
        </h2>

        {deals.length === 0 && <p className="agent-profile__empty">{t.noDealsYet || 'אין דילים פעילים כרגע'}</p>}

        <div className="agent-profile-deals__grid">
          {deals.map((deal, i) => {
            const effectiveWa = deal.whatsapp_override || waNumber;
            const dep = deal.departure_date ? new Date(deal.departure_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
            const ret = deal.return_date ? new Date(deal.return_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
            const dates = dep && ret ? `${dep} – ${ret}` : dep || '';
            const fav = isFavorite(deal);
            return (
              <motion.div
                key={deal.id}
                className="agent-profile-deal-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => setSelectedDeal(deal)}
              >
                <div className="agent-profile-deal-card__media">
                  {deal.photo_url
                    ? <img src={deal.photo_url} alt={deal.destination_name} className="agent-profile-deal-card__img" />
                    : <div className="agent-profile-deal-card__img-placeholder" />}
                  <div className="agent-profile-deal-card__media-overlay" />
                  <motion.button
                    className={`agent-profile-deal-card__fav${fav ? ' is-fav' : ''}`}
                    whileTap={{ scale: 0.85 }}
                    onClick={e => { e.stopPropagation(); toggleFavorite(deal); }}
                  >
                    <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
                  </motion.button>
                  {deal.is_exclusive && (
                    <span className="agent-profile-deal-card__exclusive">{t.exclusiveDealBadge || 'Exclusive'}</span>
                  )}
                  <div className="agent-profile-deal-card__price-overlay">
                    <span>{deal.price} {getCurrencySymbol(deal.currency)}</span>
                  </div>
                </div>
                <div className="agent-profile-deal-card__body">
                  <h3 className="agent-profile-deal-card__dest">{deal.destination_name || deal.destination}</h3>
                  {dates && <p className="agent-profile-deal-card__dates">{dates}</p>}
                  {deal.airline && (
                    <p className="agent-profile-deal-card__meta">✈ {deal.airline}</p>
                  )}
                  {deal.hotel_name && (
                    <p className="agent-profile-deal-card__meta">🏨 {deal.hotel_name}</p>
                  )}
                  <div className="agent-profile-deal-card__actions">
                    {deal.purchase_link && (
                      <motion.button
                        className="agent-profile-deal-card__btn agent-profile-deal-card__btn--book"
                        whileTap={{ scale: 0.97 }}
                        onClick={e => { e.stopPropagation(); trackAndOpen(deal, addUtmParams(deal.purchase_link, deal.id)); }}
                      >
                        <ExternalLink size={13} /> {t.bookNowButton || 'הזמן'}
                      </motion.button>
                    )}
                    {effectiveWa && (
                      <motion.button
                        className="agent-profile-deal-card__btn agent-profile-deal-card__btn--wa"
                        whileTap={{ scale: 0.97 }}
                        onClick={e => { e.stopPropagation(); trackAndOpen(deal, buildWhatsAppUrl(effectiveWa, agent.whatsapp_template, deal.destination_name || deal.destination, dates)); }}
                      >
                        <MessageCircle size={13} />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
