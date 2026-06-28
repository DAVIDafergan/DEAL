import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function AccessibilityPage() {
  return (
    <div className="legal-page" dir="rtl">
      <div className="legal-page__inner container">
        <Link to="/" className="legal-page__back"><ArrowLeft size={16} /> חזרה לדף הבית</Link>
        <h1 className="legal-page__title">הצהרת נגישות</h1>
        <p className="legal-page__updated">עודכן: יוני 2026</p>

        <section className="legal-section">
          <h2>מחויבות לנגישות</h2>
          <p>
            Dealim מחויבת לאפשר לכלל המשתמשים, כולל אנשים עם מוגבלויות, לגשת לתכנים ולשירותים באתר.
            אנו פועלים לעמוד בדרישות תקן ישראלי <strong>ת"י 5568</strong> (המבוסס על WCAG 2.0 ברמה AA).
          </p>
          <p>
            ניתן להפעיל כלי נגישות בלחיצה על סימן ה-<strong>♿</strong> הצף בפינת המסך.
            הכלי מאפשר שינוי גודל הטקסט, ניגודיות גבוהה, עצירת אנימציות, הדגשת קישורים וגופן קריא.
          </p>
        </section>

        <section className="legal-section">
          <h2>רמת הנגישות</h2>
          <p>
            האתר פועל לעמידה ב-<strong>WCAG 2.0, רמה AA</strong>, לפי תקן ת"י 5568.
            הנגישות יושמה בהיבטים הבאים:
          </p>
          <ul>
            <li>ניווט מלא במקלדת (Tab, Shift+Tab, Enter, Escape) בכל האלמנטים האינטראקטיביים</li>
            <li>מיקוד גלוי (<code>:focus-visible</code>) על כל כפתור, קישור ושדה קלט</li>
            <li>קישור "דלג לתוכן העיקרי" בראש כל עמוד</li>
            <li>טפסי הרשמה והתחברות עם תוויות מקושרות (<code>&lt;label htmlFor&gt;</code>)</li>
            <li>הודעות שגיאה עם <code>role="alert"</code> וקישור ל-<code>aria-describedby</code></li>
            <li>חלונות מודאל עם <code>role="dialog"</code>, <code>aria-modal</code>, לכידת פוקוס וסגירה ב-Escape</li>
            <li>אלמנטי מדיה (וידאו/תמונה) עם <code>aria-label</code> מתאר</li>
            <li>ארכיטקטורת HTML סמנטית: כותרות (<code>h1–h2</code>), ניווטים (<code>nav</code>), ראשי דף (<code>header</code>), תוכן ראשי (<code>main</code>)</li>
            <li>ניגודיות צבע עומדת בדרישות WCAG AA (4.5:1 לטקסט)</li>
            <li>תמיכה בזום עד 200% ללא אובדן תוכן</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>מגבלות נגישות ידועות</h2>
          <ul>
            <li>תכנים בפיד הרילס (Reels) מוצגים ברצף דינמי — ייתכן שחלק מהתכנים לא נגישים במלואם לכלי קריאת מסך.</li>
            <li>תוכן שמוצג על ידי צדדים שלישיים (כגון Google Sign-In) כפוף למדיניות הנגישות של אותם ספקים.</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>יצירת קשר בעניין נגישות</h2>
          <p>
            אם נתקלת בבעיית נגישות או ברצונך לקבל מידע נוסף, פנה אלינו:
          </p>
          <ul>
            <li>דואר אלקטרוני: <a href="mailto:support@dealim.org">support@dealim.org</a></li>
            <li>WhatsApp: <a href="https://wa.me/972556674329" target="_blank" rel="noopener noreferrer">972-55-667-4329</a></li>
          </ul>
          <p>אנו נשתדל להשיב תוך 7 ימי עסקים.</p>
        </section>

        <section className="legal-section">
          <h2>אמצעי נגישות נוספים</h2>
          <p>
            ניתן להשתמש בתוכנות קריאת מסך כגון NVDA, JAWS, VoiceOver (iOS/macOS) ו-TalkBack (Android).
            האתר נבדק על Chrome ו-Safari עם VoiceOver.
          </p>
        </section>
      </div>
    </div>
  );
}
