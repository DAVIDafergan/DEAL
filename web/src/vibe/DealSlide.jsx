import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { GlitchDropOverlay } from './GlitchDropOverlay.jsx';

/** גוון יציב לפי יעד, כדי שה-gradient fallback (בלי וידאו) יהיה שונה ועקבי לכל יעד */
function hueFromDestination(destination) {
  let hash = 0;
  for (let i = 0; i < destination.length; i += 1) {
    hash = (hash * 31 + destination.charCodeAt(i)) % 360;
  }
  return hash;
}

/**
 * DealSlide — שקף אחד במסך מלא בפיד הווייב. רקע: וידאו אם יש card.videoUrl (אמיתי, לא
 * ממציאים), אחרת gradient+motion עדין לפי היעד — תמיד עובד, בלי תצורה. הוידאו רק מתנגן
 * כשהשקף בפועל גלוי (>50%, IntersectionObserver) — לא את כל 8 הסרטונים בבת אחת.
 */
export function DealSlide({ card }) {
  const { t } = useLanguage();
  const slideRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const hasShownGlitchRef = useRef(false);
  const hue = hueFromDestination(card.destination);

  useEffect(() => {
    const el = slideRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsActive(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { threshold: [0, 0.5, 1] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isActive && card.isGlitchDrop && !hasShownGlitchRef.current) {
      hasShownGlitchRef.current = true;
      setShowGlitch(true);
    }
  }, [isActive, card.isGlitchDrop]);

  // ישיר — בלי אנימציית טעינה: בונה את הדיפ-לינקים (כבר עם ה-marker, מהשרת) ופותח טאב מיד.
  function handleLockDeal() {
    if (card.flightBookingUrl) {
      console.log('[DealSlide] Opening flight deep link:', card.flightBookingUrl);
      window.open(card.flightBookingUrl, '_blank', 'noopener,noreferrer');
    }
    if (card.hotelBookingUrl) {
      console.log('[DealSlide] Opening hotel deep link:', card.hotelBookingUrl);
      window.open(card.hotelBookingUrl, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <section ref={slideRef} className="deal-slide">
      <div
        className="deal-slide__media"
        style={{ background: `linear-gradient(160deg, hsl(${hue}, 60%, 30%), hsl(${(hue + 40) % 360}, 65%, 14%))` }}
      >
        {card.videoUrl && isActive ? (
          <video
            className="deal-slide__video"
            src={card.videoUrl}
            poster={card.videoPosterUrl || undefined}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : card.photoUrl ? (
          <img className="deal-slide__photo" src={card.photoUrl} alt="" loading="lazy" />
        ) : (
          <motion.div
            className="deal-slide__motion-fallback"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      <div className="deal-slide__overlay">
        <h2 className="deal-slide__title">{card.title}</h2>
        <p className="deal-slide__subtitle">{card.subtitle}</p>

        <motion.button
          type="button"
          className="deal-slide__lock-button"
          whileTap={{ scale: 0.95 }}
          onClick={handleLockDeal}
        >
          {t.lockDealButton}
        </motion.button>
      </div>

      {showGlitch && <GlitchDropOverlay caption={card.glitchCaption} />}
    </section>
  );
}
