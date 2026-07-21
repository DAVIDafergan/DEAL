import { BadgePercent, MessageCircle, ReceiptText } from 'lucide-react';

const POINTS = [
  { icon: BadgePercent, title: 'בלי עמלות', sub: 'המחיר שאתם רואים הוא המחיר שאתם משלמים — בלי תוספות נסתרות בדרך להזמנה' },
  { icon: MessageCircle, title: 'קשר ישיר עם הבעלים', sub: 'מדברים ישירות עם מי שמכיר את הנכס הכי טוב — בלי מוקד, בלי מתווכים' },
  { icon: ReceiptText, title: 'מחירים שקופים', sub: 'כל מחיר מוצג מראש, ליחידה, כולל סופ״שים וחגים — אין הפתעות בסוף' },
];

export function TrustSection() {
  return (
    <section className="trust-section container" dir="rtl">
      <div className="trust-grid">
        {POINTS.map(({ icon: Icon, title, sub }) => (
          <div className="trust-card" key={title}>
            <div className="trust-card__icon"><Icon size={24} strokeWidth={1.75} /></div>
            <h3 className="trust-card__title">{title}</h3>
            <p className="trust-card__sub">{sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
