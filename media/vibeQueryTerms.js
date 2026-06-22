/**
 * מילות חיפוש נוספות לפי ווייב, כדי שחיפוש Pexels יהיה ספציפי יותר משם העיר בלבד —
 * שם עיר לבדו (למשל "Rhodes") יכול להחזיר תוצאה לא קשורה (מבנה תעשייתי, וכו'). הוספת
 * הקשר ויזואלי-מהווייב ("beach landscape ocean" וכו') משפרת את הסיכוי לתוצאה רלוונטית.
 */
export const VIBE_QUERY_TERMS = {
  urban: 'city aerial skyline downtown',
  beach: 'beach landscape ocean coastline',
  nature: 'nature mountains landscape scenic',
  romantic: 'romantic sunset scenic old town',
};

export function buildVibeAwareQuery(cityNameEn, vibe) {
  const terms = VIBE_QUERY_TERMS[vibe];
  return terms ? `${cityNameEn} ${terms}` : `${cityNameEn} travel`;
}
