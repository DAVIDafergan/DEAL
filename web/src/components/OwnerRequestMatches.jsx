import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Waves, Baby, UtensilsCrossed, Mountain, Utensils, Send, CheckCircle2 } from 'lucide-react';
import { requestApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { regionLabel } from '../data/propertyOptions.js';

const AMENITY_META = {
  has_private_jacuzzi: { icon: Sparkles, key: 'reqAmenityJacuzzi' },
  has_private_pool: { icon: Waves, key: 'reqAmenityPool' },
  has_heated_pool: { icon: Waves, key: 'reqAmenityHeatedPool' },
  is_kid_friendly: { icon: Baby, key: 'reqAmenityKids' },
  has_view: { icon: Mountain, key: 'reqAmenityView' },
  has_bbq: { icon: Utensils, key: 'reqAmenityBbq' },
};

function OfferForm({ match, token, onSent }) {
  const { t } = useLanguage();
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await requestApi.createOffer(token, match.id, { propertyId: match.matched_property_id, price: price || undefined, message: message || undefined });
      onSent(match.id);
    } catch (err) {
      setError(err.message || t.dashOfferError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="dash-offer-form" onSubmit={handleSubmit}>
      <div className="dash-offer-form__row">
        <input
          className="settings-field__input"
          type="number"
          min="0"
          placeholder={t.dashOfferPricePlaceholder}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
      <textarea
        className="settings-field__input settings-field__input--textarea"
        rows={2}
        placeholder={t.dashOfferMessagePlaceholder}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error && <p className="agent-form__error-msg">{error}</p>}
      <button type="submit" className="dash-quick-pill dash-quick-pill--ghost" disabled={submitting} style={{ alignSelf: 'flex-start' }}>
        <Send size={14} /> {submitting ? t.dashOfferSending : t.dashOfferSendButton}
      </button>
    </form>
  );
}

/** OwnerRequestMatches — 11.23 §4 owner side ("בקשות שמתאימות לי"): every open, non-expired
 * guest request this owner was actually matched to (server-side allowlist — see
 * guest_request_matches), with an inline offer form per card. A sent offer removes that card
 * from the feed (matches the server's own NOT EXISTS filter in listOpenMatchesForAgent). */
export function OwnerRequestMatches({ token }) {
  const { t, lang } = useLanguage();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offeredIds, setOfferedIds] = useState(new Set());
  const [openFormId, setOpenFormId] = useState(null);

  useEffect(() => {
    requestApi.getOwnerMatches(token).then(({ matches: m }) => setMatches(m || [])).catch(() => setMatches([])).finally(() => setLoading(false));
  }, [token]);

  function handleSent(matchId) {
    setOfferedIds((prev) => new Set(prev).add(matchId));
    setOpenFormId(null);
  }

  if (loading) return <p className="agent-form__hint">{t.loadingButton}</p>;
  if (matches.length === 0) return <p className="favorites-page__empty-sub">{t.dashMatchesEmpty}</p>;

  return (
    <div className="dash-matches">
      <AnimatePresence>
        {matches.filter((m) => !offeredIds.has(m.id)).map((m) => {
          const guestCount = (m.adults || 0) + (m.children || 0);
          const amenities = (typeof m.amenities === 'string' ? JSON.parse(m.amenities || '[]') : m.amenities || []);
          return (
            <motion.div key={m.id} className="dash-match-card" initial={{ opacity: 1 }} exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }} transition={{ duration: 0.3 }}>
              <div className="dash-match-card__head">
                <span className="dash-match-card__region">{regionLabel(m.region, lang)}{m.city ? ` · ${m.city}` : ''}</span>
                {guestCount > 0 && <span>{guestCount} {t.myRequestGuests}</span>}
              </div>
              <div className="dash-match-card__meta">
                {m.check_in && m.check_out
                  ? `${new Date(m.check_in).toLocaleDateString('he-IL')} – ${new Date(m.check_out).toLocaleDateString('he-IL')}`
                  : t.dashMatchDatesFlexible}
                {m.budget_max ? ` · ${t.requestBudgetUpTo(m.budget_max)}` : ''}
              </div>
              {amenities.length > 0 && (
                <div className="dash-match-card__chips">
                  {amenities.map((a) => {
                    const meta = AMENITY_META[a];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return <span key={a} className="req-chip is-active" style={{ cursor: 'default' }}><Icon size={13} /> {t[meta.key]}</span>;
                  })}
                  {m.kosher_level === 'kosher' && <span className="req-chip is-active" style={{ cursor: 'default' }}><UtensilsCrossed size={13} /> {t.reqAmenityKosher}</span>}
                </div>
              )}
              {m.notes && <p className="dash-match-card__notes">"{m.notes}"</p>}

              {openFormId === m.id ? (
                <OfferForm match={m} token={token} onSent={handleSent} />
              ) : (
                <button type="button" className="dash-quick-pill dash-quick-pill--ghost" onClick={() => setOpenFormId(m.id)}>
                  <Send size={14} /> {t.dashSendOfferButton}
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      {offeredIds.size > 0 && matches.filter((m) => !offeredIds.has(m.id)).length === 0 && (
        <p className="favorites-page__empty-sub"><CheckCircle2 size={14} style={{ verticalAlign: 'middle' }} /> {t.dashMatchesEmpty}</p>
      )}
    </div>
  );
}
