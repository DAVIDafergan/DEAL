import { useEffect, useMemo, useState } from 'react';
import { Star, Flag, CheckCircle, MessageSquareText, BadgeCheck } from 'lucide-react';
import { Link } from '../LocalizedLink.jsx';
import { propertyApi, reviewApi } from '../../api/client.js';
import { useTravelerAuth } from '../../context/TravelerAuthContext.jsx';
import { useAgentAuth } from '../../context/AgentAuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

function StarInput({ value, onChange, size = 22 }) {
  return (
    <div className="star-input" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="star-input__btn"
          role="radio"
          aria-checked={value === n}
          aria-label={String(n)}
          onClick={() => onChange(n)}
        >
          <Star size={size} fill={n <= value ? 'currentColor' : 'none'} className={n <= value ? 'star-input__star--filled' : 'star-input__star'} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value, size = 13 }) {
  return (
    <span className="star-display">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} fill={n <= Math.round(value) ? 'currentColor' : 'none'} className={n <= Math.round(value) ? 'star-display__star--filled' : 'star-display__star'} />
      ))}
    </span>
  );
}

const emptyForm = { rating: 0, cleanlinessRating: 0, accuracyRating: 0, hostRating: 0, valueRating: 0, title: '', body: '', stayDate: '' };

/** ReviewSummary — 11.6: big average + a per-star distribution bar so a visitor can see the
 * shape of the ratings at a glance, not just one number. Each bar doubles as a filter chip. */
