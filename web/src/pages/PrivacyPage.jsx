import { Link } from '../components/LocalizedLink.jsx';
import { ArrowLeft } from 'lucide-react';

export function PrivacyPage() {
  return (
    <div className="legal-page" dir="rtl">
      <div className="legal-page__inner container">
        <Link to="/" className="legal-page__back"><ArrowLeft size={16} /> חזרה לדף הבית</Link>
        <h1 className="legal-page__title">מדיניות פרטיות</h1>
        <p className="legal-page__updated">עודכן לאחרונה: יוני 2026</p>

        <section className="legal-section">
          <h2>1. מידע שאנו אוספים</h2>
          <p>בעת הרשמה כבעל צימר/וילה אנו אוספים: שם עסק, שם איש קשר, כתובת דוא"ל, מספר טלפון ו-WhatsApp. משתמשים רגילים הגולשים באתר אינם נדרשים להירשם ולא נאספים נתונים מזהים אודותם.</p>
        </section>

        <section className="legal-section">
          <h2>1א. איסוף מידע על נכסים — ⚠️ טעון אישור עו"ד</h2>
          <p>
            <strong>הסעיף הזה הוא placeholder לצורך פיתוח בלבד ואינו מהווה ייעוץ משפטי או התחייבות
            משפטית סופית — אין לפרסם בייצור לפני אישור עורך דין.</strong>
          </p>
          <p>
            הפלטפורמה עשויה לאסוף מידע עסקי על נכסי אירוח (צימרים/וילות) ממקורות פומביים —
            אך ורק מאתרים עצמאיים של בעלי נכסים, לעולם לא מפלטפורמות הזמנה (Booking, Airbnb וכו').
            נאסף מידע עסקי בלבד (שם נכס, מיקום, מתקנים, מחיר, פרטי קשר עסקיים) — לא מידע אישי
            שאינו עסקי. תמונות ותיאורים אינם מועתקים מהמקור — פירוט מלא ב-
            <code>PRIVACY.md</code> בריפו הפרויקט.
          </p>
          <p>
            בעל נכס יכול לבקש הסרה מיידית ואוטומטית ולצמיתות בכל עת דרך{' '}
            <a href="/remove">עמוד ההסרה</a>, ללא צורך באישור מנהל.
          </p>
        </section>

        <section className="legal-section">
          <h2>2. שימוש במידע</h2>
          <p>המידע שנאסף משמש אך ורק לצורך הפעלת הפלטפורמה: אימות סוכנים, הצגת פרופיל ציבורי, ויצירת קשר בין משתמשים לסוכנים. אנו לא מוכרים, משכירים או מעבירים מידע לצדדים שלישיים לצרכי שיווק.</p>
        </section>

        <section className="legal-section">
          <h2>3. עוגיות ואנליטיקה</h2>
          <p>האתר עשוי להשתמש בעוגיות טכניות לצורך תפקוד תקין של הסשן. אנו עשויים להשתמש בכלי אנליטיקה אנונימיים (כגון Plausible) לצורך שיפור השירות. לא נעשה שימוש בפיקסלי מעקב של רשתות פרסום.</p>
        </section>

        <section className="legal-section">
          <h2>4. אחסון ואבטחה</h2>
          <p>המידע מאוחסן בשרתים מאובטחים. סיסמאות מוצפנות ואינן נשמרות בטקסט גלוי. אנו נוקטים באמצעי אבטחה סבירים, אולם איננו יכולים להבטיח אבטחה מוחלטת.</p>
        </section>

        <section className="legal-section">
          <h2>5. זכויות המשתמש</h2>
          <p>סוכנים רשאים לבקש עיון, תיקון או מחיקה של המידע האישי שלהם בכל עת, באמצעות פנייה לכתובת הדוא"ל שלהלן.</p>
        </section>

        <section className="legal-section">
          <h2>6. שינויים במדיניות</h2>
          <p>Dealim רשאית לעדכן מדיניות זו. עדכונים מהותיים יימסרו לסוכנים רשומים בדוא"ל.</p>
        </section>

        <section className="legal-section">
          <h2>7. יצירת קשר</h2>
          <p>לשאלות בנושא פרטיות: <a href="mailto:privacy@dealim.org">privacy@dealim.org</a></p>
        </section>
      </div>
    </div>
  );
}
