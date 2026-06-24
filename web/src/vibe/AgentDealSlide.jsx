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

  const waUrl = effectiveWa
    ? buildWhatsAppUrl(effectiveWa, deal.agent_whatsapp_template, deal.destination_name || deal.destination, dates)
    : null;

  const bookUrl = deal.purchase_link ? addUtmParams(deal.purchase_link, deal.id) : null;

  function trackClick() {
    agentApi.trackClick(deal.id).catch(() => {});
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

      {/* TikTok-style right-side action buttons */}
      <div className="deal-slide__side-actions">
        <motion.button
          className={`deal-slide__side-btn${fav ? ' deal-slide__side-btn--fav-active' : ''}`}
          whileTap={{ scale: 0.85 }}
          onClick={() => toggleFavorite(deal)}
          aria-label={fav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
        >
          <Heart size={20} fill={fav ? 'currentColor' : 'none'} />
        </motion.button>

        {waUrl && (
          <a
            className="deal-slide__side-btn deal-slide__side-btn--wa"
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackClick}
            aria-label="שאל בWhatsApp"
          >
            <MessageCircle size={20} />
          </a>
        )}

        {bookUrl && (
          <a
            className="deal-slide__side-btn deal-slide__side-btn--book"
            href={bookUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackClick}
            aria-label="הזמן"
          >
            <ExternalLink size={20} />
          </a>
        )}
      </div>

      {/* Bottom overlay — TikTok caption style */}
      <div className="deal-slide__overlay">
        {/* Info pills — dark glass */}
        <div className="deal-slide__info-pills">
          {(deal.airline || dates) && (
            <span className="deal-slide__info-pill">
              <span className="icon-draw icon-draw--once" style={{ display: 'inline-flex' }}>
                <Plane size={11} strokeWidth={1.8} />
              </span>
              {[deal.airline, dates].filter(Boolean).join(' · ')}
            </span>
          )}
          {deal.hotel_name && (
            <span className="deal-slide__info-pill">
              <span className="icon-draw icon-draw--once" style={{ display: 'inline-flex' }}>
                <Hotel size={11} strokeWidth={1.8} />
              </span>
              {deal.hotel_name}
              {deal.hotel_stars ? ` ${'★'.repeat(Math.min(Number(deal.hotel_stars), 5))}` : ''}
              {deal.hotel_breakfast ? ' · ☕' : ''}
            </span>
          )}
          {deal.car_type && (
            <span className="deal-slide__info-pill">
              <span className="icon-draw icon-draw--once" style={{ display: 'inline-flex' }}>
                <Car size={11} strokeWidth={1.8} />
              </span>
              {[deal.car_type, deal.car_company].filter(Boolean).join(' · ')}
            </span>
          )}
        </div>

        <h2 className="deal-slide__title">
          {deal.destination_name || deal.destination}
          {deal.country ? `, ${deal.country}` : ''}
        </h2>

        <p className="deal-slide__price-per-person">
          {Math.round(deal.price)}{currencySymbol}
          {deal.value_score > 0 && (
            <span className="agent-deal-slide__value-badge">
              {' '}-{Math.round(deal.value_score)}%
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
          {deal.is_exclusive && (
            <span className="agent-deal-slide__exclusive">{t.exclusiveDealBadge || 'Exclusive'}</span>
          )}
        </div>

        {deal.description && (
          <p className="deal-slide__includes-item">{deal.description}</p>
        )}
      </div>
    </section>
  );
}