function ReviewSummary({ aggregate, reviews, ratingFilter, onSelectRating, t }) {
  const counts = useMemo(() => {
    const c = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      const n = Math.round(r.rating);
      if (c[n] != null) c[n]++;
    }
    return c;
  }, [reviews]);
  const max = Math.max(1, ...Object.values(counts));

  if (aggregate.count === 0) return null;

  return (
    <div className="pp-reviews__summary">
      <div className="pp-reviews__summary-score">
        <span className="pp-reviews__summary-avg">{aggregate.avgRating?.toFixed(1)}</span>
        <StarDisplay value={aggregate.avgRating} size={15} />
        <span className="pp-reviews__summary-count">{t.reviewsCount(aggregate.count)}</span>
      </div>
      <div className="pp-reviews__summary-bars">
        {[5, 4, 3, 2, 1].map((n) => (
          <button
            type="button"
            key={n}
            className={`pp-reviews__dist-row${ratingFilter === n ? ' pp-reviews__dist-row--active' : ''}`}
            onClick={() => onSelectRating(ratingFilter === n ? null : n)}
          >
            <span className="pp-reviews__dist-label">{n} <Star size={11} fill="currentColor" /></span>
            <span className="pp-reviews__dist-track"><span className="pp-reviews__dist-fill" style={{ width: `${(counts[n] / max) * 100}%` }} /></span>
            <span className="pp-reviews__dist-count">{counts[n]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** SubRatingBars — the cleanliness/accuracy/host/value sub-ratings collected by the review form
 * were only ever shown on the form; this renders them as small horizontal bars on the card. */
function SubRatingBars({ review, t }) {
  const dims = [
    ['cleanliness_rating', t.reviewCleanlinessLabel],
    ['accuracy_rating', t.reviewAccuracyLabel],
    ['host_rating', t.reviewHostLabel],
    ['value_rating', t.reviewValueLabel],
  ].filter(([key]) => review[key]);
  if (dims.length === 0) return null;
  return (
    <div className="pp-review-card__subratings">
      {dims.map(([key, label]) => (
        <div key={key} className="pp-review-card__subrating">
          <span className="pp-review-card__subrating-label">{label}</span>
          <span className="pp-review-card__subrating-track">
            <span className="pp-review-card__subrating-fill" style={{ width: `${(review[key] / 5) * 100}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

/** PropertyReviews — 10.6. Public list + aggregate (shown to everyone, logged in or not);
 * write/edit form gated behind traveler login; owner reply shown inline and composable by the
 * property's own owner (checked via useAgentAuth, not a prop — this component doesn't trust
 * the caller to know who's viewing). */
export function PropertyReviews({ propertyId, ownerId }) {
  const { t, lang, dir } = useLanguage();
  const { travelerToken, traveler } = useTravelerAuth();
  const { token: agentToken, agent } = useAgentAuth();
  const [reviews, setReviews] = useState([]);
  const [aggregate, setAggregate] = useState({ count: 0, avgRating: null });
  const [sort, setSort] = useState('newest');
  const [ratingFilter, setRatingFilter] = useState(null);
  const [myReview, setMyReview] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [reportedIds, setReportedIds] = useState([]);

  const isOwnerViewing = Boolean(agentToken && agent && ownerId && agent.id === ownerId);

  function load() {
    propertyApi.getReviews(propertyId, sort).then(({ reviews: r, aggregate: a }) => { setReviews(r); setAggregate(a); }).catch(() => {});
  }

  useEffect(load, [propertyId, sort]);

  useEffect(() => {
    if (!travelerToken) { setMyReview(null); return; }
    propertyApi.getMyReview(travelerToken, propertyId).then(({ review }) => {
      setMyReview(review);
      if (review) setForm({
        rating: review.rating, cleanlinessRating: review.cleanliness_rating || 0, accuracyRating: review.accuracy_rating || 0,
        hostRating: review.host_rating || 0, valueRating: review.value_rating || 0, title: review.title || '', body: review.body, stayDate: review.stay_date || '',
      });
    }).catch(() => {});
  }, [travelerToken, propertyId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!form.rating) { setFormError(t.reviewOverallLabel); return; }
    if (!form.body.trim()) return;
    setSubmitting(true);
    try {
      if (myReview) await reviewApi.update(travelerToken, myReview.id, form);
      else await propertyApi.createReview(travelerToken, propertyId, form);
      setShowForm(false);
      load();
      propertyApi.getMyReview(travelerToken, propertyId).then(({ review }) => setMyReview(review));
    } catch (err) {
      setFormError(err.message || 'Error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply(reviewId) {
    if (!replyText.trim()) return;
    await reviewApi.reply(agentToken, reviewId, replyText.trim());
    setReplyingTo(null);
    setReplyText('');
    load();
  }

  async function handleReport(reviewId) {
    await reviewApi.report(reviewId, 'inappropriate', null);
    setReportedIds((prev) => [...prev, reviewId]);
  }

  const visibleReviews = ratingFilter ? reviews.filter((r) => Math.round(r.rating) === ratingFilter) : reviews;

  return (
    <section className="pp__section pp-reviews">
      <div className="pp-reviews__header">
        <h2 className="pp__section-title">{t.reviewsTitle}</h2>
        {reviews.length > 1 && (
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">{t.reviewsSortNewest}</option>
            <option value="rating_desc">{t.reviewsSortRating}</option>
          </select>
        )}
      </div>

      <ReviewSummary aggregate={aggregate} reviews={reviews} ratingFilter={ratingFilter} onSelectRating={setRatingFilter} t={t} />

      {travelerToken ? (
        !showForm && (
          <button type="button" className="pes__btn pes__btn--primary" onClick={() => setShowForm(true)}>
            {myReview ? t.editReviewButton : t.writeReviewButton}
          </button>
        )
      ) : (
        <p className="agent-form__hint">
          {t.reviewLoginPrompt} — <Link to={`/register/traveler/login?next=/property/${propertyId}`}>{t.reviewLoginLink}</Link>
        </p>
      )}

      {showForm && (
        <form className="settings-card review-form" onSubmit={handleSubmit}>
          <div className="agent-form__field">
            <label className="agent-form__label">{t.reviewOverallLabel}</label>
            <StarInput value={form.rating} onChange={(v) => setForm((f) => ({ ...f, rating: v }))} />
          </div>
          <div className="review-form__subratings">
            {[
              ['cleanlinessRating', t.reviewCleanlinessLabel],
              ['accuracyRating', t.reviewAccuracyLabel],
              ['hostRating', t.reviewHostLabel],
              ['valueRating', t.reviewValueLabel],
            ].map(([key, label]) => (
              <div className="agent-form__field" key={key}>
                <label className="agent-form__label">{label}</label>
                <StarInput size={16} value={form[key]} onChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
              </div>
            ))}
          </div>
          <div className="agent-form__field">
            <input className="agent-form__input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder={t.reviewTitlePlaceholder} />
          </div>
          <div className="agent-form__field">
            <textarea className="agent-form__input" rows={4} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder={t.reviewBodyPlaceholder} required />
          </div>
          <div className="agent-form__field">
            <label className="agent-form__label">{t.reviewStayDateLabel}</label>
            <input className="agent-form__input" type="date" value={form.stayDate || ''} onChange={(e) => setForm((f) => ({ ...f, stayDate: e.target.value }))} />
          </div>
          {formError && <p className="agent-form__error-msg">{formError}</p>}
          <p className="agent-form__hint">{t.reviewEditableNote}</p>
          <div className="agent-form__actions">
            <button type="button" className="agent-form__btn agent-form__btn--ghost" onClick={() => setShowForm(false)}>{t.cancelButton}</button>
            <button type="submit" className="agent-form__btn agent-form__btn--primary" disabled={submitting}>
              {myReview ? t.updateReviewButton : t.submitReviewButton}
            </button>
          </div>
        </form>
      )}

      {reviews.length === 0 ? (
        <div className="pp-reviews__empty">
          <MessageSquareText size={30} strokeWidth={1.3} />
          <p>{t.noReviewsYet}</p>
        </div>
      ) : visibleReviews.length === 0 ? (
        <p className="agent-form__hint">{t.reviewsNoMatchFilter}</p>
      ) : (
        <div className="pp-reviews__list">
          {visibleReviews.map((r) => (
            <div key={r.id} className="pp-review-card">
              <div className="pp-review-card__head">
                <span className="pp-review-card__avatar" aria-hidden="true">{(r.reviewer_name || '?').trim()[0]}</span>
                <div className="pp-review-card__head-text">
                  <span className="pp-review-card__author">
                    {r.reviewer_name}
                    {r.stay_date && (
                      <span className="pp-review-card__stayed-tag"><BadgeCheck size={11} /> {t.reviewStayedHereTag}</span>
                    )}
                  </span>
                  <span className="pp-review-card__meta">
                    <StarDisplay value={r.rating} size={12} />
                    <span className="pp-review-card__date">{String(r.created_at).slice(0, 10)}</span>
                  </span>
                </div>
              </div>
              {r.title && <div className="pp-review-card__title">{r.title}</div>}
              <p className="pp-review-card__body">{r.body}</p>
              <SubRatingBars review={r} t={t} />
              {r.owner_reply && (
                <div className="pp-review-card__reply">
                  <strong><CheckCircle size={13} /> {t.ownerReplyLabel}</strong>
                  <p>{r.owner_reply}</p>
                </div>
              )}
              <div className="pp-review-card__actions">
                {isOwnerViewing && !r.owner_reply && replyingTo !== r.id && (
                  <button type="button" className="pp-review-card__action-btn" onClick={() => setReplyingTo(r.id)}>{t.replyButton}</button>
                )}
                {!reportedIds.includes(r.id) && (
                  <button type="button" className="pp-review-card__action-btn" onClick={() => handleReport(r.id)}>
                    <Flag size={12} /> {t.reportReviewButton}
                  </button>
                )}
                {reportedIds.includes(r.id) && <span className="agent-form__hint">{t.reportSubmitted}</span>}
              </div>
              {replyingTo === r.id && (
                <div className="pp-review-card__reply-form">
                  <textarea className="agent-form__input" rows={2} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={t.replyPlaceholder} />
                  <button type="button" className="agent-form__btn agent-form__btn--primary" onClick={() => handleReply(r.id)}>{t.submitReplyButton}</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
