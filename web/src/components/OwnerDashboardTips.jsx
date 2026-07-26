import { Lightbulb } from 'lucide-react';

// 11.5: replaces the checklist-style profile-completion progress bar (5 items, a track, a
// percentage) with a single relevant tip — the old version stayed on-screen indefinitely and
// added a lot of visual weight to the top of the dashboard for something an owner glances at
// once. One short, contextual line is what actually gets read.
const GENERAL_TIPS = [
  'תמונות איכותיות הן הגורם המשמעותי ביותר בהחלטת אורח פוטנציאלי — כדאי להשקיע בהן.',
  'עדכון קבוע של לוח הזמינות משפר את הדירוג בחיפוש ואת אמון האורחים.',
  'תשובה מהירה לפנייה בוואטסאפ מכפילה את הסיכוי להזמנה בפועל.',
  'תיאור קצר וכן על הנכס עוזר לאורחים הנכונים למצוא אתכם.',
];

// 11.15 — one missing-item at a time, in the order an owner would naturally fix them (basics
// before media before publish-blockers), so the tip always names something concrete to do next.
const MISSING_ITEM_HINTS = {
  region: 'הוסיפו אזור',
  city: 'הוסיפו עיר/יישוב',
  name: 'הוסיפו שם לנכס',
  property_type: 'בחרו סוג נכס',
  unit: 'הוסיפו יחידת דיור',
  unit_price_capacity: 'הוסיפו מחיר וקיבולת אורחים',
  complex_photos: 'הוסיפו עוד תמונות',
  unit_photos: 'הוסיפו תמונות ליחידה',
  contact: 'הוסיפו טלפון או וואטסאפ',
};
const CHECKLIST_TOTAL = 8;

export function OwnerDashboardTips({ agent, properties, draftChecklist }) {
  const hasProperty = properties.length > 0;
  const hasPublished = properties.some((p) => p.status === 'active' || p.status === 'claimed');

  let tip;
  if (!hasProperty) {
    tip = 'התחילו בהוספת הנכס הראשון שלכם — זה לוקח כ-5 דקות.';
  } else if (!hasPublished && draftChecklist && draftChecklist.missing.length > 0) {
    // "הפרופיל שלך 70% מוכן, הוסף תמונות ומחיר כדי להופיע גבוה יותר" — a percentage plus the
    // single next concrete step, not the permanent multi-row checklist widget 11.5 removed.
    const pct = Math.round(((CHECKLIST_TOTAL - draftChecklist.missing.length) / CHECKLIST_TOTAL) * 100);
    const nextStep = MISSING_ITEM_HINTS[draftChecklist.missing[0]] || 'השלימו את הפרטים החסרים';
    tip = `הפרופיל שלכם ${pct}% מוכן — ${nextStep} כדי לפרסם ולהופיע גבוה יותר בתוצאות.`;
  } else if (!hasPublished) {
    tip = 'הנכס עדיין בטיוטה — השלימו תמונות ומחיר כדי לפרסם אותו לציבור.';
  } else {
    // Stable-per-mount pick (not re-rolled on every render) — one tip, not a carousel to watch.
    tip = GENERAL_TIPS[agent?.id ? agent.id % GENERAL_TIPS.length : 0];
  }

  return (
    <div className="odt container">
      <Lightbulb size={16} className="odt__icon" />
      <span className="odt__text">{tip}</span>
    </div>
  );
}
