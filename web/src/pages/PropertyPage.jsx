import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, MessageCircle, Phone, CheckCircle, ExternalLink, Users, Bath, ShieldAlert, Clock, Heart, Share2, CalendarClock, Info } from 'lucide-react';
import { propertyApi } from '../api/client.js';
import { useAgentAuth } from '../context/AgentAuthContext.jsx';
import { useFavorites } from '../hooks/useFavorites.js';
import { getCurrencySymbol } from '../utils/currency.js';
import { regionLabel, propertyTypeLabel, kosherLabel } from '../data/propertyOptions.js';
import { PropertyGallery } from '../components/property/PropertyGallery.jsx';
import { PropertyAmenitiesBar } from '../components/property/PropertyAmenitiesBar.jsx';
import { PropertyUnitsTable } from '../components/property/PropertyUnitsTable.jsx';
import { PublicAvailabilityCalendar } from '../components/property/PublicAvailabilityCalendar.jsx';
import { OwnerCard } from '../components/property/OwnerCard.jsx';
import { PropertyReviews } from '../components/property/PropertyReviews.jsx';
import { buildPropertyWhatsAppUrl, buildTelUrl } from '../utils/contactLinks.js';
import { trackPropertyEvent } from '../utils/eventTracking.js';
import { PropertyPageSkeleton } from '../components/property/PropertyPageSkeleton.jsx';
import { PropertyGrid } from '../components/PropertyGrid.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

/** BackLink — 7.8: "כפתור חזרה ששומר על מצב החיפוש והגלילה". Going back in browser history
 * (rather than a hard Link to "/") preserves the previous page's URL query params (7.2's filter
 * state lives there) and its scroll position automatically. Falls back to a plain link home when
 * there's no in-app history to go back to (e.g. the property page was opened directly/shared). */
