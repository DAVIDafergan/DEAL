import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useLiveDeal } from '../hooks/useLiveDeal.js';
import { getDiscountPercent } from '../utils/dealHeat.js';
import { shareDeal } from '../utils/share.js';
import { RiskGauge } from './RiskGauge.jsx';
import { CountdownTimer } from './heatmap/CountdownTimer.jsx';
import { FlightDetails } from './FlightDetails.jsx';
import { DestinationImage } from './DestinationImage.jsx';
import { BuyPackageDialog } from './BuyPackageDialog.jsx';
import { LiveDealModal } from './LiveDealModal.jsx';
import { formatShortDate } from '../utils/flightFormat.js';
import { buildHotelUrl } from '../utils/packageLinks.js';
import { getCurrencySymbol } from '../utils/currency.js';

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.92, transition: { duration: 0.22, ease: 'easeIn' } },
};

/**
 * DealCard — כרטיס הדיל המרכזי. שני סוגי דיל מוצגים אחרת:
 *   - anomaly: badge הנחה בוער, Risk gauge, טיימר מעקב, אזהרת סיכון.
 *   - live_price: badge "מחיר הזול ביותר" רגוע יותר, "עודכן לפני X" במקום טיימר/אזהרה
 *     (אין כאן ניתוח סיכון אמיתי — זה פשוט המחיר הנוכחי).
 * isCheapest: הדיל הזול ביותר ברשימה המוצגת כרגע מקבל badge זהוב נפרד.
 *
 * **המחיר נקבע לפני ההצגה, לא בלחיצה**: useLiveDeal נקרא כש-הכרטיס נכנס לתצוגה
 * (IntersectionObserver, isVisible) — לא כש-לוחצים "הזמן". skeleton מוצג עד שה-קריאה
 * החיה הראשונה חוזרת; מאז זה המחיר ה"נעול", הכפתור עובר ל-LiveDealModal עם **אותו** מחיר,
 * בלי קריאה נוספת. ⚠️ שיקול עומס: viewport-gating מגביל קריאות חיות ל"מה שבפועל גלוי",
 * אבל ברשת עמוסה (הרבה משתמשים גוללים בגריד במקביל) זה עדיין תוספת אמיתית מעל מחזור
 * הסריקה הקיים — אם זה מסתבר אגרסיבי מדי ב-production, שווה לשקול להגביל רק ל-N הכרטיסים
 * הזולים ביותר (הסבירים ביותר ללחיצה), לא לכל כרטיס שנכנס לתצוגה.
 */
