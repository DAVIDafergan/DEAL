import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Share2, MessageCircle, ExternalLink, CheckCircle, ArrowLeft, Heart } from 'lucide-react';
import { agentApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getCurrencySymbol } from '../utils/currency.js';
import { DealDetailModal } from '../components/DealDetailModal.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { StarRating } from '../components/StarRating.jsx';

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
    const url = `https://dealim.org/agent/${slug}`;
    if (navigator.share) {
      await navigator.share({ title: data?.agent?.business_name, url });
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

  if (error) return (
    <div className="agent-social-profile agent-social-profile--error" dir="rtl">
      <p>{t.agentNotFoundMessage || 'סוכן לא נמצא'}</p>
      <Link to="/">{t.backToFeedButton || '← חזרה'}</Link>
    </div>
  );

  const { agent, deals } = data;
  const waNumber = agent.whatsapp_number;

  return (
    <div className="agent-social-profile" dir="rtl">
      {selectedDeal && (
        <DealDetailModal
          deal={{ ...selectedDeal, agent_whatsapp: waNumber, agent_whatsapp_template: agent.whatsapp_template }}
          onClose={() => setSelectedDeal(null)}
        />
      )}

      {/* Back link */}
      <div className="agent-social-profile__topbar container">
        <Link to="/" className="agent-social-profile__back-clean">
          <ArrowLeft size={14} /> {t.backToFeedButton || 'חזרה'}
        </Link>
      </div>

      {/* Profile header — clean, no cover */}
      <div className="agent-social-profile__header container agent-social-profile__header--clean">
        <div className="agent-social-profile__avatar-wrap">
          {agent.logo_url
            ? <img src={agent.logo_url} alt={agent.business_name} className="agent-social-profile__avatar" />
            : <div className="agent-social-profile__avatar-placeholder">{agent.business_name[0]}</div>}
        </div>

        <div className="agent-social-profile__meta">
          <div className="agent-social-profile__name-row">
            <h1 className="agent-social-profile__name">{agent.business_name}</h1>
            <span className="agent-social-profile__verified">
              <CheckCircle size={16} />
              {t.verifiedAgentBadge || 'מאומת'}
            </span>
          </div>

          {/* Stats row */}
          <div className="agent-social-profile__stats">
            <div className="agent-social-profile__stat">
              <strong>{deals.length}</strong>
              <span>דילים</span>
            </div>
            {agent.response_hours && (
              <div className="agent-social-profile__stat">
                <span className="agent-social-profile__stat-detail">🕐 {agent.response_hours}</span>
              </div>
            )}
          </div>

          {/* Agent star rating */}
          <StarRating agentId={agent.id} size="md" />

          {/* Bio/About */}
          {agent.description && (
            <p className="agent-social-profile__bio">{agent.description}</p>
          )}

          {/* CTA buttons — WhatsApp + Share */}
          <div className="agent-social-profile__cta">
            {waNumber && (
              <a
                className="agent-social-profile__wa-btn"
                href={buildWhatsAppUrl(waNumber, agent.whatsapp_template, null, null)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={17} />
                {t.contactWhatsAppButton || 'WhatsApp'}
              </a>
            )}
            <motion.button
              className="agent-social-profile__share-btn"
              whileTap={{ scale: 0.97 }}
              onClick={shareProfile}
            >
              <Share2 size={15} />
              {shareCopied ? (t.copiedToClipboard || 'הועתק!') : (t.shareButton || 'שיתוף')}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="agent-social-profile__divider container" />

      {/* Deals feed */}
      <section className="agent-social-profile__deals container">
        <h2 className="agent-social-profile__deals-title">
          {t.agentDealsTitle || 'דילים פעילים'}
          <span className="agent-social-profile__deals-count"> ({deals.length})</span>
        </h2>

        {deals.length === 0 && (
          <p className="agent-social-profile__empty">{t.noDealsYet || 'אין דילים פעילים כרגע'}</p>
        )}

        <div className="agent-social-profile__deals-grid">
          {deals.map((deal, i) => {
            const effectiveWa = deal.whatsapp_override || waNumber;
            const dep = deal.departure_date ? new Date(deal.departure_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
            const ret = deal.return_date ? new Date(deal.return_date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }) : null;
            const dates = dep && ret ? `${dep} – ${ret}` : dep || '';
            const fav = isFavorite(deal);

            return (
              <motion.div
                key={deal.id}
                className="agent-social-deal-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedDeal(deal)}
              >
                <div className="agent-social-deal-card__media">
                  {deal.photo_url
                    ? <img src={deal.photo_url} alt={deal.destination_name} className="agent-social-deal-card__img" />
                    : <div className="agent-social-deal-card__img-placeholder" />}
                  <div className="agent-social-deal-card__overlay" />

                  {/* Value badge */}
                  {deal.value_score > 0 && (
                    <span className="agent-social-deal-card__badge">-{Math.round(deal.value_score)}%</span>
                  )}
                  {deal.is_exclusive && (
                    <span className="agent-social-deal-card__exclusive">{t.exclusiveDealBadge || '🔥 בלעדי'}</span>
                  )}

                  {/* Favorite */}
                  <motion.button
                    className={`agent-social-deal-card__fav${fav ? ' is-fav' : ''}`}
                    whileTap={{ scale: 0.85 }}
                    onClick={e => { e.stopPropagation(); toggleFavorite(deal); }}
                    aria-label={fav ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                  >
                    <Heart size={14} fill={fav ? 'currentColor' : 'none'} />
                  </motion.button>

                  {/* Price overlay */}
                  <div className="agent-social-deal-card__price-overlay">
                    {deal.price} {getCurrencySymbol(deal.currency)}
                  </div>
                </div>

                <div className="agent-social-deal-card__body">
                  <h3 className="agent-social-deal-card__dest">{deal.destination_name || deal.destination}</h3>
                  {dates && <p className="agent-social-deal-card__dates">{dates}</p>}
                  {deal.airline && <p className="agent-social-deal-card__meta">✈ {deal.airline}</p>}
                  {deal.hotel_name && <p className="agent-social-deal-card__meta">🏨 {deal.hotel_name}</p>}

                  <div className="agent-social-deal-card__actions" onClick={e => e.stopPropagation()}>
                    {deal.purchase_link && (
                      <a
                        className="agent-social-deal-card__btn agent-social-deal-card__btn--book"
                        href={addUtmParams(deal.purchase_link, deal.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => agentApi.trackClick(deal.id).catch(() => {})}
                      >
                        <ExternalLink size={13} /> {t.bookNowButton || 'הזמן'}
                      </a>
                    )}
                    {effectiveWa && (
                      <a
                        className="agent-social-deal-card__btn agent-social-deal-card__btn--wa"
                        href={buildWhatsAppUrl(effectiveWa, agent.whatsapp_template, deal.destination_name || deal.destination, dates)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => agentApi.trackClick(deal.id).catch(() => {})}
                        aria-label="WhatsApp"
                      >
                        <MessageCircle size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
