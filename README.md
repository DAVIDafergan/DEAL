# Deal Radar Pro

מערכת לציד דילים אנומליים (חריגות מחיר סטטיסטיות) בטיסות, עם הפצה אוטומטית בשלוש שפות.
כל הנתונים מגיעים מ-APIs רשמיים בלבד — **אין web scraping** בקוד הזה.

## ארכיטקטורה

```
sources/        אדפטרים למקורות נתונים (Amadeus, Travelpayouts) — Strategy Pattern
core/
  db/              חיבור MySQL משותף (pool + יצירת טבלאות + retry בעלייה)
  anomaly-engine/  היסטוריית מחירים ב-MySQL + חישוב Z-score + ציון "סבירות אכיפה"
  scanner/         DealScanner — מחבר sources ↔ anomaly-engine, וגם "Best Live Prices"
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

### פריסה ל-Production (Railway וכו')

זה אפליקציה אחת שמגישה גם API וגם frontend מאותו שרת Express — אין צורך בשני שירותים נפרדים.

- `npm run build` (בשורש הפרויקט) מתקין ובונה את ה-frontend לתוך `web/dist`.
- `npm start` מריץ את שרת ה-Express, שמגיש את `/api/*` כ-JSON, ואת כל שאר הנתיבים (כולל `/`)
  כ-frontend הסטטי מ-`web/dist` עם SPA fallback ל-`index.html`.
- ב-Railway: הגדירו את **Build Command** ל-`npm run build` ואת **Start Command** ל-`npm start`
  (או הסתמכו על Nixpacks שמזהה את שני ה-scripts האלה אוטומטית מ-`package.json`).
- אם `web/dist` לא קיים (למשל סביבת dev לפני build), השרת לא קורס — הוא פשוט לא מגיש frontend
  סטטי, ומחזיר 404 JSON רגיל על נתיבים שאינם `/api/*`.

## מפתחות API נדרשים (כולם מתועדים ב-.env.example)

| משתנה | למה צריך | היכן להשיג |
|---|---|---|
| `AMADEUS_API_KEY` / `AMADEUS_API_SECRET` | חיפוש טיסות | https://developers.amadeus.com (Self-Service, free tier) |
| `ANTHROPIC_API_KEY` | כתיבת נרטיב הדיל (Claude) | https://console.anthropic.com |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHANNEL_*` | הפצה ל-Telegram | @BotFather בטלגרם |
| `WHATSAPP_PHONE_NUMBER_ID` / `WHATSAPP_ACCESS_TOKEN` | הפצה ב-WhatsApp | Meta for Developers — WhatsApp Cloud API |

**המערכת לא קורסת אם מפתח חסר** — היא רק משביתה את הפיצ'ר התלוי בו (למשל: בלי מפתחות Amadeus/Travelpayouts, לא תרוץ סריקה; בלי טוקן Telegram, ערוץ ההפצה הזה מדולג).

### מסד נתונים (MySQL)

- בלי קשר למפתחות ה-API: השרת **תמיד עולה ומגיש HTTP** גם אם ה-MySQL עוד לא מוכן או לא מוגדר.
  החיבור מתבצע ברקע עם retry+backoff (`core/db/index.js`) — לא חוסם את עליית השרת.
- הטבלאות (`price_history`, `deals`, `deals_sent`) נוצרות אוטומטית בעלייה הראשונה אם הן לא קיימות.
- ב-Railway: חברו שירות MySQL לפרויקט, והמשתנים (`MYSQL_URL` או `MYSQLHOST`/`MYSQLUSER`/...)
  נחשפים אוטומטית לשירות ה-Node — אין צורך להעתיק אותם ידנית בין שירותים שמחוברים (Railway
  עושה reference injection אוטומטי כשהשירותים מקושרים בפרויקט).

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

- היסטוריית מחירים נשמרת בטבלת MySQL `price_history` (`route, date, price, scanned_at`), עם
  אינדקס על `(route, date)` ועל `(route, scanned_at)` כדי שהשאילתות יהיו מהירות גם עם הרבה נתונים.
- חישוב Z-score מתבסס על ממוצע וסטיית תקן של עד 90 הימים האחרונים שנסרקו בפועל למסלול.
- **לא מסמנים אנומליה בלי לפחות 5 נקודות מידע היסטוריות אמיתיות למסלול** — זו דרישה קשיחה בקוד
  (`core/anomaly-engine/anomalyDetector.js`), לא הצעה. אין נתוני דמו שמסתירים את זה.
- "סבירות אכיפה" (0-100) היא הערכה — לא ודאות — לסיכוי שמדובר במחיר אמיתי שיכובד, ולא בטעות
  תמחור (fare error) שתתבטל. ככל שהחריגה קיצונית יותר, הציון יורד.

## שני סוגי דיל: anomaly לעומת live_price

`GET /api/deals` מחזיר דילים משני סוגים, מסומנים בבירור בשדה `type`:

- **`anomaly`** — חריגת מחיר מוכחת מול היסטוריה (לפחות 5 נקודות מידע), כולל נרטיב AI ב-3 שפות,
  ציון סבירות אכיפה, וטיימר מעקב. מצטבר כפיד — כל גילוי הוא שורה חדשה.
- **`live_price`** — המחיר הזול ביותר שנמצא *כרגע* למסלול דרך Travelpayouts, בלי תלות בהיסטוריה.
  קיים כדי שיהיו דילים אמיתיים להציג מהדקה הראשונה, לפני שנצברה מספיק היסטוריה לניתוח אנומליות.
  נרטיב תבניתי (לא AI — כדי לא להוציא קריאת Claude על כל רענון של ~40 מסלולים), ולא מופץ
  ל-Telegram/WhatsApp (אלו שמורים להתראות anomaly אמיתיות). מתעדכן (UPSERT) במקום להצטבר —
  שורה אחת לכל מסלול, לפי מזהה דטרמיניסטי `live_<origin>_<destination>`.

כל דיל משני הסוגים מחזיר `bookingUrl` עם ה-Marker של Travelpayouts (`TRAVELPAYOUTS_MARKER`)
כשהמקור הוא Travelpayouts. ב-Amadeus אין לינק רכישה ישיר (אין שם מסלול עמלה דרך האינטגרציה הזו),
כך ש-`bookingUrl` יהיה ריק לדילים שמקורם ב-Amadeus.

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
