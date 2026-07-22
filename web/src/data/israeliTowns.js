/**
 * Curated list of real Israeli towns/villages/moshavim/kibbutzim, tagged by the same REGIONS
 * used in propertyOptions.js. This is a curated subset relevant to rural tourism (cabins/villas
 * concentrate in the north/center-periphery), not the full official CBS locality list (~1,200
 * entries) — good enough for city autocomplete today; swap in the full official list later if
 * coverage gaps show up in practice (see DECISIONS.md 9.1).
 */
export const ISRAELI_TOWNS = {
  north: [
    'קריית שמונה', 'נהריה', 'עכו', 'מעלות תרשיחא', 'שלומי', 'כפר ורדים', 'מבוא חמה',
    'חצור הגלילית', 'טבריה', 'מגדל', 'כפר תבור', 'שדה אילן', 'יבנאל', 'פוריה עילית',
  ],
  galilee: [
    'צפת', 'ראש פינה', 'עמוקה', 'מירון', 'בירייה', 'עין כמונים', 'צוריאל', 'דלתון',
    'כפר יסיף', 'פקיעין', 'מג׳דל שמס', 'עין זיתים', 'תובל', 'שזור', 'עמירים', 'קדיתא',
    'כפר חנניה', 'מעלה צביה', 'אילניה', 'כפר שמאי', 'מצפה נטופה', 'גיתה', 'חוסן', 'סאסא',
  ],
  golan: [
    'קצרין', 'ניצנה', 'נווה אטי"ב', 'מג׳דל שמס', 'עין זיוון', 'קלע', 'אודם', 'אלוני הבשן',
    'רמות', 'אניעם', 'מעלה גמלא', 'קשת', 'חספין', 'אורטל', 'בני יהודה', 'גשור', 'סוסיתא',
  ],
  carmel: [
    'זכרון יעקב', 'עין הוד', 'דור', 'עתלית', 'עספיא', 'דלית אל כרמל', 'נופית', 'טירת כרמל',
    'בית אורן', 'עוספיה', 'חוות שגב', 'רכסים', 'פוריידיס',
  ],
  center: [
    'תל אביב', 'רמת גן', 'הרצליה', 'רעננה', 'כפר סבא', 'נתניה', 'ראשון לציון', 'רחובות',
    'פתח תקווה', 'הוד השרון', 'רמלה', 'לוד', 'קיסריה', 'זרזיר',
  ],
  jerusalem: [
    'ירושלים', 'מבשרת ציון', 'בית שמש', 'אבו גוש', 'עין כרם', 'צור הדסה', 'נטף', 'קריית ענבים',
  ],
  south: [
    'באר שבע', 'אשקלון', 'קריית גת', 'ערד', 'ירוחם', 'מיתר', 'לקיה', 'תל שבע', 'שדרות',
    'נתיבות', 'עומר', 'מצפה רמון',
  ],
  dead_sea: [
    'ים המלח', 'עין בוקק', 'נווה זוהר', 'מצדה', 'עין גדי', 'קליה',
  ],
  eilat: [
    'אילת',
  ],
};

export function townsForRegion(region) {
  return ISRAELI_TOWNS[region] || [];
}

export const ALL_TOWNS = Object.values(ISRAELI_TOWNS).flat();

// 11.1 — hero search "where" autocomplete needs to go from a picked town straight to its
// region (so picking a city also sets the region filter, not just the city).
const TOWN_TO_REGION = Object.fromEntries(
  Object.entries(ISRAELI_TOWNS).flatMap(([region, towns]) => towns.map((town) => [town, region]))
);

export function regionForTown(town) {
  return TOWN_TO_REGION[town] || null;
}
