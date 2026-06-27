import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, MessageCircle, ExternalLink, Plane, Hotel, Car, CheckCircle, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getCurrencySymbol } from '../utils/currency.js';
import { agentApi } from '../api/client.js';
import { useFavorites } from '../hooks/useFavorites.js';

function buildWhatsAppUrl(number, template, dest, dates) {
  const text = (template || `שלום, ראיתי את הדיל שלכם ל-{destination} ({dates}) ב-Dealim ואני מתעניין`)
    .replace('{destination}', dest || '')
    .replace('{dates}', dates || '');
  let clean = number.replace(/[^0-9]/g, '');
  if (clean.startsWith('0') && clean.length === 10) clean = '972' + clean.slice(1);
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
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

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const panelVariants = {
  hidden: { opacity: 0, y: 60, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } },
  exit: { opacity: 0, y: 40, scale: 0.97, transition: { duration: 0.2 } },
};

const detailsContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.25 } },
};

const detailRow = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const PAX_LABEL = { 1: 'ליחיד', 2: 'לזוג', 3: 'ל-3 נוסעים', 4: 'ל-4+ נוסעים' };

export function DealDetailModal({ deal, onClose }) {
  const { t } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [copied, setCopied] = useState(false);
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previousFocusRef.current = document.activeElement;
    // Focus first focusable element in modal
    setTimeout(() => {
      const focusable = modalRef.current?.querySelector(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }, 50);
    return () => {
      document.body.style.overflow = prev;
      previousFocusRef.current?.focus();
    };
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = [...modalRef.current.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!deal) return null;

  const effectiveWa = deal.whatsapp_override || deal.agent_whatsapp;
  const dep = deal.departure_date ? new Date(deal.departure_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null;
  const ret = deal.return_date ? new Date(deal.return_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' }) : null;
  const dates = dep && ret ? `${dep} – ${ret}` : dep || '';
  const fav = isFavorite(deal);

  async function handleAction(url) {
    try { await agentApi.trackClick(deal.id); } catch {}
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  async function handleShare() {
    const url = deal.agent_slug
      ? `${window.location.origin}/agent/${deal.agent_slug}`
      : window.location.href;
    const title = `דיל ל${deal.destination_name || deal.destination} — ${deal.price} ${deal.currency}`;
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <AnimatePresence>
      <motion.div
        className="deal-modal-overlay"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        aria-hidden="true"
      >
        <motion.div
          ref={modalRef}
          className="deal-modal"
          variants={panelVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={e => e.stopPropagation()}
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deal-modal-title"
        >
          {/* Close button */}
          <button className="deal-modal__close" onClick={onClose} aria-label="סגור">
            <X size={20} />
          </button>

          {/* Media */}
          <div className="deal-modal__media">
            {deal.video_url ? (
              <video
                src={deal.video_url}
                className="deal-modal__media-img"
                autoPlay muted loop playsInline
              />
            ) : deal.photo_url ? (
              <img src={deal.photo_url} alt={deal.destination_name} className="deal-modal__media-img" />
            ) : (
              <div className="deal-modal__media-placeholder" />
            )}
            <div className="deal-modal__media-gradient" />

            {/* Favorite button */}
            <motion.button
              className={`deal-modal__fav-btn${fav ? ' is-active' : ''}`}
              whileTap={{ scale: 0.88 }}
              onClick={() => toggleFavorite(deal)}
              aria-label={fav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
            >
              <Heart size={20} fill={fav ? 'currentColor' : 'none'} />
            </motion.button>

            {/* Price overlay */}
            <div className="deal-modal__price-overlay">
              <span className="deal-modal__price">{deal.price} {getCurrencySymbol(deal.currency)}</span>
              {deal.value_score > 0 && (
                <span className="deal-modal__value-badge">-{Math.round(deal.value_score)}% {t.vsMarketLabel || 'vs avg'}</span>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="deal-modal__body">
            <h2 id="deal-modal-title" className="deal-modal__title">{deal.destination_name || deal.destination}</h2>
            {deal.country && <p className="deal-modal__country">{deal.country}</p>}

            {/* Agent badge */}
            {deal.business_name && (
              <div className="deal-modal__agent-row">
                <Link to={`/agent/${deal.agent_slug}`} className="deal-modal__agent-badge" onClick={onClose}>
                  <CheckCircle size={13} /> {deal.business_name}
                </Link>
                {deal.passenger_count && (
                  <span className="deal-modal__pax">{PAX_LABEL[deal.passenger_count] || `ל-${deal.passenger_count} נוסעים`}</span>
                )}
              </div>
            )}

            {/* Details — animated entrance */}
            <motion.div
              className="deal-modal__details"
              variants={detailsContainer}
              initial="hidden"
              animate="visible"
            >
              {deal.departure_date && (
                <motion.div className="deal-modal__detail-row" variants={detailRow}>
                  <Plane size={15} />
                  <div className="deal-modal__detail-block">
                    <span className="deal-modal__detail-label">יוצאים</span>
                    <span>{new Date(deal.departure_date).toLocaleDateString('he-IL', { day: '2-digit', month: 'long', year: 'numeric' })}{deal.departure_time ? ` · ${deal.departure_time}` : ''}</span>
                  </div>
                </motion.div>
              )}
              {deal.return_date && (
                <motion.div className="deal-modal__detail-row" variants={detailRow}>
                  <Plane size={15} style={{ transform: 'scaleX(-1)' }} />
                  <div className="deal-modal__detail-block">
                    <span className="deal-modal__detail-label">חוזרים</span>
                    <span>{new Date(deal.return_date).toLocaleDateString('he-IL', { day: '2-digit', month: 'long', year: 'numeric' })}{deal.arrival_time ? ` · ${deal.arrival_time}` : ''}</span>
                  </div>
                </motion.div>
              )}
              {deal.airline && (
                <motion.div className="deal-modal__detail-row" variants={detailRow}>
                  <Plane size={15} opacity={0.5} />
                  <span>{deal.airline}</span>
                </motion.div>
              )}
              {deal.hotel_name && (
                <motion.div className="deal-modal__detail-row" variants={detailRow}>
                  <Hotel size={15} />
                  <div className="deal-modal__detail-block">
                    <span className="deal-modal__detail-label">מלון</span>
                    <span>
                      {deal.hotel_name}
                      {deal.hotel_stars ? ` ${stars(deal.hotel_stars)}` : ''}
                      {deal.hotel_breakfast ? ' · 🍳' : ''}
                      {deal.hotel_lunch ? ' · 🍽️' : ''}
                      {deal.hotel_dinner ? ' · 🌙' : ''}
                    </span>
                  </div>
                </motion.div>
              )}
              {deal.car_type && (
                <motion.div className="deal-modal__detail-row" variants={detailRow}>
                  <Car size={15} />
                  <span>{[deal.car_type, deal.car_company].filter(Boolean).join(' · ')}</span>
                </motion.div>
              )}
            </motion.div>

            {/* Baggage */}
            {(deal.includes_checked_baggage || deal.includes_cabin_baggage || deal.includes_meal) && (
              <div className="deal-modal__inclusions">
                {deal.includes_checked_baggage && <span>✓ מזוודה</span>}
                {deal.includes_cabin_baggage && <span>✓ טרולי</span>}
                {deal.includes_meal && <span>✓ ארוחות</span>}
              </div>
            )}

            {deal.description && <p className="deal-modal__desc">{deal.description}</p>}

            {/* Action buttons */}
            <div className="deal-modal__actions">
              {effectiveWa && (
                <motion.button
                  className="deal-modal__btn deal-modal__btn--wa"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAction(buildWhatsAppUrl(effectiveWa, deal.agent_whatsapp_template || deal.whatsapp_template, deal.destination_name || deal.destination, dates))}
                >
                  <MessageCircle size={18} /> WhatsApp
                </motion.button>
              )}
              {deal.purchase_link && (
                <motion.button
                  className="deal-modal__btn deal-modal__btn--book"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleAction(addUtmParams(deal.purchase_link, deal.id))}
                >
                  <ExternalLink size={18} /> {t.bookNowButton || 'הזמן עכשיו'}
                </motion.button>
              )}
              {deal.hotel_link && (
                <motion.button
                  className="deal-modal__btn deal-modal__btn--hotel"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => window.open(deal.hotel_link, '_blank', 'noopener,noreferrer')}
                >
                  <Hotel size={18} /> לצפייה במלון
                </motion.button>
              )}
              <motion.button
                className="deal-modal__btn deal-modal__btn--share"
                whileTap={{ scale: 0.97 }}
                onClick={handleShare}
              >
                <Share2 size={18} /> {copied ? '✓ הועתק!' : 'שתף'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
