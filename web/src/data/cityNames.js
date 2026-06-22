/**
 * שמות עיר תלת-לשוניים לקודי IATA שמופיעים ברשימת המסלולים שלנו (DEFAULT_WATCHED_ROUTES).
 * אם קוד לא נמצא ברשימה, מציגים את קוד ה-IATA עצמו בלבד — בלי להמציא שם.
 *
 * Trilingual city names for the IATA codes in our route list. Falls back to the bare IATA
 * code (never fabricated) for anything outside this list.
 */
export const CITY_NAMES = {
  TLV: { he: 'תל אביב', en: 'Tel Aviv', es: 'Tel Aviv' },
  AMS: { he: 'אמסטרדם', en: 'Amsterdam', es: 'Ámsterdam' },
  ATH: { he: 'אתונה', en: 'Athens', es: 'Atenas' },
  BCN: { he: 'ברצלונה', en: 'Barcelona', es: 'Barcelona' },
  BEG: { he: 'בלגרד', en: 'Belgrade', es: 'Belgrado' },
  BER: { he: 'ברלין', en: 'Berlin', es: 'Berlín' },
  BKK: { he: 'בנגקוק', en: 'Bangkok', es: 'Bangkok' },
  BOM: { he: 'מומבאי', en: 'Mumbai', es: 'Mumbái' },
  BUD: { he: 'בודפשט', en: 'Budapest', es: 'Budapest' },
  BUS: { he: 'בטומי', en: 'Batumi', es: 'Batumi' },
  CDG: { he: 'פריז', en: 'Paris', es: 'París' },
  CMB: { he: 'קולומבו', en: 'Colombo', es: 'Colombo' },
  DXB: { he: 'דובאי', en: 'Dubai', es: 'Dubái' },
  EVN: { he: 'ירוואן', en: 'Yerevan', es: 'Ereván' },
  FCO: { he: 'רומא', en: 'Rome', es: 'Roma' },
  GOI: { he: 'גואה', en: 'Goa', es: 'Goa' },
  HER: { he: 'הרקליון (כרתים)', en: 'Heraklion (Crete)', es: 'Heraclión (Creta)' },
  IST: { he: 'איסטנבול', en: 'Istanbul', es: 'Istanbul' },
  KRK: { he: 'קרקוב', en: 'Kraków', es: 'Cracovia' },
  LCA: { he: 'לרנקה', en: 'Larnaca', es: 'Larnaca' },
  LHR: { he: 'לונדון', en: 'London', es: 'Londres' },
  LIS: { he: 'ליסבון', en: 'Lisbon', es: 'Lisboa' },
  MAD: { he: 'מדריד', en: 'Madrid', es: 'Madrid' },
  MLE: { he: 'מאלה', en: 'Malé', es: 'Malé' },
  MXP: { he: 'מילאנו', en: 'Milan', es: 'Milán' },
  NAP: { he: 'נאפולי', en: 'Naples', es: 'Nápoles' },
  OTP: { he: 'בוקרשט', en: 'Bucharest', es: 'Bucarest' },
  PMI: { he: 'פלמה דה מיורקה', en: 'Palma de Mallorca', es: 'Palma de Mallorca' },
  PRG: { he: 'פראג', en: 'Prague', es: 'Praga' },
  RHO: { he: 'רודוס', en: 'Rhodes', es: 'Rodas' },
  SKG: { he: 'סלוניקי', en: 'Thessaloniki', es: 'Salónica' },
  SOF: { he: 'סופיה', en: 'Sofia', es: 'Sofía' },
  SPU: { he: 'ספליט', en: 'Split', es: 'Split' },
  TBS: { he: 'טביליסי', en: 'Tbilisi', es: 'Tiflis' },
  TIA: { he: 'טירנה', en: 'Tirana', es: 'Tirana' },
  VCE: { he: 'ונציה', en: 'Venice', es: 'Venecia' },
  VIE: { he: 'וינה', en: 'Vienna', es: 'Viena' },
  WAW: { he: 'ורשה', en: 'Warsaw', es: 'Varsovia' },
  ZAG: { he: 'זאגרב', en: 'Zagreb', es: 'Zagreb' },
  ZNZ: { he: 'זנזיבר', en: 'Zanzibar', es: 'Zanzíbar' },
};

export function getCityName(iataCode, lang) {
  return CITY_NAMES[iataCode]?.[lang] || iataCode;
}
