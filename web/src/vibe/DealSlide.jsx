import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { GlitchDropOverlay } from './GlitchDropOverlay.jsx';
import { UrgencyBanner } from './UrgencyBanner.jsx';
import { DealBreakdown } from '../components/DealBreakdown.jsx';
import { BundleModal } from '../components/BundleModal.jsx';
import { buildCarRentalUrl, buildEsimUrl } from '../utils/packageLinks.js';

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
 * הכפתור הראשי פותח BundleModal **ישירות, בלי אנימציית טעינה** (לפי הנחיה מפורשת) —
 * breakdown+כפתורים מוכנים כבר ברגע הלחיצה, לא מחושבים אחרי delay מזויף.
 */
export function DealSlide({ card, packageConfig = null }) {
  const { t } = useLanguage();
  const slideRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [isBundleOpen, setIsBundleOpen] = useState(false);
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

  const marker = packageConfig?.travelpayoutsMarker;
  // רכב/eSIM מחושבים בצד הלקוח (כמו ב-BuyPackageDialog) — אין להם מחיר אמיתי שיש לנו, רק לינק
  const dealLike = { destination: card.destination, departureDate: card.departureDate };
  const carUrl = marker ? buildCarRentalUrl(dealLike, marker, packageConfig?.carRentalUrlTemplate) : null;
  const esimUrl = marker ? buildEsimUrl(dealLike, marker, packageConfig?.esimUrlTemplate) : null;

  const bundleItems = [
    card.flightBookingUrl && { key: 'flight', icon: '✈️', labelKey: 'packageFlightLabel', url: card.flightBookingUrl, color: 'blue' },
    card.hotelBookingUrl && { key: 'hotel', icon: '🏨', labelKey: 'packageHotelButton', url: card.hotelBookingUrl, color: 'green' },
    carUrl && { key: 'car', icon: '🚗', labelKey: 'packageCarButton', url: carUrl, color: 'orange' },
    esimUrl && { key: 'esim', icon: '📱', labelKey: 'packageEsimButton', url: esimUrl, color: 'purple' },
  ].filter(Boolean);

  const breakdown = {
    flightPrice: card.flightPrice,
    hotelName: card.hotelName,
    hotelTotalPrice: card.hotelTotalPrice,
    hotelStars: card.hotelStars,
    currency: card.currency,
    totalPrice: card.totalPrice,
    pricePerPerson: card.pricePerPerson,
    peopleCount: card.peopleCount,
  };

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

        <DealBreakdown {...breakdown} />

        <UrgencyBanner updatedAt={card.updatedAt} />

        <motion.button
          type="button"
          className="deal-slide__lock-button"
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsBundleOpen(true)}
        >
          {t.lockDealButton}
        </motion.button>
        <small className="deal-slide__quick-hint">{t.bundleQuickHint}</small>
      </div>

      {showGlitch && <GlitchDropOverlay caption={card.glitchCaption} />}

      <AnimatePresence>
        {isBundleOpen && (
          <BundleModal title={t.lockDealButton} breakdown={breakdown} items={bundleItems} onClose={() => setIsBundleOpen(false)} />
        )}
      </AnimatePresence>
    </section>
  );
}
