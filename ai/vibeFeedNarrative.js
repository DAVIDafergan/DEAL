import { getCityName } from '../web/src/data/cityNames.js';

const STOPS_LABEL = {
  he: (n) => (n === 0 ? 'ישירה' : n === 1 ? '1 עצירה' : `${n} עצירות`),
  en: (n) => (n === 0 ? 'nonstop' : n === 1 ? '1 stop' : `${n} stops`),
  es: (n) => (n === 0 ? 'directo' : n === 1 ? '1 escala' : `${n} escalas`),
};

function hotelLine(card, lang) {
  const stars = card.hotelStars ? ` · ${card.hotelStars}★` : '';
  if (card.hotelName) return `🏨 ${card.hotelName}${stars}`;
  // אין תוצאת מלון אמיתית (Hotellook לא מאומת, ראו hotellookClient.js) — לא ממציאים שם מלון
  return { he: '🏨 מלונות זמינים במרכז העיר', en: '🏨 Hotels available downtown', es: '🏨 Hoteles disponibles en el centro' }[lang];
}

/**
 * נרטיב תלת-לשוני לכרטיס ה"ווייב פיד" — בלי קריאה ל-AI, בדיוק כמו ai/templatedNarrative.js
 * עבור live_price: זו הצגת מחיר+מסלול עכשווי, לא ניתוח/שיווק יצירתי.
 * glitchCaption: לא טוען טענת "ירידת מחיר X%" או "נשארו X חדרים" — אין לנו נתון אמיתי על
 * זה (אין מעקב היסטוריה לכרטיסי הפיד, בניגוד ל-anomaly). זה אפקט ויזואלי-עיצובי בלבד.
 */
export function buildVibeFeedNarrative(card) {
  const price = Math.round(card.pricePerPerson);

  return {
    he: {
      title: getCityName(card.destination, 'he'),
      subtitle: `✈️ טיסה ${STOPS_LABEL.he(card.flightStops ?? 0)}, ${card.departureDate} עד ${card.returnDate}\n${hotelLine(card, 'he')}\n💰 ${price} ${card.currency} לאדם`,
      glitchCaption: '🔴 LIVE — דיל פעיל ברגע זה',
    },
    en: {
      title: getCityName(card.destination, 'en'),
      subtitle: `✈️ ${STOPS_LABEL.en(card.flightStops ?? 0)} flight, ${card.departureDate} to ${card.returnDate}\n${hotelLine(card, 'en')}\n💰 ${price} ${card.currency} per person`,
      glitchCaption: '🔴 LIVE — deal active right now',
    },
    es: {
      title: getCityName(card.destination, 'es'),
      subtitle: `✈️ Vuelo ${STOPS_LABEL.es(card.flightStops ?? 0)}, ${card.departureDate} a ${card.returnDate}\n${hotelLine(card, 'es')}\n💰 ${price} ${card.currency} por persona`,
      glitchCaption: '🔴 LIVE — oferta activa ahora',
    },
  };
}
