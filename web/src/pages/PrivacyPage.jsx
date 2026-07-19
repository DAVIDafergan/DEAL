import { Link } from 'react-router-dom';
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
          <p>בעת הרשמה כסוכן נסיעות אנו אוספים: שם עסק, שם איש קשר, כתובת דוא"ל, מספר טלפון ו-WhatsApp. משתמשים רגילים הגולשים באתר אינם נדרשים להירשם ולא נאספים נתונים מזהים אודותם.</p>
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
