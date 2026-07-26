import { useState } from 'react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { wishlistApi } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const MY_LISTS_KEY = 'deal_radar_my_wishlists';

export function saveMyWishlist(entry) {
  try {
    const list = JSON.parse(localStorage.getItem(MY_LISTS_KEY) || '[]');
    list.unshift(entry);
    localStorage.setItem(MY_LISTS_KEY, JSON.stringify(list.slice(0, 20)));
  } catch { /* localStorage unavailable — the link still works, just isn't remembered locally */ }
}

export function getMyWishlists() {
  try { return JSON.parse(localStorage.getItem(MY_LISTS_KEY) || '[]'); }
  catch { return []; }
}

/** CreateWishlistModal — 11.13: names the current favorites into a shareable /list/:token link,
 * no signup on either side (the creator or anyone they send it to). */
export function CreateWishlistModal({ propertyIds, onClose }) {
  const { t, dir } = useLanguage();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [shareUrl, setShareUrl] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const wishlist = await wishlistApi.create(name.trim(), propertyIds);
      const url = `${window.location.origin}/list/${wishlist.token}`;
      saveMyWishlist({ token: wishlist.token, name: wishlist.name, createdAt: Date.now() });
      setShareUrl(url);
    } catch (err) {
      setError(err.message || t.wishlistCreateError);
    } finally {
      setCreating(false);
    }
  }

  function copyLink() {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="wishlist-modal-overlay" dir={dir} onClick={onClose}>
      <motion.div
        className="wishlist-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="wishlist-modal__close" onClick={onClose} aria-label={t.closeButton}>
          <X size={18} />
        </button>

        {!shareUrl ? (
          <form onSubmit={handleCreate}>
            <h2 className="wishlist-modal__title"><Share2 size={18} /> {t.wishlistCreateTitle}</h2>
            <p className="wishlist-modal__sub">{t.wishlistCreateSub(propertyIds.length)}</p>
            <input
              type="text"
              className="agent-form__input"
              placeholder={t.wishlistNamePlaceholder}
              value={name}
              maxLength={120}
              autoFocus
              onChange={(e) => setName(e.target.value)}
            />
            {error && <p className="agent-form__error">{error}</p>}
            <button type="submit" className="wishlist-modal__submit" disabled={creating || !name.trim()}>
              {creating ? t.wishlistCreating : t.wishlistCreateButton}
            </button>
          </form>
        ) : (
          <div>
            <h2 className="wishlist-modal__title">{t.wishlistReadyTitle}</h2>
            <p className="wishlist-modal__sub">{t.wishlistReadySub}</p>
            <div className="wishlist-modal__link-row">
              <input type="text" className="agent-form__input" readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
              <button type="button" className="wishlist-modal__copy-btn" onClick={copyLink}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
