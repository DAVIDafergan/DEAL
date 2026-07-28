import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from '../components/LocalizedLink.jsx';
import { ThumbsUp, ThumbsDown, MessageCircle, ListChecks } from 'lucide-react';
import { motion } from 'framer-motion';
import { wishlistApi } from '../api/client.js';
import { getSessionId } from '../utils/session.js';
import { PropertyCard } from '../components/PropertyCard.jsx';
import { RouteLoading } from '../components/RouteLoading.jsx';
import { BackButton } from '../components/BackButton.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

function WishlistItem({ item, token, voterKey, onVoted, onCommented }) {
  const { t } = useLanguage();
  const [commentText, setCommentText] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  async function castVote(vote) {
    const tally = await wishlistApi.vote(token, item.itemId, voterKey, vote);
    onVoted(item.itemId, tally);
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const comment = await wishlistApi.comment(token, item.itemId, voterKey, authorName, commentText.trim());
      onCommented(item.itemId, comment);
      setCommentText('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wishlist-item">
      <PropertyCard property={item.property} />
      <div className="wishlist-item__votes">
        <button type="button" className="wishlist-item__vote-btn" onClick={() => castVote('up')} aria-label={t.wishlistUpvote}>
          <ThumbsUp size={16} /> {item.upvotes}
        </button>
        <button type="button" className="wishlist-item__vote-btn wishlist-item__vote-btn--down" onClick={() => castVote('down')} aria-label={t.wishlistDownvote}>
          <ThumbsDown size={16} /> {item.downvotes}
        </button>
        <button type="button" className="wishlist-item__comments-toggle" onClick={() => setShowComments((s) => !s)}>
          <MessageCircle size={15} /> {item.comments.length > 0 ? t.wishlistCommentsCount(item.comments.length) : t.wishlistAddComment}
        </button>
      </div>

      {showComments && (
        <div className="wishlist-item__comments">
          {item.comments.map((c) => (
            <div key={c.id} className="wishlist-item__comment">
              <strong>{c.authorName || t.wishlistAnonymous}</strong>
              <span>{c.body}</span>
            </div>
          ))}
          <form className="wishlist-item__comment-form" onSubmit={submitComment}>
            <input
              type="text"
              className="agent-form__input"
              placeholder={t.wishlistYourNameOptional}
              value={authorName}
              maxLength={80}
              onChange={(e) => setAuthorName(e.target.value)}
            />
            <input
              type="text"
              className="agent-form__input"
              placeholder={t.wishlistCommentPlaceholder}
              value={commentText}
              maxLength={500}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <button type="submit" className="wishlist-item__comment-submit" disabled={submitting || !commentText.trim()}>
              {t.wishlistSend}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** WishlistPage — 11.13: shared, signup-free property collection at /list/:token. Anyone with
 * the link can vote/comment; the creator built it from FavoritesPage without ever registering. */
export function WishlistPage() {
  const { t, dir } = useLanguage();
  const { token } = useParams();
  const [wishlist, setWishlist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const voterKey = getSessionId();

  useEffect(() => {
    wishlistApi.get(token)
      .then(setWishlist)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  function handleVoted(itemId, tally) {
    setWishlist((w) => ({
      ...w,
      items: w.items.map((i) => (i.itemId === itemId ? { ...i, upvotes: tally.up, downvotes: tally.down } : i)),
    }));
  }

  function handleCommented(itemId, comment) {
    setWishlist((w) => ({
      ...w,
      items: w.items.map((i) => (i.itemId === itemId ? { ...i, comments: [...i.comments, comment] } : i)),
    }));
  }

  if (loading) return <div className="container" dir={dir}><RouteLoading /></div>;

  if (notFound || !wishlist) {
    return (
      <div className="container" dir={dir} style={{ padding: '60px 20px', textAlign: 'center' }}>
        <ListChecks size={32} style={{ opacity: 0.4, marginBottom: 12 }} />
        <p>{t.wishlistNotFound}</p>
        <Link to="/">{t.homeLink}</Link>
      </div>
    );
  }

  return (
    <div className="wishlist-page" dir={dir}>
      <BackButton />

      <div className="wishlist-page__header container">
        <h1 className="wishlist-page__title"><ListChecks size={20} /> {wishlist.name}</h1>
        <p className="wishlist-page__subtitle">{t.wishlistSharedSubtitle}</p>
      </div>

      <div className="container">
        {wishlist.items.length === 0 ? (
          <div className="favorites-page__empty">
            <div className="favorites-page__empty-icon">🏡</div>
            <p className="favorites-page__empty-text">{t.wishlistEmpty}</p>
          </div>
        ) : (
          <motion.div className="wishlist-page__grid" initial="hidden" animate="visible">
            {wishlist.items.map((item) => (
              <WishlistItem key={item.itemId} item={item} token={token} voterKey={voterKey} onVoted={handleVoted} onCommented={handleCommented} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
