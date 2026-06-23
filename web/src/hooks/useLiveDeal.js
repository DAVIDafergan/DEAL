import { useEffect, useRef, useState } from 'react';
import { buildLiveDeal } from '../api/client.js';

// רענון ברקע **בזמן שהייה** (לא בלחיצה) — לפי הנחיה מפורשת: אם רוצים טריות, מרעננים כשהדיל
// נמצא במסך, לא ברגע הלחיצה. 90 שניות מאזן בין "באמת טרי" ל"לא מציף את Travelpayouts".
const BACKGROUND_REFRESH_MS = 90 * 1000;

/**
 * useLiveDeal — המחיר נקבע **לפני** ההצגה, לא בלחיצה: השקף/כרטיס קורא לזה ברגע שהוא נכנס
 * למסך (isActive=true), ה-UI מציג skeleton עד שmstatus==='ready', ומאז זה המחיר "הנעול" —
 * לחיצה על "הזמן" משתמשת באותו liveDeal שכבר הוצג, בלי קריאה נוספת (ראו LiveDealModal.jsx).
 * כל עוד isActive נשאר true, מרענן ברקע (לא חוסם, לא משנה את הכפתור) ומסמן priceFlash אם
 * המחיר השתנה — אנימציה עדינה, לא "החליפו לי את המחיר מתחת לעיניים" בלי שום אינדיקציה.
 */
export function useLiveDeal({ origin, destination, departureDate, returnDate, peopleCount = 2, isActive = true }) {
  const [liveDeal, setLiveDeal] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | notFound | error
  const [priceFlash, setPriceFlash] = useState(null); // 'up' | 'down' | null
  const previousPriceRef = useRef(null);

  useEffect(() => {
    if (!isActive || !origin || !destination || !departureDate) return undefined;
    let isMounted = true;
    setStatus((prev) => (prev === 'ready' ? prev : 'loading'));

    function fetchOnce() {
      buildLiveDeal({ origin, destination, departureDate, returnDate, peopleCount })
        .then((result) => {
          if (!isMounted) return;
          if (result.found) {
            if (previousPriceRef.current !== null && previousPriceRef.current !== result.flightTotal) {
              setPriceFlash(result.flightTotal < previousPriceRef.current ? 'down' : 'up');
              setTimeout(() => {
                if (isMounted) setPriceFlash(null);
              }, 2200);
            }
            previousPriceRef.current = result.flightTotal;
            setLiveDeal(result);
            setStatus('ready');
          } else {
            setStatus('notFound');
          }
        })
        .catch(() => {
          if (isMounted) setStatus((prev) => (prev === 'ready' ? prev : 'error'));
        });
    }

    fetchOnce();
    const intervalId = setInterval(fetchOnce, BACKGROUND_REFRESH_MS);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [origin, destination, departureDate, returnDate, peopleCount, isActive]);

  return { liveDeal, status, priceFlash };
}