function BackLink({ className, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasHistory = location.key !== 'default';
  if (hasHistory) {
    return <button type="button" className={className} onClick={() => navigate(-1)}>{children}</button>;
  }
  return <Link to="/" className={className}>{children}</Link>;
}

/** ClaimFlow — the "אני בעל הנכס" flow: request code (owner auth required) → enter code → pending. */
function ClaimFlow({ propertyId }) {
  const { t } = useLanguage();
  const { token } = useAgentAuth();
  const [step, setStep] = useState('idle'); // idle | requested | done
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <p className="agent-form__hint" style={{ marginTop: 8 }}>
        {t.claimLoginPrompt}{' '}
        <Link to={`/owner/login?next=/property/${propertyId}`}>{t.claimLoginLink}</Link>
        {' '}·{' '}
        <Link to={`/owner/register?next=/property/${propertyId}`}>{t.claimRegisterLink}</Link>
      </p>
    );
  }

  async function handleRequestCode() {
    setSubmitting(true);
    setError('');
    try {
      const { sentTo: masked } = await propertyApi.requestClaim(token, propertyId);
      setSentTo(masked);
      setStep('requested');
    } catch (err) {
      setError(err.message || t.claimErrorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify() {
    setSubmitting(true);
    setError('');
    try {
      await propertyApi.verifyClaim(token, propertyId, code);
      setStep('done');
    } catch (err) {
      setError(err.message || t.claimErrorCode);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'done') {
    return (
      <p className="deal-modal__desc">
        <CheckCircle size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
        {t.claimVerifiedSuccess}
        {' '}<Link to="/owner/dashboard">{t.claimDashboardLink}</Link>
      </p>
    );
  }

  if (step === 'requested') {
    return (
      <div className="agent-form__field" style={{ marginTop: 8 }}>
        <label className="agent-form__label">{t.claimCodeSentTo(sentTo)}</label>
        <input className="agent-form__input" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        {error && <p className="agent-form__error-msg">{error}</p>}
        <motion.button className="deal-modal__btn deal-modal__btn--book" style={{ marginTop: 8 }} whileTap={{ scale: 0.97 }} disabled={submitting || !code} onClick={handleVerify}>
          {submitting ? t.claimVerifying : t.claimVerifyButton}
        </motion.button>
      </div>
    );
  }

  return (
    <>
      {error && <p className="agent-form__error-msg">{error}</p>}
      <motion.button className="deal-modal__btn deal-modal__btn--share" whileTap={{ scale: 0.97 }} disabled={submitting} onClick={handleRequestCode}>
        {submitting ? t.claimSending : t.claimOwnerButton}
      </motion.button>
    </>
  );
}

export function PropertyPage() {
  const { t, dir, lang } = useLanguage();
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    propertyApi.get(id)
      .then(({ property: p }) => {
        setProperty(p);
        setSelectedUnitId(p.units?.[0]?.id ?? null);
        trackPropertyEvent(id, 'view');
        propertyApi.search({ region: p.region, limit: 5 })
          .then(({ properties: list }) => setSimilar((list || []).filter((x) => x.id !== p.id).slice(0, 4)))
          .catch(() => setSimilar([]));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleShare() {
    trackPropertyEvent(id, 'share');
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: property.name, url }); return; } catch { /* fall through to clipboard */ }
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  }

  if (loading) return <div dir={dir}><PropertyPageSkeleton /></div>;
  if (error || !property) {
    return (
      <div className="agent-social-profile agent-social-profile--error" dir={dir}>
        <p>{t.propertyNotFound}</p>
        <BackLink className="agent-social-profile__back-clean">← {t.backButton}</BackLink>
      </div>
    );
  }

  const isClaimed = property.status === 'claimed' || property.status === 'active';
  const isPendingClaim = property.status === 'pending';
  const units = property.units || [];
  const isMultiUnit = units.length > 1;
  const selectedUnit = units.find((u) => u.id === selectedUnitId) || units[0] || null;
  const capacity = property.total_guest_capacity ?? property.guest_capacity;
  const bedrooms = property.max_bedrooms ?? property.bedrooms;
  const priceFrom = property.price_from ?? property.base_price_night;

  const favKey = { id: property.id, deal_source: 'property', name: property.name, image: property.owner_images?.[0] };

  // 10.4: replaced the booking-request form — a guest reaches the owner directly instead of
  // submitting a form the owner has to check back for. Shows only the contact method(s) that
  // actually exist (no phone AND no whatsapp -> neither button renders, per spec).
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const waUrl = buildPropertyWhatsAppUrl({
    whatsapp: property.whatsapp, phone: property.phone, propertyName: property.name,
    unitName: isMultiUnit ? selectedUnit?.name : null, pageUrl, t,
  });
  const telUrl = buildTelUrl(property.phone);
  const hasContact = Boolean(waUrl || telUrl);

  return (
    <div className="pp" dir={dir}>
      <div className="pp__topbar container">
        <BackLink className="agent-social-profile__back-clean">
          <ArrowLeft size={14} /> {t.backButton}
        </BackLink>
      </div>

      <nav className="property-breadcrumbs container" aria-label={t.breadcrumbsLabel}>
        <Link to="/">{t.homeLink}</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <Link to={`/אזור/${encodeURIComponent(regionLabel(property.region, 'he'))}`}>{regionLabel(property.region, lang)}</Link>
        <ChevronLeft size={13} aria-hidden="true" />
        <span aria-current="page">{property.name}</span>
      </nav>

      <div className="container pp__layout">
        <div className="pp__main">
          {isClaimed ? (
            <PropertyGallery images={property.owner_images || []} alt={property.name} />
          ) : (
            <div className="deal-modal__media" style={{ borderRadius: 'var(--radius-lg)', height: 320 }}>
              <div className="deal-modal__media-placeholder" />
              <div className="deal-modal__media-gradient" />
              <div className="deal-modal__price-overlay">
                <span className="adc__exclusive-badge" style={{ position: 'static' }}>
                  <ShieldAlert size={12} /> {t.unclaimedNotice}
                </span>
              </div>
            </div>
          )}

          <div className="pp__header">
            <div>
              <h1 className="pp__title">{property.name}</h1>
              <p className="pp__subtitle">
                {propertyTypeLabel(property.property_type, lang)} · {regionLabel(property.region, lang)}{property.city ? ` · ${property.city}` : ''}
              </p>
              {isClaimed && property.owner_id && (
                <span className="pp__verified-badge">
                  <CheckCircle size={13} /> {t.verifiedByOwner}
                </span>
              )}
            </div>
            <div className="pp__header-actions">
              <button
                type="button"
                className={`pp__icon-btn${isFavorite(favKey) ? ' is-fav' : ''}`}
                onClick={() => { if (!isFavorite(favKey)) trackPropertyEvent(id, 'favorite'); toggleFavorite(favKey); }}
                aria-label={t.addToFavorites}
              >
                <Heart size={18} />
              </button>
              <button type="button" className="pp__icon-btn" onClick={handleShare} aria-label={t.shareButtonLabel}>
                <Share2 size={18} />
              </button>
              {shareCopied && <span className="pp__share-toast">{t.linkCopiedToast}</span>}
            </div>
          </div>

          <PropertyAmenitiesBar property={property} />

          <motion.div className="deal-modal__details" initial="hidden" animate="visible">
            {Boolean(capacity || bedrooms || property.bathrooms) && (
              <div className="deal-modal__detail-row">
                <Users size={15} />
                <span>
                  {[
                    capacity ? t.guestsUpTo(capacity) : null,
                    bedrooms ? t.bedroomsCount(bedrooms) : null,
                    property.bathrooms ? t.bathroomsCount(property.bathrooms) : null,
                  ].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
            {property.kosher_level !== 'not_applicable' && (
              <div className="deal-modal__detail-row">
                <Bath size={15} opacity={0.5} />
                <span>{kosherLabel(property.kosher_level, lang)}</span>
              </div>
            )}
            {priceFrom && (
              <div className="deal-modal__detail-row">
                <span className="deal-modal__detail-label">{isMultiUnit ? t.priceFromLabel : t.pricePerNightLabel}</span>
                <span>{Math.round(priceFrom)} {getCurrencySymbol(property.currency)}</span>
              </div>
            )}
          </motion.div>

          {property.description && <p className="deal-modal__desc">{property.description}</p>}

          {isMultiUnit && (
            <section className="pp__section">
              <h2 className="pp__section-title">{t.ppUnitsTitle}</h2>
              <PropertyUnitsTable
                units={units}
                currency={property.currency}
                selectedUnitId={selectedUnitId}
                onSelectUnit={setSelectedUnitId}
                propertyId={property.id}
                propertyName={property.name}
                propertyPhone={property.phone}
                propertyWhatsapp={property.whatsapp}
                pageUrl={pageUrl}
              />
            </section>
          )}

          {isClaimed && selectedUnit && (
            <section className="pp__section">
              <h2 className="pp__section-title"><CalendarClock size={17} /> {t.ppAvailabilityTitle}</h2>
              <PublicAvailabilityCalendar propertyId={property.id} unitId={isMultiUnit ? selectedUnit.id : undefined} />
            </section>
          )}

          {isClaimed && <OwnerCard owner={property.owner} />}

          <PropertyReviews propertyId={property.id} ownerId={property.owner_id} />

          <section className="pp__section pp__policies">
            <h2 className="pp__section-title"><Info size={17} /> {t.ppPoliciesTitle}</h2>
            <ul className="pp__policies-list">
              <li>{t.ppPolicyCheckInOut}</li>
              <li>{t.ppPolicyMinNights(selectedUnit?.min_nights || property.min_nights || 1)}</li>
              <li>{t.ppPolicyCancellation}</li>
            </ul>
          </section>

          {!isClaimed && (
            <section className="pp__section">
              <p className="deal-modal__desc" style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                {t.unclaimedDisclaimer}
                {property.source_url && (
                  <> {t.unclaimedOfficialPage} <a href={property.source_url} target="_blank" rel="noopener noreferrer">{property.source_url}</a></>
                )}
              </p>
              <div className="deal-modal__actions">
                {property.source_url && (
                  <a className="deal-modal__btn deal-modal__btn--hotel" href={property.source_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink size={16} /> {t.officialSiteLink}
                  </a>
                )}
              </div>
              {isPendingClaim ? (
                <p className="deal-modal__desc">
                  <Clock size={15} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                  {t.claimPendingNotice}
                </p>
              ) : null}
              <p className="agent-form__hint" style={{ marginTop: 4 }}>
                {t.notRelevantQuestion} <Link to="/remove">{t.removeRequestLink}</Link>
              </p>
              {!isPendingClaim && (
                <ClaimFlow propertyId={property.id} />
              )}
            </section>
          )}

          {similar.length > 0 && (
            <section className="pp__section pp__similar">
              <h2 className="pp__section-title">{t.ppSimilarTitle}</h2>
              <PropertyGrid properties={similar} isLoading={false} />
            </section>
          )}
        </div>

        <div className="pp__contact">
          <h2 className="pp__contact-title">{t.contactCardTitle}</h2>
          {priceFrom && (
            <div className="pp__contact-price">
              <strong>{Math.round(priceFrom)} {getCurrencySymbol(property.currency)}</strong>
              <span>{isMultiUnit ? t.priceFromLabel : t.perNightLabel}</span>
            </div>
          )}
          {hasContact ? (
            <div className="pp__contact-actions">
              {waUrl && (
                <a className="deal-modal__btn deal-modal__btn--wa" href={waUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackPropertyEvent(id, 'whatsapp_click')}>
                  <MessageCircle size={18} /> {t.contactWhatsAppButton}
                </a>
              )}
              {telUrl && (
                <a className="deal-modal__btn deal-modal__btn--book" href={telUrl} onClick={() => trackPropertyEvent(id, 'call_click')}>
                  <Phone size={18} /> {t.contactCallButton}
                </a>
              )}
            </div>
          ) : (
            <p className="agent-form__hint">{t.contactNoInfoAvailable}</p>
          )}
        </div>
      </div>

      {/* 10.4: mobile fixed bottom bar — price + the same two contact buttons directly, not a
          scroll-to-form trigger (the form is gone; these ARE the action now). */}
      {(priceFrom || hasContact) && (
        <div className="pp__mobile-bar">
          {priceFrom && (
            <div>
              <strong>{Math.round(priceFrom)} {getCurrencySymbol(property.currency)}</strong>
              <span>{t.perNightLabel}</span>
            </div>
          )}
          <div className="pp__mobile-bar-actions">
            {waUrl && (
              <a className="pp__mobile-bar-btn pp__mobile-bar-btn--wa" href={waUrl} target="_blank" rel="noopener noreferrer" aria-label={t.contactWhatsAppButton} onClick={() => trackPropertyEvent(id, 'whatsapp_click')}>
                <MessageCircle size={18} />
              </a>
            )}
            {telUrl && (
              <a className="pp__mobile-bar-btn pp__mobile-bar-btn--call" href={telUrl} aria-label={t.contactCallButton} onClick={() => trackPropertyEvent(id, 'call_click')}>
                <Phone size={18} />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
