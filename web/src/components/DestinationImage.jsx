import { useEffect, useState } from 'react';
import { fetchDestinationImage } from '../api/client.js';

// cache בזיכרון של ה-session — לא מבקשים את התמונה של אותו יעד פעמיים, גם אם הוא מופיע
// בכמה כרטיסים על המסך (live_price + anomaly לאותו מסלול, למשל)
const sessionImageCache = new Map();

/**
 * DestinationImage — תמונת יעד אמיתית (Unsplash, עם ייחוס לצלם) שמצטרפת מעל ה-gradient
 * placeholder הקיים. lazy + blur-in: מתחילה שקופה ומטושטשת, ו"מתבהרת" כשהיא נטענת.
 * אם אין תמונה (אין מפתח Unsplash, היעד לא נמצא, או טעינה נכשלה) — נשאר רק ה-gradient,
 * בלי קריסה ובלי "תמונה שבורה". כל כשלון אמיתי (לא 404 רגיל) נרשם ל-console.error כדי
 * שאפשר יהיה לדבג למה תמונות לא נטענות (למשל UNSPLASH_ACCESS_KEY חסר/שגוי ב-Railway).
 */
export function DestinationImage({ iataCode }) {
  const [image, setImage] = useState(() => sessionImageCache.get(iataCode) ?? undefined);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (sessionImageCache.has(iataCode)) {
      setImage(sessionImageCache.get(iataCode));
      return;
    }

    let isMounted = true;
    fetchDestinationImage(iataCode)
      .then((data) => {
        sessionImageCache.set(iataCode, data);
        if (isMounted) setImage(data);
      })
      .catch((err) => {
        // 404 (אין תמונה ליעד הזה) לא מגיע לכאן בכלל — fetchDestinationImage מחזיר null
        // עבורו בעדינות. אם הגענו לכאן, זו שגיאה אמיתית (רשת/שרת) שכן שווה לדבג.
        console.error(`[DestinationImage] Failed to fetch image for "${iataCode}":`, err.message);
        sessionImageCache.set(iataCode, null);
        if (isMounted) setImage(null);
      });

    return () => {
      isMounted = false;
    };
  }, [iataCode]);

  function handleImgError() {
    console.error(`[DestinationImage] Image file failed to load for "${iataCode}" (URL: ${image?.imageUrl}) — falling back to gradient.`);
    sessionImageCache.set(iataCode, null);
    setImage(null);
  }

  if (!image) return null;

  return (
    <>
      <img
        src={image.imageUrl}
        alt=""
        loading="lazy"
        className={`destination-image__img ${isLoaded ? 'is-loaded' : ''}`}
        onLoad={() => setIsLoaded(true)}
        onError={handleImgError}
      />
      {image.attributionName && (
        <a
          className="destination-image__credit"
          href={image.attributionUrl || (image.source === 'pexels' ? 'https://www.pexels.com' : 'https://unsplash.com')}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {image.attributionName} / {image.source === 'pexels' ? 'Pexels' : 'Unsplash'}
        </a>
      )}
    </>
  );
}
