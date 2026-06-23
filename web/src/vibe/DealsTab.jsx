import { useEffect, useState } from 'react';
import { fetchVibeFeed, fetchPublicConfig } from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { DealSlide } from './DealSlide.jsx';
import { VibeFilterMenu } from './VibeFilterMenu.jsx';
import { ALL_VIBES_KEY } from './vibeConstants.js';

/**
 * DealsTab — תוכן הטאב "דילים" (ברירת מחדל בכניסה, בלי מסך-בחירה חוסם): גלילה אנכית
 * מלאת-מסך עם scroll-snap טבעי של הדפדפן. vibe='all' כברירת מחדל (כל הווייבים, ממוין
 * מחיר) — בחירת ווייב ספציפי היא תפריט אופציונלי (VibeFilterMenu), לא שלב כניסה.
 * packageConfig (marker + תבניות רכב/eSIM) נמשך כאן כי DealSlide צריך אותו לבניית
 * לינקי הרכב/eSIM ב-BundleModal — אותו marker שכבר עובד בטיסה/מלון מהשרת.
 */
export function DealsTab({ vibe = ALL_VIBES_KEY, onChangeVibe }) {
  const { t, lang } = useLanguage();
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

  return (
    <div className="vibe-feed-page">
      <div className="vibe-feed-page__filter-bar">
        <VibeFilterMenu activeVibe={vibe} onChange={onChangeVibe} />
      </div>

      {cards === null && (
        <div className="vibe-feed-page--centered">
          <p>{t.feedLoadingMessage}</p>
        </div>
      )}

      {cards !== null && cards.length === 0 && (
        <div className="vibe-feed-page--centered">
          <p>{t.feedEmptyMessage}</p>
          {vibe !== ALL_VIBES_KEY && (
            <button type="button" className="vibe-feed-page__back-button" onClick={() => onChangeVibe(ALL_VIBES_KEY)}>
              {t.vibeFilterAll}
            </button>
          )}
        </div>
      )}

      {cards !== null && cards.length > 0 && (
        <div className="vibe-feed-page__scroller">
          {cards.map((card) => (
            <DealSlide key={card.id} card={card} packageConfig={packageConfig} />
          ))}
        </div>
      )}
    </div>
  );
}
