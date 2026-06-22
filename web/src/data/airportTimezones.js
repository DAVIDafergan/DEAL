/**
 * אזור זמן (IANA) לכל קוד IATA ברשימת המסלולים שלנו — כדי להציג שעות טיסה בזמן המקומי
 * האמיתי בכל שדה תעופה (לא מומר לאזור הזמן של מי שצופה באתר).
 *
 * הערה: שעות היציאה/הגעה שמקור הנתונים (Travelpayouts) מחזיר מבוססות על ההנחה שהן כבר
 * משקפות את הזמן המקומי הנכון בשדה התעופה. לא אומת מול תשובת API אמיתית (אין לנו עדיין
 * מפתח Production פעיל) — מומלץ לבדוק זמן טיסה אחד מול Google Flights כשיהיו נתונים אמיתיים.
 *
 * IANA timezone per IATA code, so flight times render in the airport's real local time
 * rather than the viewer's browser timezone. Falls back to `undefined` (browser default)
 * for unknown codes — never crashes.
 */
export const AIRPORT_TIMEZONES = {
  TLV: 'Asia/Jerusalem',
  AMS: 'Europe/Amsterdam',
  ATH: 'Europe/Athens',
  BCN: 'Europe/Madrid',
  BEG: 'Europe/Belgrade',
  BER: 'Europe/Berlin',
  BKK: 'Asia/Bangkok',
  BOM: 'Asia/Kolkata',
  BUD: 'Europe/Budapest',
  BUS: 'Asia/Tbilisi',
  CDG: 'Europe/Paris',
  CMB: 'Asia/Colombo',
  DXB: 'Asia/Dubai',
  EVN: 'Asia/Yerevan',
  FCO: 'Europe/Rome',
  GOI: 'Asia/Kolkata',
  HER: 'Europe/Athens',
  IST: 'Europe/Istanbul',
  KRK: 'Europe/Warsaw',
  LCA: 'Asia/Nicosia',
  LHR: 'Europe/London',
  LIS: 'Europe/Lisbon',
  MAD: 'Europe/Madrid',
  MLE: 'Indian/Maldives',
  MXP: 'Europe/Rome',
  NAP: 'Europe/Rome',
  OTP: 'Europe/Bucharest',
  PMI: 'Europe/Madrid',
  PRG: 'Europe/Prague',
  RHO: 'Europe/Athens',
  SKG: 'Europe/Athens',
  SOF: 'Europe/Sofia',
  SPU: 'Europe/Zagreb',
  TBS: 'Asia/Tbilisi',
  TIA: 'Europe/Tirane',
  VCE: 'Europe/Rome',
  VIE: 'Europe/Vienna',
  WAW: 'Europe/Warsaw',
  ZAG: 'Europe/Zagreb',
  ZNZ: 'Africa/Dar_es_Salaam',
};

export function getAirportTimezone(iataCode) {
  return AIRPORT_TIMEZONES[iataCode];
}