export function DealCard({ deal, packageConfig = null, isCheapest = false }) {
  const { t, lang } = useLanguage();
  const cardRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [shareStatus, setShareStatus] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPackageDialogOpen, setIsPackageDialogOpen] = useState(false);
  const [isLiveDealOpen, setIsLiveDealOpen] = useState(false);
  const isAnomaly = deal.type === 'anomaly';
  const discountPercent = isAnomaly ? getDiscountPercent(deal) : 0;

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { liveDeal, status, priceFlash } = useLiveDeal({
    origin: deal.origin,
    destination: deal.destination,
    departureDate: deal.departureDate,
    returnDate: deal.returnDate || null,
    peopleCount: 2,
    isActive: isVisible,
  });

  // הלוך-חזור מוצג רק אם יש נתון אמיתי (returnDate) — קיים ל-live_price כשהמקור תומך בכך,
  // לא קיים ל-anomaly (שם נשאר one-way במכוון, ראו DealScanner). לא ממציאים תאריך חזור.
  const isRoundTrip = Boolean(deal.returnDate);
  const routeLine = isRoundTrip
    ? t.packageRoundTripFormat(
        deal.origin,
        deal.destination,
        formatShortDate(deal.departureDate, lang),
        formatShortDate(deal.returnDate, lang)
      )
    : `${deal.origin} → ${deal.destination}`;

  async function handleShare() {
    const result = await shareDeal(deal, t);
    if (result.method === 'clipboard') {
      setShareStatus('copied');
      setTimeout(() => setShareStatus(null), 2000);
    }
  }

  // "הוסף מלון" — לא דיאלוג, פשוט פותח טאב חדש ישר ל-Hotellook עם התאריכים/יעד ממולאים
  function handleAddHotel() {
    const hotelUrl = buildHotelUrl(deal, packageConfig?.travelpayoutsMarker);
    console.log('[DealCard] Add hotel URL:', hotelUrl);
    if (hotelUrl) window.open(hotelUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <motion.article
      ref={cardRef}
      id={`deal-${deal.id}`}
      className="deal-card"
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    >
      <div className="deal-card__media">
        <DestinationImage iataCode={deal.destination} />
        {isCheapest && <span className="deal-card__badge deal-card__badge--cheapest">★ {t.cheapestBadge}</span>}
        {!isCheapest && isAnomaly && discountPercent > 0 && (
          <span className="deal-card__badge deal-card__badge--hot">-{discountPercent}%</span>
        )}
        {!isCheapest && !isAnomaly && <span className="deal-card__badge deal-card__badge--calm">{t.bestPriceBadge}</span>}
        <span className={`deal-card__route ${isRoundTrip ? 'deal-card__route--roundtrip' : ''}`}>{routeLine}</span>
      </div>

      <div className="deal-card__body">
        <h3 className="deal-card__title">{deal.title}</h3>
        <p className="deal-card__desc">{deal.description}</p>

        {status === 'loading' && (
          <div className="deal-card__price-skeleton">
            <div className="deal-card__price-skeleton-bar" />
          </div>
        )}

        {status === 'ready' && liveDeal && (
          <>
            <div className="deal-card__price-row">
              <span
                className={`deal-card__price ${priceFlash ? `deal-card__price--flash-${priceFlash}` : ''}`}
                key={priceFlash ? `flash-${liveDeal.pricePerPerson}` : undefined}
              >
                {t.priceFromPrefix}
                {Math.round(liveDeal.pricePerPerson)}
                {getCurrencySymbol(liveDeal.currency)}
              </span>
              {isAnomaly && deal.movingAverage && (
                <span className="deal-card__price-avg">
                  {t.avgPrice}: {Math.round(deal.movingAverage)} {deal.currency}
                </span>
              )}
            </div>
            <p className="deal-card__freshness">
              {t.priceFreshnessLabel(new Date(liveDeal.builtAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
            </p>
          </>
        )}

        {(status === 'notFound' || status === 'error') && (
          <p className="deal-card__price-unavailable">{t.dealNoLongerAvailableMessage}</p>
        )}

        {isAnomaly && (
          <>
            <RiskGauge score={deal.enforcementLikelihood} />
            <CountdownTimer createdAt={deal.createdAt} />
            <p className="deal-card__risk">{deal.riskWarning}</p>
          </>
        )}

        <button
          type="button"
          className="deal-card__expand-toggle"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          <span>{t.flightDetailsButton}</span>
          <motion.span
            className="deal-card__expand-chevron"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ⌄
          </motion.span>
        </button>

        <AnimatePresence initial={false}>{isExpanded && <FlightDetails deal={deal} />}</AnimatePresence>

        <div className="deal-card__actions">
          <motion.button
            type="button"
            className="deal-card__action deal-card__action--share"
            whileTap={{ scale: 0.96 }}
            onClick={handleShare}
          >
            {shareStatus === 'copied' ? t.copiedToClipboard : t.shareButton}
          </motion.button>

          {deal.bookingUrl && (
            <motion.button
              type="button"
              className="deal-card__action deal-card__action--buy"
              whileTap={{ scale: 0.96 }}
              disabled={status !== 'ready'}
              onClick={() => setIsLiveDealOpen(true)}
            >
              {t.buyNowButton}
            </motion.button>
          )}
        </div>
        {deal.bookingUrl && <p className="deal-card__availability-note">{t.availabilityTrustNote}</p>}

        {packageConfig?.travelpayoutsMarker && (
          <div className="deal-card__actions deal-card__actions--secondary">
            <motion.button
              type="button"
              className="deal-card__action"
              whileTap={{ scale: 0.96 }}
              onClick={handleAddHotel}
            >
              {t.addHotelButton}
            </motion.button>
            <motion.button
              type="button"
              className="deal-card__action"
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsPackageDialogOpen(true)}
            >
              {t.buyPackageButton}
            </motion.button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isPackageDialogOpen && (
          <BuyPackageDialog deal={deal} packageConfig={packageConfig} onClose={() => setIsPackageDialogOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>{isLiveDealOpen && <LiveDealModal liveDeal={liveDeal} onClose={() => setIsLiveDealOpen(false)} />}</AnimatePresence>
    </motion.article>
  );
}
