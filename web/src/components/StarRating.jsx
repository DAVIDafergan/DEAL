import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { agentApi } from '../api/client.js';
import { getSessionId } from '../utils/session.js';

export function StarRating({ agentId, initialAvg, initialCount, allowRate = true, size = 'md' }) {
  const [hover, setHover] = useState(0);
  const [myRating, setMyRating] = useState(null);
  const [avg, setAvg] = useState(initialAvg ?? null);
  const [count, setCount] = useState(initialCount ?? 0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!agentId || !allowRate) return;
    const sid = getSessionId();
    agentApi.getMyRating(agentId, sid)
      .then(({ rating }) => setMyRating(rating))
      .catch(() => {});
  }, [agentId, allowRate]);

  async function rate(stars) {
    if (!allowRate || saving) return;
    const sid = getSessionId();
    setSaving(true);
    try {
      const result = await agentApi.rateAgent(agentId, sid, stars);
      setMyRating(stars);
      if (result.avg) setAvg(result.avg);
      if (result.count != null) setCount(result.count);
    } catch {}
    setSaving(false);
  }

  const displayStars = hover || myRating || 0;
  const sz = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;

  return (
    <div className={`star-rating star-rating--${size}`} dir="rtl">
      {(avg || count > 0) && (
        <span className="star-rating__summary">
          {avg ? `${avg}★` : ''}{count > 0 ? ` (${count})` : ''}
        </span>
      )}
      {allowRate && (
        <div className="star-rating__stars" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map(star => (
            <motion.button
              key={star}
              type="button"
              className={`star-rating__star${displayStars >= star ? ' is-active' : ''}${myRating === star ? ' is-mine' : ''}`}
              style={{ fontSize: sz }}
              onMouseEnter={() => setHover(star)}
              onClick={() => rate(star)}
              whileTap={{ scale: 0.85 }}
              disabled={saving}
              aria-label={`${star} כוכבים`}
            >
              ★
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
