/**
 * תיוג עורכי (לא נתון מ-API) ליעדים — לאיזה קהל מתאים ואיזה סוג יעד, לצורך כפתורי הסינון.
 * זו אצירת תוכן סובייקטיבית וסבירה, לא "אמת" מדודה — בדיוק כמו שאתרי תוכן נסיעות אחרים
 * מתייגים יעדים. אין כאן נתון שמתחזה למידע אמיתי מה-API.
 *
 * Editorial/curated tagging (not API data) — which audience and destination-type each city
 * fits, used only for the quick-filter buttons. Subjective but reasonable, like any travel
 * content site's destination categorization.
 */
export const DESTINATION_TAGS = {
  AMS: { audiences: ['couples', 'friends', 'solo'], types: ['city', 'shopping'] },
  ATH: { audiences: ['couples', 'families', 'friends'], types: ['city', 'nature'] },
  BCN: { audiences: ['couples', 'friends', 'solo'], types: ['city', 'beach', 'shopping'] },
  BEG: { audiences: ['friends', 'solo'], types: ['city'] },
  BER: { audiences: ['solo', 'friends'], types: ['city', 'shopping'] },
  BKK: { audiences: ['solo', 'friends'], types: ['city', 'shopping'] },
  BOM: { audiences: ['solo'], types: ['city'] },
  BUD: { audiences: ['couples', 'friends', 'solo'], types: ['city'] },
  BUS: { audiences: ['couples', 'friends'], types: ['beach', 'city'] },
  CDG: { audiences: ['couples'], types: ['city', 'shopping'] },
  CMB: { audiences: ['solo', 'friends'], types: ['city', 'nature'] },
  DXB: { audiences: ['couples', 'families'], types: ['city', 'shopping'] },
  EVN: { audiences: ['friends', 'solo'], types: ['city', 'nature'] },
  FCO: { audiences: ['couples', 'families'], types: ['city'] },
  GOI: { audiences: ['couples', 'friends', 'solo'], types: ['beach'] },
  HER: { audiences: ['families', 'couples'], types: ['beach', 'nature'] },
  IST: { audiences: ['couples', 'friends', 'solo'], types: ['city', 'shopping'] },
  KRK: { audiences: ['friends', 'solo'], types: ['city'] },
  LCA: { audiences: ['families', 'couples'], types: ['beach'] },
  LHR: { audiences: ['couples', 'friends', 'solo'], types: ['city', 'shopping'] },
  LIS: { audiences: ['couples', 'friends', 'solo'], types: ['city', 'beach'] },
  MAD: { audiences: ['couples', 'friends', 'solo'], types: ['city', 'shopping'] },
  MLE: { audiences: ['couples'], types: ['beach'] },
  MXP: { audiences: ['couples', 'solo'], types: ['city', 'shopping'] },
  NAP: { audiences: ['families', 'couples'], types: ['city', 'nature'] },
  OTP: { audiences: ['friends', 'solo'], types: ['city'] },
  PMI: { audiences: ['families', 'friends', 'couples'], types: ['beach'] },
  PRG: { audiences: ['couples', 'friends', 'solo'], types: ['city'] },
  RHO: { audiences: ['families', 'couples'], types: ['beach', 'nature'] },
  SKG: { audiences: ['friends', 'solo'], types: ['city', 'beach'] },
  SOF: { audiences: ['friends', 'solo'], types: ['city', 'nature'] },
  SPU: { audiences: ['couples', 'friends'], types: ['beach', 'nature'] },
  TBS: { audiences: ['friends', 'solo'], types: ['city', 'nature'] },
  TIA: { audiences: ['friends', 'solo'], types: ['city', 'beach'] },
  VCE: { audiences: ['couples'], types: ['city'] },
  VIE: { audiences: ['couples', 'solo'], types: ['city', 'shopping'] },
  WAW: { audiences: ['friends', 'solo'], types: ['city'] },
  ZAG: { audiences: ['couples', 'friends'], types: ['city', 'nature'] },
  ZNZ: { audiences: ['couples'], types: ['beach', 'nature'] },
};

export function getDestinationTags(iataCode) {
  return DESTINATION_TAGS[iataCode] || { audiences: [], types: [] };
}

/**
 * שער המרה גס דולר->שקל לצורך חלוקת תקציב בלבד (לא שער חליפין חי) — מספיק לצורך סינון גס
 * לשלוש קטגוריות, לא לדיוק פיננסי.
 * Rough USD->ILS reference rate for budget bucketing only (not a live FX rate) — fine for a
 * coarse 3-bucket filter, not financial precision.
 */
export const APPROX_USD_TO_ILS = 3.7;

export function estimateIlsPrice(priceUsd) {
  return priceUsd * APPROX_USD_TO_ILS;
}
