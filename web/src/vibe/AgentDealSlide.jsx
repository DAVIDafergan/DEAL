import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, ExternalLink, CheckCircle, Plane, Hotel, Car, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { agentApi } from '../api/client.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { useFavorites } from '../hooks/useFavorites.js';

function buildWhatsAppUrl(number, template, destName, dates) {
  const text = (template || `שלום, ראיתי את הדיל שלכם ל-{destination} ({dates}) ב-Deal Radar Pro ואני מתעניין`)
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

export function AgentDealSlide({ deal }) {
  const { t } = useLanguage();
  const slideRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(deal);

  useEffect(() => {
    const el = slideRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setIsActive(entry.isIntersecting && entry.intersectionRatio >= 0.5),
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const effectiveWa = deal.whatsapp_override || deal.agent_whatsapp;
  const dep = deal.departure_date ? new Date(deal.departure_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
  const ret = deal.return_date ? new Date(deal.return_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
  const dates = dep && ret ? `${dep} → ${ret}` : dep || '';
  const currencySymbol = getCurrencySymbol(deal.currency);

  async function handleClick(url) {
    try { await agentApi.trackClick(deal.id); } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <section ref={slideRef} className="deal-slide agent-deal-slide">
      <div className="deal-slide__media">
        {deal.video_url && isActive ? (
          <video
            className="deal-slide__video"
            src={deal.video_url}
            poster={deal.photo_url || undefined}
            autoPlay muted loop playsInline
          />
        ) : deal.photo_url ? (
          <img className="deal-slide__photo" src={deal.photo_url} alt="" loading="lazy" />
        ) : (
          <motion.div
            className="deal-slide__motion-fallback"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      <div className="deal-slide__overlay">
        <h2 className="deal-slide__title">
          {deal.destination_name || deal.destination}
          {deal.country ? `, ${deal.country}` : ''}
        </h2>

        <div className="deal-slide__includes">
          <p className="deal-slide__includes-item">
            <span className="icon-draw icon-draw--once" style={{ display: 'inline-flex', verticalAlign: 'middle', marginInlineEnd: 4 }}>
              <Plane size={14} strokeWidth={1.8} />
            </span>
            {[deal.airline, dates].filter(Boolean).join(' · ')}
          </p>
          {deal.hotel_name && (
            <p className="deal-slide__includes-item">
              <span className="icon-draw icon-draw--once" style={{ display: 'inline-flex', verticalAlign: 'middle', marginInlineEnd: 4 }}>
                <Hotel size={14} strokeWidth={1.8} />
              </span>
              {deal.hotel_name}{deal.hotel_stars ? ` ${'★'.repeat(deal.hotel_stars)}` : ''}{deal.hotel_breakfast ? ' · ☕' : ''}
            </p>
          )}
          {deal.car_type && (
            <p className="deal-slide__includes-item">
              <span className="icon-draw icon-draw--once" style={{ display: 'inline-flex', verticalAlign: 'middle', marginInlineEnd: 4 }}>
                <Car size={14} strokeWidth={1.8} />
              </span>
              {[deal.car_type, deal.car_company].filter(Boolean).join(' · ')}
            </p>
          )}
          {deal.description && (
            <p className="deal-slide__includes-item">{deal.description}</p>
          )}
        </div>

        <p className="deal-slide__price-per-person">
          {Math.round(deal.price)}{currencySymbol}
          {deal.value_score > 0 && (
            <span className="agent-deal-slide__value-badge">
              {' '}-{Math.round(deal.value_score)}% {t.vsMarketLabel || 'vs avg'}
            </span>
          )}
        </p>

        <div className="agent-deal-slide__badge">
          <CheckCircle size={12} />
          <Link
            to={`/agent/${deal.agent_slug}`}
            className="agent-deal-slide__badge-link"
            onClick={e => e.stopPropagation()}
          >
            {deal.business_name}
          </Link>
          {deal.is_exclusive ? (
            <span className="agent-deal-slide__exclusive">{t.exclusiveDealBadge || 'Exclusive'}</span>
          ) : null}
        </div>

        <div className="agent-deal-slide__actions">
          <motion.button
            className={`agent-deal-slide__fav-btn${fav ? ' is-fav' : ''}`}
            whileTap={{ scale: 0.85 }}
            onClick={() => toggleFavorite(deal)}
            aria-label={fav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
          >
            <Heart size={18} fill={fav ? 'currentColor' : 'none'} />
          </motion.button>
          {effectiveWa && (
            <motion.button
              className="agent-deal-slide__wa-btn"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(buildWhatsAppUrl(
                effectiveWa,
                deal.agent_whatsapp_template,
                deal.destination_name || deal.destination,
                dates
              ))}
            >
              <MessageCircle size={16} /> WhatsApp
            </motion.button>
          )}
          {deal.purchase_link && (
            <motion.button
              className="agent-deal-slide__book-btn"
              whileTap={{ scale: 0.95 }}
              onClick={() => handleClick(addUtmParams(deal.purchase_link, deal.id))}
            >
              <ExternalLink size={16} /> {t.bookNowButton || 'Book'}
            </motion.button>
          )}
        </div>
      </div>
    </section>
  );
}
