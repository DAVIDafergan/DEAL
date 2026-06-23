import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, ExternalLink, CheckCircle, Plane, Hotel, Car } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { agentApi } from '../../api/client.js';
import { getCurrencySymbol } from '../../utils/currency.js';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
};

function buildWhatsAppUrl(number, template, destName, dates, platformName = 'Deal Radar') {
  const text = (template || `Hi! I saw your deal to {destination} ({dates}) on ${platformName} and I'm interested.`)
    .replace('{destination}', destName || '')
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

function stars(n) {
  if (!n) return '';
  return '★'.repeat(Number(n));
}

export function AgentDealCard({ deal }) {
  const { t } = useLanguage();
  const effectiveWa = deal.whatsapp_override || deal.agent_whatsapp;
  const dep = deal.departure_date ? new Date(deal.departure_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
  const ret = deal.return_date ? new Date(deal.return_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
  const dates = dep && ret ? `${dep} → ${ret}` : dep || '';

  async function handleClick(url) {
    try { await agentApi.trackClick(deal.id); } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <motion.article
      className="deal-card agent-deal-card"
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="deal-card__media">
        {deal.photo_url
          ? <img src={deal.photo_url} alt={deal.destination_name} className="deal-card__media-img" />
          : <div className="deal-card__media-placeholder" />}
        <span className="agent-deal-card__badge">
          <CheckCircle size={11} />
          <Link to={`/agent/${deal.agent_slug}`} className="agent-deal-card__badge-link" onClick={e => e.stopPropagation()}>
            {deal.business_name}
          </Link>
        </span>
        {deal.is_exclusive ? <span className="deal-card__badge deal-card__badge--exclusive">{t.exclusiveDealBadge || 'Exclusive'}</span> : null}
        <span className="deal-card__route">{deal.destination_name || deal.destination}{deal.country ? `, ${deal.country}` : ''}</span>
      </div>

      <div className="deal-card__body">
        <h3 className="deal-card__title">{deal.destination_name || deal.destination}</h3>

        {/* Structured info rows */}
        <div className="agent-deal-card__info">
          {(deal.airline || dates) && (
            <div className="agent-deal-card__info-row">
              <span className="icon-draw icon-draw--once"><Plane size={13} strokeWidth={1.8} /></span>
              <span>{[deal.airline, dates].filter(Boolean).join(' · ')}</span>
            </div>
          )}
          {deal.hotel_name && (
            <div className="agent-deal-card__info-row">
              <span className="icon-draw icon-draw--once"><Hotel size={13} strokeWidth={1.8} /></span>
              <span>
                {deal.hotel_name}
                {deal.hotel_stars ? ` ${stars(deal.hotel_stars)}` : ''}
                {deal.hotel_breakfast ? ' · ☕' : ''}
              </span>
            </div>
          )}
          {deal.car_type && (
            <div className="agent-deal-card__info-row">
              <span className="icon-draw icon-draw--once"><Car size={13} strokeWidth={1.8} /></span>
              <span>{[deal.car_type, deal.car_company].filter(Boolean).join(' · ')}</span>
            </div>
          )}
        </div>

        <div className="deal-card__price-row">
          <span className="deal-card__price">
            {deal.price} {getCurrencySymbol(deal.currency)}
          </span>
          {deal.value_score > 0 && (
            <span className="deal-card__price-avg agent-deal-card__value-badge">
              -{Math.round(deal.value_score)}% {t.vsMarketLabel || 'vs avg'}
            </span>
          )}
        </div>

        {deal.description && <p className="deal-card__desc">{deal.description}</p>}

        <div className="deal-card__actions">
          {effectiveWa && (
            <motion.button
              className="deal-card__action agent-deal-card__wa-btn"
              whileTap={{ scale: 0.96 }}
              onClick={() => handleClick(buildWhatsAppUrl(effectiveWa, deal.whatsapp_template, deal.destination_name || deal.destination, dates))}
            >
              <MessageCircle size={14} /> WhatsApp
            </motion.button>
          )}
          {deal.purchase_link && (
            <motion.button
              className="deal-card__action deal-card__action--buy"
              whileTap={{ scale: 0.96 }}
              onClick={() => handleClick(addUtmParams(deal.purchase_link, deal.id))}
            >
              <ExternalLink size={13} /> {t.buyNowButton || 'Book'}
            </motion.button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
