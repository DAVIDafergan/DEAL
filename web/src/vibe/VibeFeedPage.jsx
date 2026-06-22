import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchVibeFeed, fetchPublicConfig } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { NowProvider } from '../context/NowContext.jsx';
import { DealSlide } from './DealSlide.jsx';

/**
 * VibeFeedPage — הפיד עצמו (/feed/:vibe): גלילה אנכית מלאת-מסך עם scroll-snap טבעי של
 * הדפדפן (לא ספריית swipe חיצונית) — זה מה שנותן "swipe up/down חלק ומדויק, אין lag" בלי
 * קוד מותאם-אישית לזיהוי מחוות. כל שקף הוא DealSlide אחד (100vh).
 * עטוף ב-NowProvider משלו: זה route נפרד מ-App.jsx (לא מקונן בתוכו), אז אין לו גישה
 * ל-NowProvider של App — צריך אחד עצמאי כדי ש-UrgencyBanner יתקתק.
 * packageConfig (marker + תבניות רכב/eSIM) נמשך כאן כי DealSlide צריך אותו לבניית
 * לינקי הרכב/eSIM ב-BundleModal — אותו marker שכבר עובד בטיסה/מלון מהשרת.
 */
export function VibeFeedPage() {
  const { vibe } = useParams();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const [cards, setCards] = useState(null); // null = עדיין בטעינה
  const [packageConfig, setPackageConfig] = useState(null);

  useEffect(() => {
    fetchPublicConfig()
      .then(setPackageConfig)
      .catch(() => setPackageConfig(null));
  }, []);

  useEffect(() => {
    let isMounted = true;
    setCards(null);
    fetchVibeFeed(vibe, lang)
      .then((res) => {
        if (isMounted) setCards(res.cards || []);
      })
      .catch(() => {
        if (isMounted) setCards([]);
      });
    return () => {
      isMounted = false;
    };
  }, [vibe, lang]);

  if (cards === null) {
    return (
      <div className="vibe-feed-page vibe-feed-page--centered">
        <p>{t.feedLoadingMessage}</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="vibe-feed-page vibe-feed-page--centered">
        <p>{t.feedEmptyMessage}</p>
        <button type="button" className="vibe-feed-page__back-button" onClick={() => navigate('/feed')}>
          {t.vibeBackButton}
        </button>
      </div>
    );
  }

  return (
    <NowProvider>
      <div className="vibe-feed-page">
        <button type="button" className="vibe-feed-page__back-button vibe-feed-page__back-button--floating" onClick={() => navigate('/feed')}>
          {t.vibeBackButton}
        </button>
        <div className="vibe-feed-page__scroller">
          {cards.map((card) => (
            <DealSlide key={card.id} card={card} packageConfig={packageConfig} />
          ))}
        </div>
      </div>
    </NowProvider>
  );
}
