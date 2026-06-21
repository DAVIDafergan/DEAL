# Deal Radar Pro

מערכת לציד דילים אנומליים (חריגות מחיר סטטיסטיות) בטיסות, עם הפצה אוטומטית בשלוש שפות.
כל הנתונים מגיעים מ-APIs רשמיים בלבד — **אין web scraping** בקוד הזה.

## ארכיטקטורה

```
sources/        אדפטרים למקורות נתונים (Amadeus כרגע) — Strategy Pattern
core/
  anomaly-engine/  היסטוריית מחירים ב-SQLite + חישוב Z-score + ציון "סבירות אכיפה"
  scanner/         DealScanner — מחבר sources ↔ anomaly-engine
ai/             נרטיב הדיל בשלוש שפות (he/en/es) בקריאה אחת ל-Claude
distribution/   Telegram + WhatsApp, עם תור retry פשוט (in-memory)
server/         Express API + composition root (DealPipeline) שמחבר את כל השכבות
web/            React + Vite — frontend פרימיום, Dark mode, RTL/LTR דינמי
```

זרימת הנתונים: `sources -> anomaly-engine -> ai -> server/store -> distribution`.
כל שכבה תלויה רק בממשק של השכבה שמתחתיה — לעולם לא בפרטי המימוש.

## הקמה והרצה

### דרך מהירה
```bash
./setup.sh      # מתקין backend+frontend, בודק גרסת Node ומפתחות חסרים
npm start        # מריץ את השרת (http://localhost:3001)
npm run web:dev   # בטרמינל נפרד: מריץ את ה-frontend (http://localhost:5173)
```

### דרך מפורטת
```bash
cp .env.example .env   # ומלאו את המפתחות הרלוונטיים
npm install
npm install --prefix web

npm start          # שרת Backend
npm run web:dev     # Frontend (טרמינל נפרד)
```

הדרישה היחידה: **Node.js 18+**.

## מפתחות API נדרשים (כולם מתועדים ב-.env.example)

| משתנה | למה צריך | היכן להשיג |
|---|---|---|
| `AMADEUS_API_KEY` / `AMADEUS_API_SECRET` | חיפוש טיסות | https://developers.amadeus.com (Self-Service, free tier) |
| `ANTHROPIC_API_KEY` | כתיבת נרטיב הדיל (Claude) | https://console.anthropic.com |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHANNEL_*` | הפצה ל-Telegram | @BotFather בטלגרם |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | הפצה ב-WhatsApp | Meta for Developers — WhatsApp Cloud API |

**המערכת לא קורסת אם מפתח חסר** — היא רק משביתה את הפיצ'ר התלוי בו (למשל: בלי מפתחות Amadeus, לא תרוץ סריקה; בלי טוקן Telegram, ערוץ ההפצה הזה מדולג).

## הוספת מקור נתונים חדש (למשל Duffel או Kiwi Tequila)

השכבה `sources/` בנויה כ-Strategy Pattern בדיוק בשביל זה:

1. צרו `sources/DuffelAdapter.js` שמיישם את `FlightSourceInterface` (`sources/FlightSourceInterface.js`):
   ```js
   import { FlightSourceInterface } from './FlightSourceInterface.js';

   export class DuffelAdapter extends FlightSourceInterface {
     get name() { return 'duffel'; }
     async searchFlights(origin, destination, date) {
       // קריאה ל-API הרשמי של Duffel, והחזרת מערך בפורמט NormalizedFlightOffer
     }
   }
   ```
2. רשמו אותו ב-`sources/index.js` (בתוך `initializeSources`), בתנאי שהוא מוגדר (יש לו מפתחות).
3. זהו. שום קוד אחר (anomaly-engine, scanner, server) לא צריך להשתנות —
   `DealScanner` תמיד פונה ל-`sourceRegistry.searchAll()` ולא למקור ספציפי.

## מנוע האנומליות — חשוב להבין

- היסטוריית מחירים נשמרת בטבלת SQLite (`route, date, price, scanned_at`) בקובץ שמוגדר ב-`SQLITE_DB_PATH`.
- חישוב Z-score מתבסס על ממוצע וסטיית תקן של עד 90 הימים האחרונים שנסרקו בפועל למסלול.
- **לא מסמנים אנומליה בלי לפחות 5 נקודות מידע היסטוריות אמיתיות למסלול** — זו דרישה קשיחה בקוד
  (`core/anomaly-engine/anomalyDetector.js`), לא הצעה. אין נתוני דמו שמסתירים את זה.
- "סבירות אכיפה" (0-100) היא הערכה — לא ודאות — לסיכוי שמדובר במחיר אמיתי שיכובד, ולא בטעות
  תמחור (fare error) שתתבטל. ככל שהחריגה קיצונית יותר, הציון יורד.

## מגבלות ידועות

- **Amadeus test environment**: מפתחות ה-free tier מחוברים לסביבת הטסט של Amadeus, שמכילה לעיתים
  מחירים/זמינות לא מדויקים לחלוטין לעומת ה-production API (בתשלום).
- **תור הפצה in-memory**: `distribution/DealQueue.js` לא שורד הפעלה מחדש של השרת. למעבר לפרודקשן
  אמיתי, יש להחליף ל-Redis/SQS וכו' — שכבת הממשק כבר מבודדת לשם כך.
- **WhatsApp templates**: הקוד שולח לפי שם תבנית (`WHATSAPP_TEMPLATE_NAME`), אבל את התבנית עצמה
  צריך ליצור ולאשר ב-Meta Business Manager לפני שההפצה תעבוד בפועל.
- **סריקה תקופתית פשוטה**: `SCAN_INTERVAL_MINUTES` מבוסס על `setInterval` בתוך תהליך השרת — לא
  cron אמיתי. אם השרת נופל, הסריקה נופלת איתו עד שיעלה מחדש.
- **תאריך טיסה יחיד לסריקה**: `SCAN_DATE_OFFSET_DAYS` בודק תאריך יציאה יחיד (X ימים מהיום) לכל
  מסלול, לא טווח תאריכים גמיש.
