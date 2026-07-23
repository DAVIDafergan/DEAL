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

export function OwnerDashboardTips({ agent, properties }) {
  const hasProperty = properties.length > 0;
  const hasPublished = properties.some((p) => p.status === 'active' || p.status === 'claimed');

  let tip;
  if (!hasProperty) {
    tip = 'התחילו בהוספת הנכס הראשון שלכם — זה לוקח כ-5 דקות.';
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
