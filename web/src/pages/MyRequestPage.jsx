import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, MessageSquareText, Phone } from 'lucide-react';
import { Link } from '../components/LocalizedLink.jsx';
import { BackButton } from '../components/BackButton.jsx';
import { requestApi } from '../api/client.js';
import { useTravelerAuth } from '../context/TravelerAuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { regionLabel } from '../data/propertyOptions.js';
import { optimizedImageUrl } from '../utils/imageUrl.js';

/** MyRequestPage — 11.23 §4: a logged-in traveler's view of one posted request and the offers
 * that came back for it. Anonymous requests have no login-free management page (out of scope —
 * see DECISIONS.md 11.23); this route is only reachable once logged in, same gate as /account. */
export function MyRequestPage() {
  const { id } = useParams();
  const { traveler, travelerToken, loading } = useTravelerAuth();
  const { t, dir, lang } = useLanguage();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [offers, setOffers] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!travelerToken) { navigate(`/register/traveler/login?next=/my/requests/${id}`, { replace: true }); return; }
    Promise.all([requestApi.getOne(travelerToken, id), requestApi.getOffers(travelerToken, id)])
      .then(([reqRes, offersRes]) => { setRequest(reqRes.request); setOffers(offersRes.offers || []); })
      .catch(() => setRequest(null))
      .finally(() => setFetching(false));
  }, [id, travelerToken, loading, navigate]);

  async function handleClose() {
    setClosing(true);
    try {
      await requestApi.close(travelerToken, id);
      setRequest((r) => ({ ...r, status: 'closed' }));
    } finally {
      setClosing(false);
    }
  }

  if (loading || fetching) return <div className="settings-page settings-page--loading" dir={dir}>{t.friendlyLoadingProperties}</div>;
  if (!request) return (
    <div className="legal-page" dir={dir}>
      <BackButton fallbackTo="/account" />
      <div className="legal-page__inner container"><p>{t.myRequestNotFound}</p></div>
    </div>
  );

  const guestCount = (request.adults || 0) + (request.children || 0);

  return (
    <div className="account-page container" dir={dir}>
      <BackButton fallbackTo="/account" />

      <div className="myreq-summary">
        <h1 className="account-page__title" style={{ marginBottom: 4 }}>{t.myRequestTitle}</h1>
        <p className="myreq-summary__line">
          {regionLabel(request.region, lang)}{request.city ? ` · ${request.city}` : ''}
          {guestCount ? ` · ${guestCount} ${t.myRequestGuests}` : ''}
        </p>
        <div className="myreq-summary__meta">
          <span className={`myreq-status myreq-status--${request.status}`}>
            {request.status === 'open' ? t.myRequestStatusOpen : t.myRequestStatusClosed}
          </span>
          <span>{t.myRequestOfferCount(offers.length)}</span>
        </div>
        {request.status === 'open' && (
          <button type="button" className="dash-quick-pill dash-quick-pill--ghost" onClick={handleClose} disabled={closing}>
            {closing ? t.myRequestClosing : t.myRequestCloseButton}
          </button>
        )}
      </div>

      <h2 className="account-page__section-title">{t.myRequestOffersTitle}</h2>

      {offers.length === 0 ? (
        <p className="favorites-page__empty-sub">{t.myRequestNoOffersYet}</p>
      ) : (
        <div className="myreq-offers">
          {offers.map((offer, i) => (
            <motion.div key={offer.id} className="myreq-offer" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.3 }}>
              <div className="myreq-offer__owner">
                {offer.logo_url
                  ? <img src={optimizedImageUrl(offer.logo_url, { width: 80 })} alt="" className="myreq-offer__logo" />
                  : <div className="myreq-offer__logo myreq-offer__logo--placeholder"><Home size={18} /></div>}
                <div>
                  <strong>{offer.business_name}</strong>
                  <Link to={`/property/${offer.property_id}`} className="myreq-offer__property-link">{offer.property_name}</Link>
                </div>
                {offer.price != null && <span className="myreq-offer__price">{Math.round(offer.price)} ₪</span>}
              </div>
              {offer.message && (
                <p className="myreq-offer__message"><MessageSquareText size={14} /> {offer.message}</p>
              )}
              <div className="myreq-offer__actions">
                <Link to={`/property/${offer.property_id}`} className="req-nav__btn req-nav__btn--primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  {t.myRequestViewPropertyButton}
                </Link>
                {offer.phone && (
                  <a href={`tel:${offer.phone.replace(/[^0-9+]/g, '')}`} className="req-nav__btn req-nav__btn--ghost" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <Phone size={14} /> {t.myRequestCallButton}
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
