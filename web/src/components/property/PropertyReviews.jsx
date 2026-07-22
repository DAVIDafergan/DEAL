import { useEffect, useState } from 'react';
import { Star, Flag, CheckCircle } from 'lucide-react';
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

  return (
    <section className="pp__section pp-reviews">
      <div className="pp-reviews__header">
        <h2 className="pp__section-title">
          {aggregate.avgRating != null && <StarDisplay value={aggregate.avgRating} size={17} />}
          {t.reviewsTitle} · {t.reviewsCount(aggregate.count)}
        </h2>
        {reviews.length > 1 && (
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">{t.reviewsSortNewest}</option>
            <option value="rating_desc">{t.reviewsSortRating}</option>
          </select>
        )}
      </div>

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
        <p className="agent-form__hint">{t.noReviewsYet}</p>
      ) : (
        <div className="pp-reviews__list">
          {reviews.map((r) => (
            <div key={r.id} className="pp-review-card">
              <div className="pp-review-card__head">
                <StarDisplay value={r.rating} />
                <span className="pp-review-card__author">{r.reviewer_name}</span>
                <span className="pp-review-card__date">{String(r.created_at).slice(0, 10)}</span>
              </div>
              {r.title && <div className="pp-review-card__title">{r.title}</div>}
              <p className="pp-review-card__body">{r.body}</p>
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
