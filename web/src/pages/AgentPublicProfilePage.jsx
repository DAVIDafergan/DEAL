import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share2, MessageCircle, ExternalLink, CheckCircle, ArrowLeft } from 'lucide-react';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getCurrencySymbol } from '../utils/currency.js';

function buildWhatsAppUrl(number, template, dest, dates) {
  const text = (template || `Hi, I saw your deal to {destination} ({dates}) on Deal Radar and I'm interested!`)
    .replace('{destination}', dest || '')
    .replace('{dates}', dates || '');
  return `https://wa.me/${number.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(text)}`;
}

export function AgentPublicProfilePage() {
  const { slug } = useParams();
  const { t } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);

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

  if (loading) return <div className="agent-profile agent-profile--loading">Loading…</div>;
  if (error) return (
    <div className="agent-profile agent-profile--error">
      <p>{t.agentNotFoundMessage || 'Agent not found'}</p>
      <Link to="/">{t.backToFeedButton || '← Back'}</Link>
    </div>
  );

  const { agent, deals } = data;
  const waNumber = agent.whatsapp_number;

  return (
    <div className="agent-profile">
      <Link to="/" className="agent-profile__back"><ArrowLeft size={18} /> {t.backToFeedButton || 'Back'}</Link>

      {/* Header */}
      <motion.div
        className="agent-profile__header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="agent-profile__logo-wrap">
          {agent.logo_url
            ? <img src={agent.logo_url} alt={agent.business_name} className="agent-profile__logo" />
            : <div className="agent-profile__logo-placeholder">{agent.business_name[0]}</div>}
        </div>
        <div className="agent-profile__meta">
          <h1 className="agent-profile__name">{agent.business_name}</h1>
          <span className="agent-profile__verified"><CheckCircle size={14} /> {t.verifiedAgentBadge || 'Verified Agent'}</span>
          {agent.description && <p className="agent-profile__desc">{agent.description}</p>}
          {agent.response_hours && <p className="agent-profile__hours">{t.responseHoursLabel || 'Available'}: {agent.response_hours}</p>}
        </div>
        <div className="agent-profile__actions">
          {waNumber && (
            <a
              className="agent-profile__wa-btn"
              href={buildWhatsAppUrl(waNumber, agent.whatsapp_template, null, null)}
              target="_blank" rel="noopener noreferrer"
            >
              <MessageCircle size={18} /> {t.contactWhatsAppButton || 'WhatsApp'}
            </a>
          )}
          <motion.button className="agent-profile__share-btn" whileTap={{ scale: 0.97 }} onClick={shareProfile}>
            <Share2 size={16} /> {shareCopied ? (t.copiedToClipboard || 'Copied!') : (t.shareButton || 'Share')}
          </motion.button>
        </div>
      </motion.div>

      {/* Deals grid */}
      <h2 className="agent-profile__deals-title">
        {t.agentDealsTitle || 'Active deals'} ({deals.length})
      </h2>

      {deals.length === 0 && <p className="agent-profile__empty">{t.noDealsYet || 'No active deals right now'}</p>}

      <div className="agent-profile__deals-grid">
        {deals.map((deal, i) => {
          const effectiveWa = deal.whatsapp_override || waNumber;
          const dates = `${deal.departure_date}${deal.return_date ? ` – ${deal.return_date}` : ''}`;
          return (
            <motion.div
              key={deal.id}
              className="agent-profile-deal"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              {deal.photo_url && <img src={deal.photo_url} alt={deal.destination_name} className="agent-profile-deal__img" />}
              {deal.is_exclusive ? <span className="agent-profile-deal__exclusive-badge">{t.exclusiveDealBadge || 'Exclusive'}</span> : null}
              <div className="agent-profile-deal__body">
                <h3 className="agent-profile-deal__dest">{deal.destination_name || deal.destination}</h3>
                {deal.country && <span className="agent-profile-deal__country">{deal.country}</span>}
                <p className="agent-profile-deal__dates">{dates}</p>
                <p className="agent-profile-deal__price">
                  {deal.price} {getCurrencySymbol(deal.currency)}
                </p>
                {deal.description && <p className="agent-profile-deal__desc">{deal.description}</p>}
                <div className="agent-profile-deal__actions">
                  {deal.purchase_link && (
                    <motion.button
                      className="agent-profile-deal__book-btn"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => trackAndOpen(deal, addUtmParams(deal.purchase_link, deal.id))}
                    >
                      <ExternalLink size={14} /> {t.bookNowButton || 'Book now'}
                    </motion.button>
                  )}
                  {effectiveWa && (
                    <motion.button
                      className="agent-profile-deal__wa-btn"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => trackAndOpen(deal, buildWhatsAppUrl(effectiveWa, agent.whatsapp_template, deal.destination_name || deal.destination, dates))}
                    >
                      <MessageCircle size={14} /> WhatsApp
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function addUtmParams(url, dealId) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'deal-radar');
    u.searchParams.set('utm_medium', 'referral');
    u.searchParams.set('utm_campaign', 'agent_deal');
    u.searchParams.set('deal_id', String(dealId));
    return u.toString();
  } catch {
    return url;
  }
}
