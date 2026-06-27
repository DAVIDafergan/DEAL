import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export function TermsPage() {
  return (
    <div className="legal-page" dir="rtl">
      <div className="legal-page__inner container">
        <Link to="/" className="legal-page__back"><ArrowLeft size={16} /> חזרה לדף הבית</Link>
        <h1 className="legal-page__title">תנאי שימוש</h1>
        <p className="legal-page__updated">עודכן לאחרונה: יוני 2026</p>

        <section className="legal-section">
          <h2>1. כללי</h2>
          <p>ברוכים הבאים ל-Dealim. השימוש באתר ובשירותיו כפוף לתנאים המפורטים להלן. שימוש באתר מהווה הסכמה מלאה לתנאים אלו.</p>
        </section>

        <section className="legal-section">
          <h2>2. השירות</h2>
          <p>Dealim הינה פלטפורמה המאגדת הצעות נסיעה מסוכני נסיעות מורשים. האתר אינו מוכר כרטיסי טיסה, חדרי מלון או שירותי תיירות ישירות — הוא מפנה את המשתמש לסוכן הנסיעות הרלוונטי.</p>
        </section>

        <section className="legal-section">
          <h2>3. סוכני נסיעות</h2>
          <p>סוכנים המפרסמים דילים באמצעות הפלטפורמה אחראים לנכונות המידע, לתוקף ההצעות ולעמידה בדיני רישוי סוכנויות נסיעות. Dealim שומרת לעצמה את הזכות לאשר, לדחות, להסיר או להשהות פרסומים לפי שיקול דעתה.</p>
        </section>

        <section className="legal-section">
          <h2>4. אחריות</h2>
          <p>Dealim אינה אחראית לתוכן המפורסם על ידי סוכני נסיעות, לשינויים במחירים, לביטולי טיסות, לתנאי ויזה, או לכל נזק ישיר ועקיף הנובע מהסתמכות על המידע באתר. המשתמש אחראי לאמת פרטים ישירות מול הסוכן לפני הזמנה.</p>
        </section>

        <section className="legal-section">
          <h2>5. קניין רוחני</h2>
          <p>כל זכויות הקניין הרוחני באתר, לרבות עיצוב, טקסטים, לוגו וקוד, שייכות ל-Dealim. אין להעתיק, לשכפל או להפיץ תוכן מהאתר ללא אישור מראש ובכתב.</p>
        </section>

        <section className="legal-section">
          <h2>6. שינויים בתנאים</h2>
          <p>Dealim רשאית לעדכן תנאים אלו בכל עת. המשך השימוש באתר לאחר פרסום התנאים המעודכנים מהווה הסכמה לשינויים.</p>
        </section>

        <section className="legal-section">
          <h2>7. יצירת קשר</h2>
          <p>לכל שאלה ניתן לפנות אל: <a href="mailto:support@dealradar.pro">support@dealradar.pro</a></p>
        </section>
      </div>
    </div>
  );
}
