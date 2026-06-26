import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MessageCircle, ExternalLink, CheckCircle, Plane, Hotel, Car, Heart } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { agentApi } from '../../api/client.js';
import { getCurrencySymbol } from '../../utils/currency.js';
import { DealDetailModal } from '../DealDetailModal.jsx';
import { useFavorites } from '../../hooks/useFavorites.js';

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

function stars(n) {
  if (!n) return '';
  return '★'.repeat(Math.min(Number(n), 5));
}

export function AgentDealCard({ deal }) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(deal);
  const effectiveWa = deal.whatsapp_override || deal.agent_whatsapp;
  const dep = deal.departure_date
    ? new Date(deal.departure_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
    : null;
  const ret = deal.return_date
    ? new Date(deal.return_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
    : null;
  const dates = dep && ret ? `${dep}–${ret}` : dep || '';

  function handleClick(url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    agentApi.trackClick(deal.id).catch(() => {});
  }

  function handleWaClick(e, url) {
    e.stopPropagation();
    agentApi.trackClick(deal.id).catch(() => {});
    // href handles navigation — no window.open needed
  }

  return (
    <>
      {showModal && <DealDetailModal deal={deal} onClose={() => setShowModal(false)} />}

      <motion.article
        className="adc"
        whileHover={{ y: -4 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        onClick={() => setShowModal(true)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setShowModal(true)}
        aria-label={`דיל ל${deal.destination_name || deal.destination}`}
      >
        {/* ── Media ────────────────────────────────────────────────── */}
        <div className="adc__media">
          {deal.photo_url
            ? <img src={deal.photo_url} alt={deal.destination_name} className="adc__img" />
            : <div className="adc__img-placeholder" />}

          <div className="adc__media-gradient" />

          {/* Value score badge — top right */}
          {deal.value_score > 0 && (
            <span className="adc__value-badge">
              -{Math.round(deal.value_score)}%
            </span>
          )}

          {/* Exclusive — top left */}
          {deal.is_exclusive && (
            <span className="adc__exclusive-badge">
              🔥 {t.exclusiveDealBadge || 'בלעדי'}
            </span>
          )}

          {/* Destination overlay — bottom */}
          <div className="adc__overlay-bottom">
            <div>
              <div className="adc__dest-name">{deal.destination_name || deal.destination}</div>
              {deal.country && <span className="adc__country">{deal.country}</span>}
            </div>
            <span className="adc__agent-badge" onClick={e => e.stopPropagation()}>
              <CheckCircle size={10} />
              <Link to={`/agent/${deal.agent_slug}`} className="adc__agent-link" onClick={e => e.stopPropagation()}>
                {deal.business_name}
              </Link>
            </span>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="adc__body">
          {/* Info rows */}
          {(deal.airline || dates || deal.departure_time) && (
            <div className="adc__info-row">
              <span className="icon-draw icon-draw--once adc__info-icon">
                <Plane size={12} strokeWidth={1.8} />
              </span>
              <span className="adc__info-text">
                {[
                  deal.airline,
                  dates,
                  deal.departure_time && deal.arrival_time
                    ? `${deal.departure_time}→${deal.arrival_time}`
                    : null,
                ].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          {deal.hotel_name && (
            <div className="adc__info-row">
              <span className="icon-draw icon-draw--once adc__info-icon">
                <Hotel size={12} strokeWidth={1.8} />
              </span>
              <span className="adc__info-text">
                {deal.hotel_name}
                {deal.hotel_stars ? ` ${stars(deal.hotel_stars)}` : ''}
                {deal.hotel_breakfast ? ' · 🍳' : ''}
                {deal.hotel_lunch ? ' · 🍽️' : ''}
                {deal.hotel_dinner ? ' · 🌙' : ''}
              </span>
            </div>
          )}
          {deal.car_type && (
            <div className="adc__info-row">
              <span className="icon-draw icon-draw--once adc__info-icon">
                <Car size={12} strokeWidth={1.8} />
              </span>
              <span className="adc__info-text">
                {[deal.car_type, deal.car_company].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}

          {/* Price + actions */}
          <div className="adc__footer">
            <div className="adc__price-block">
              <span className="adc__price">
                {Math.round(deal.price)}{' '}
                <span className="adc__currency">{getCurrencySymbol(deal.currency)}</span>
              </span>
              {deal.passenger_count && (
                <span className="adc__pax">
                  {{ 1: 'ליחיד', 2: 'לזוג', 3: 'ל-3', 4: 'ל-4+' }[deal.passenger_count] || `ל-${deal.passenger_count}`}
                </span>
              )}
              {deal.description && (
                <span className="adc__desc-snippet">{deal.description.slice(0, 40)}</span>
              )}
            </div>

            <div className="adc__actions" onClick={e => e.stopPropagation()}>
              <motion.button
                className={`adc__btn adc__btn--fav${fav ? ' is-fav' : ''}`}
                whileTap={{ scale: 0.88 }}
                onClick={e => { e.stopPropagation(); toggleFavorite(deal); }}
                aria-label={fav ? 'הסר ממועדפים' : 'שמור למועדפים'}
              >
                <Heart size={15} fill={fav ? 'currentColor' : 'none'} />
              </motion.button>

              {effectiveWa && (
                <a
                  className="adc__btn adc__btn--wa"
                  href={buildWhatsAppUrl(effectiveWa, deal.agent_whatsapp_template, deal.destination_name || deal.destination, dates)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => handleWaClick(e, buildWhatsAppUrl(effectiveWa, deal.agent_whatsapp_template, deal.destination_name || deal.destination, dates))}
                  aria-label="שאל בWhatsApp"
                >
                  <MessageCircle size={14} />
                </a>
              )}

              {deal.purchase_link && (
                <a
                  className="adc__btn adc__btn--book"
                  href={addUtmParams(deal.purchase_link, deal.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => { e.stopPropagation(); agentApi.trackClick(deal.id).catch(() => {}); }}
                >
                  <ExternalLink size={13} />
                  <span>{t.buyNowButton || 'הזמן'}</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.article>
    </>
  );
}
