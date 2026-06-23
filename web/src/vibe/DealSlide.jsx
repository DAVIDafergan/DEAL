import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { GlitchDropOverlay } from './GlitchDropOverlay.jsx';
import { UrgencyBanner } from './UrgencyBanner.jsx';
import { BundleModal } from '../components/BundleModal.jsx';
import { buildCarRentalUrl, buildEsimUrl } from '../utils/packageLinks.js';
import { formatShortDate } from '../utils/flightFormat.js';
import { getCurrencySymbol } from '../utils/currency.js';

/**
 * DealSlide — שקף אחד במסך מלא בפיד הווייב. רקע: וידאו אם יש card.videoUrl (אמיתי, לא
 * ממציאים), אחרת gradient+motion עדין — תמיד עובד, בלי תצורה. הוידאו רק מתנגן כשהשקף בפועל
 * גלוי (>50%, IntersectionObserver) — לא את כל 8 הסרטונים בבת אחת.
 *
 * התצוגה על השקף עצמו ("Bottom Line") מינימלית בכוונה: יעד, שורת טיסה+מלון קצרה, ומחיר
 * כולל בולט אחד — בלי breakdown מפורט עם אייקונים. ה-breakdown המפורט (DealBreakdown, כל
 * רכיב בנפרד) מוצג רק בתוך BundleModal, אחרי לחיצה על הכפתור היחיד — UI נקי, לא עומס.
 * הכפתור פותח את ה-modal **ישירות, בלי אנימציית טעינה** (לפי הנחיה מפורשת).
 */
export function DealSlide({ card, packageConfig = null }) {
  const { t, lang } = useLanguage();
  const slideRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [showGlitch, setShowGlitch] = useState(false);
  const [isBundleOpen, setIsBundleOpen] = useState(false);
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

  const marker = packageConfig?.travelpayoutsMarker;
  // רכב/eSIM מחושבים בצד הלקוח (כמו ב-BuyPackageDialog) — אין להם מחיר אמיתי שיש לנו, רק לינק
  const dealLike = { destination: card.destination, departureDate: card.departureDate };
  const carUrl = marker ? buildCarRentalUrl(dealLike, marker, packageConfig?.carRentalUrlTemplate) : null;
  const esimUrl = marker ? buildEsimUrl(dealLike, marker, packageConfig?.esimUrlTemplate) : null;
  const currencySymbol = getCurrencySymbol(card.currency);
  const hasRealHotel = card.hotelTotalPrice !== null && card.hotelTotalPrice !== undefined;

  const bundleItems = [
    card.flightBookingUrl && { key: 'flight', icon: '✈️', labelKey: 'packageFlightLabel', url: card.flightBookingUrl },
    card.hotelBookingUrl && { key: 'hotel', icon: '🏨', labelKey: 'packageHotelButton', url: card.hotelBookingUrl },
    carUrl && { key: 'car', icon: '🚗', labelKey: 'packageCarButton', url: carUrl },
    esimUrl && { key: 'esim', icon: '📱', labelKey: 'packageEsimButton', url: esimUrl },
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
    hasCarOption: Boolean(carUrl),
    hasEsimOption: Boolean(esimUrl),
  };

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
        <h2 className="deal-slide__title">{card.title}</h2>

        <div className="deal-slide__includes">
          <p className="deal-slide__includes-item">
            ✈️ {t.stopsLabel(card.flightStops ?? 0)}
            {card.departureDate && card.returnDate && (
              <> · {formatShortDate(card.departureDate, lang)} → {formatShortDate(card.returnDate, lang)}</>
            )}
          </p>
          {hasRealHotel && (
            <p className="deal-slide__includes-item">
              🏨 {card.hotelName || t.breakdownHotelGenericLabel}
              {card.hotelStars ? ` · ${card.hotelStars}★` : ''} · {t.nightsLabel(card.nights)}
              {/* ארוחת בוקר: רק אם Hotellook אמר במפורש (true/false) — null = לא ידוע, "פרטים באתר", לא ממציאים */}
              {card.hotelBreakfastIncluded === true && ` · ${t.breakfastIncludedLabel}`}
              {card.hotelBreakfastIncluded === null && ` · ${t.detailsOnSiteLabel}`}
            </p>
          )}
          {card.hasCarRentalOption && <p className="deal-slide__includes-item">🚗 {t.carAvailableLabel}</p>}
        </div>

        {/* היררכיה ברורה: לאדם = הכי בולט, סה"כ לקבוצה = משני, לא על אותה שורה */}
        <p className="deal-slide__price-per-person">
          {t.priceFromPrefix}
          {Math.round(card.pricePerPerson)}
          {currencySymbol} <span className="deal-slide__price-per-person-label">{t.vibePerPersonLabel}</span>
        </p>
        <p className="deal-slide__price-total">
          {t.breakdownTotalLabel} {t.packageForPeopleLabel(card.peopleCount)}: {Math.round(card.totalPrice)}
          {currencySymbol} · {t.flightAndHotelTag}
        </p>

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
