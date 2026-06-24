import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useLiveDeal } from '../hooks/useLiveDeal.js';
import { GlitchDropOverlay } from './GlitchDropOverlay.jsx';
import { UrgencyBanner } from './UrgencyBanner.jsx';
import { LiveDealModal } from '../components/LiveDealModal.jsx';
import { formatShortDate } from '../utils/flightFormat.js';
import { getCurrencySymbol } from '../utils/currency.js';

/**
 * DealSlide — שקף אחד במסך מלא בפיד הווייב. רקע: וידאו אם יש card.videoUrl, אחרת gradient
 * עדין — תמיד עובד. הוידאו רק מתנגן כשהשקף בפועל גלוי (>50%, IntersectionObserver).
 *
 * **המחיר נקבע לפני ההצגה, לא בלחיצה**: כש-isActive (השקף גלוי) הופך true, useLiveDeal
 * קורא לטיסה החיה ברגע הזה — לא בלחיצת "הזמן". בזמן הטעינה הראשונה מוצג skeleton במקום
 * מספר; ברגע ש-status==='ready', זה המחיר ה"נעול" — לחיצה על הכפתור פותחת את LiveDealModal
 * עם **אותו** liveDeal שכבר מוצג, בלי קריאת רשת נוספת, כך שהמספר לא יכול להשתנות בין מה
 * שהמשתמש ראה לבין מה שהוא רואה אחרי הלחיצה. כל עוד השקף נשאר גלוי, useLiveDeal מרענן ברקע
 * (לא בלחיצה) ומסמן priceFlash אם המחיר השתנה — אנימציה עדינה, לא שינוי שקט.
 */
export function DealSlide({ card }) {
  const { t, lang } = useLanguage();
  const slideRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [isLiveDealOpen, setIsLiveDealOpen] = useState(false);
  const hasShownGlitchRef = useRef(false);

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

  const { liveDeal, status, priceFlash } = useLiveDeal({
    origin: card.origin,
    destination: card.destination,
    departureDate: card.departureDate,
    returnDate: card.returnDate,
    peopleCount: card.peopleCount,
    isActive,
  });

  const currencySymbol = getCurrencySymbol(card.currency);
  // הערה: hotel still sourced from card (vibeFeedEngine.js, נפרד, לא נערך) — מידע בלבד, לא
  // חלק מהמחיר הנעול (liveDeal הוא flight-only, ראו liveDealBuilder.js).
  const hasRealHotel = card.hotelTotalPrice !== null && card.hotelTotalPrice !== undefined;
  const flightStops = liveDeal?.flightStops ?? card.flightStops ?? 0;
  const departureDate = liveDeal?.departureDate ?? card.departureDate;
  const returnDate = liveDeal?.returnDate ?? card.returnDate;

  return (
    <section ref={slideRef} className="deal-slide">
      <div className="deal-slide__media">
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
        {/* Info pills — flight / hotel / car — dark glass over video */}
        <div className="deal-slide__info-pills">
          <span className="deal-slide__info-pill">
            ✈ {t.stopsLabel(flightStops)}
            {departureDate && returnDate && (
              <> · {formatShortDate(departureDate, lang)} → {formatShortDate(returnDate, lang)}</>
            )}
          </span>
          {hasRealHotel && (
            <span className="deal-slide__info-pill">
              🏨 {card.hotelName || t.breakdownHotelGenericLabel}
              {card.hotelStars ? ` · ${card.hotelStars}★` : ''}
              {card.hotelBreakfastIncluded === true && ' · ☕'}
            </span>
          )}
          {liveDeal?.carRentalUrl && (
            <span className="deal-slide__info-pill">🚗 {t.carAvailableLabel}</span>
          )}
        </div>

        <h2 className="deal-slide__title">{card.title}</h2>

        {status === 'loading' && (
          <div className="deal-slide__price-skeleton">
            <div className="deal-slide__price-skeleton-bar deal-slide__price-skeleton-bar--lg" />
            <div className="deal-slide__price-skeleton-bar deal-slide__price-skeleton-bar--sm" />
          </div>
        )}

        {status === 'ready' && liveDeal && (
          <>
            {/* היררכיה ברורה: לאדם = הכי בולט, סה"כ לקבוצה = משני, לא על אותה שורה */}
            <p className={`deal-slide__price-per-person ${priceFlash ? `deal-slide__price-per-person--flash-${priceFlash}` : ''}`}>
              {t.priceFromPrefix}
              {Math.round(liveDeal.pricePerPerson)}
              {currencySymbol} <span className="deal-slide__price-per-person-label">{t.vibePerPersonLabel}</span>
            </p>
            <p className="deal-slide__price-total">
              {t.breakdownTotalLabel} {t.packageForPeopleLabel(liveDeal.peopleCount)}: {Math.round(liveDeal.totalPrice)}
              {currencySymbol}
            </p>
          </>
        )}

        {(status === 'notFound' || status === 'error') && (
          <p className="deal-slide__price-unavailable">{t.dealNoLongerAvailableMessage}</p>
        )}

        <UrgencyBanner updatedAt={liveDeal?.builtAt || card.updatedAt} />

        <motion.button
          type="button"
          className="deal-slide__lock-button"
          whileTap={{ scale: 0.95 }}
          disabled={status !== 'ready'}
          onClick={() => setIsLiveDealOpen(true)}
        >
          {t.lockDealButton}
        </motion.button>
        <small className="deal-slide__quick-hint">{t.bundleQuickHint}</small>
      </div>

      {showGlitch && <GlitchDropOverlay caption={card.glitchCaption} />}

      <AnimatePresence>
        {isLiveDealOpen && <LiveDealModal liveDeal={liveDeal} onClose={() => setIsLiveDealOpen(false)} />}
      </AnimatePresence>
    </section>
  );
}
