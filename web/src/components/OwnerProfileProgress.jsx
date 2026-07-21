import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';

/** OwnerProfileProgress — 9.5 onboarding: "סרגל התקדמות (הפרופיל שלך 60% מוכן)". Persistent on
 * the dashboard rather than a one-time modal — a host's profile keeps changing (new property,
 * first publish, filling in the business description later), so a progress bar that's always
 * visible until 100% is more useful than a wizard shown once at signup. */
export function OwnerProfileProgress({ agent, properties }) {
  const hasProperty = properties.length > 0;
  const hasPublished = properties.some((p) => p.status === 'active' || p.status === 'claimed');
  const hasContact = Boolean(agent?.phone || agent?.whatsapp_number);
  const hasLogo = Boolean(agent?.logo_url);
  const hasDescription = Boolean(agent?.description);

  const items = [
    { done: hasProperty, label: 'הוספת נכס ראשון', to: null },
    { done: hasPublished, label: 'פרסום נכס לציבור', to: null },
    { done: hasContact, label: 'הוספת טלפון או וואטסאפ', to: '/owner/dashboard/settings' },
    { done: hasLogo, label: 'הוספת לוגו/תמונת פרופיל', to: '/owner/dashboard/settings' },
    { done: hasDescription, label: 'הוספת תיאור קצר על העסק', to: '/owner/dashboard/settings' },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);

  if (percent === 100) return null;

  return (
    <div className="opp container">
      <div className="opp__head">
        <span className="opp__title">הפרופיל שלך {percent}% מוכן</span>
        <span className="opp__count">{doneCount}/{items.length}</span>
      </div>
      <div className="opp__track"><div className="opp__fill" style={{ width: `${percent}%` }} /></div>
      <div className="opp__items">
        {items.filter((i) => !i.done).map((i) => (
          i.to ? (
            <Link key={i.label} to={i.to} className="opp__item">
              <Circle size={14} />
              {i.label}
            </Link>
          ) : (
            <span key={i.label} className="opp__item opp__item--static">
              <Circle size={14} />
              {i.label}
            </span>
          )
        ))}
        {items.filter((i) => i.done).map((i) => (
          <span key={i.label} className="opp__item opp__item--done">
            <CheckCircle2 size={14} />
            {i.label}
          </span>
        ))}
      </div>
    </div>
  );
}
