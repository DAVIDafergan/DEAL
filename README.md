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
| `UNSPLASH_ACCESS_KEY` | תמונת יעד אמיתית לכל כרטיס טיסה | https://unsplash.com/developers (Demo tier, 50 בקשות/שעה — מספיק עם ה-cache) |
| `TRAVELPAYOUTS_CAR_RENTAL_URL_TEMPLATE` / `TRAVELPAYOUTS_ESIM_URL_TEMPLATE` | כפתורי "בנה חבילה" (רכב/eSIM) | הדשבורד של Travelpayouts שלכם — ראו הערה למטה |

**המערכת לא קורסת אם מפתח חסר** — היא רק משביתה את הפיצ'ר התלוי בו (למשל: בלי מפתחות Amadeus/Travelpayouts, לא תרוץ סריקה; בלי טוקן Telegram, ערוץ ההפצה הזה מדולג).

### מסד נתונים (MySQL)

- בלי קשר למפתחות ה-API: השרת **תמיד עולה ומגיש HTTP** גם אם ה-MySQL עוד לא מוכן או לא מוגדר.
  החיבור מתבצע ברקע עם retry+backoff (`core/db/index.js`) — לא חוסם את עליית השרת.
- הטבלאות (`price_history`, `deals`, `deals_sent`, `destination_images`) נוצרות אוטומטית בעלייה
  הראשונה אם הן לא קיימות. עמודות חדשות שנוספות בעדכונים עתידיים (למשל `departure_at`) מתווספות
  בעדינות לטבלה קיימת דרך migration שבודק קיום-עמודה לפני `ALTER TABLE` — לא שובר נתונים קיימים.
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

## כרטיס הטיסה הנפתח (Frontend)

לכל דיל יש כרטיס שנפתח ומציג: מסלול עם שמות עיר תלת-לשוניים (`web/src/data/cityNames.js`),
תאריך/שעת יציאה והגעה **בזמן המקומי האמיתי של כל שדה תעופה** (לא מומר לאזור הזמן של הצופה —
`web/src/data/airportTimezones.js`), חניות, ומשך טיסה כולל. כל שדה שהמקור לא דיווח (זמן/משך)
נופל בעדינות ל-"—" או לתאריך-בלבד — לא מומצא.

⚠️ **הנחת עבודה שלא אומתה**: שעות הטיסה מבוססות על ההנחה ש-Travelpayouts מחזיר זמן מקומי נכון
בשדה התעופה. לא נבדק מול תשובת API אמיתית (אין מפתח Production פעיל בסביבת הפיתוח). מומלץ
לבדוק שעת טיסה אחת מול Google Flights כשיהיו נתונים אמיתיים זורמים.

## תמונות יעד (Unsplash)

תמונה אמיתית לכל יעד, נמשכת מ-Unsplash API הרשמי (לא Google — סוגיית זכויות יוצרים) ונשמרת
ב-cache בטבלת `destination_images` ל-30 יום, כדי לא לעבור את מכסת ה-50 בקשות/שעה של ה-tier
החינמי. כל תמונה מוצגת עם ייחוס לצלם (`Photo by X / Unsplash`) ולינק UTM חזרה ל-Unsplash, ויש
ping ל-`download_location` בכל פעם שתמונה חדשה נשמרת — שני אלה נדרשים בתנאי השימוש של Unsplash.
בלי מפתח, או אם היעד לא נמצא — הכרטיס מציג רק את ה-gradient placeholder, בלי קריסה.

## סינון מהיר וקטגוריות יעד

תיוג הקהל/סוג-היעד (`web/src/data/destinationTags.js`) הוא **תוכן עורכי, לא נתון מ-API** — בדיוק
כמו שאתרי תוכן נסיעות מתייגים יעדים. סינון התקציב מבוסס על מחיר אמיתי של הדיל, מומר ל-₪ בשער
קירוב קבוע (`APPROX_USD_TO_ILS`, לא שער חליפין חי) — מדויק מספיק לחלוקה גסה ל-3 קטגוריות.

## בנה חבילה (Hotel / Car / eSIM)

כל כרטיס דיל יכול לפתוח "בנה את החופשה שלך" עם 3 לינקים נפרדים של Travelpayouts, כולם עם
ה-Marker שלכם:

- **מלון (Hotellook)** — פורמט לינק ידוע ויציב, **עובד מיד** עם `TRAVELPAYOUTS_MARKER` בלבד. תאריכי
  הצ'ק-אין/אאוט הם הנחה של 5 לילות מתאריך הטיסה (אין לנו תאריך חזרה — חיפוש one-way) — מסומן
  בבירור בממשק כ"תאריכים לדוגמה".
- **רכב / eSIM** — ⚠️ הפורמט המדויק של הלינקים האלה משתנה בין חשבונות Travelpayouts, ולא היה לי
  אפשרות לאמת אותו בלי גישה לחשבון אמיתי. במקום לסכן לינק שבור או בלי Marker, אלה מוגדרים
  כ-**תבנית** (`TRAVELPAYOUTS_CAR_RENTAL_URL_TEMPLATE` / `TRAVELPAYOUTS_ESIM_URL_TEMPLATE` ב-`.env`)
  עם placeholders `{marker}`/`{destination}`/`{checkin}`. קחו את הפורמט המדויק מהדשבורד שלכם
  (Tools -> Car rental / eSIM -> Get link). בלי תבנית מוגדרת, הכפתור המתאים פשוט לא מוצג.

ה-UI מנוסח בכוונה כ"בנה את החופשה שלך" עם 3 פעולות נפרדות (לא "קנייה אחת ממוזגת"), עם disclaimer
מפורש שכל רכיב הוא הזמנה עצמאית אצל הספק שלו.

## עקרון עיצוב: בלי סטטיסטיקות פנימיות למשתמש

העמוד מכוון כולו ללחיצה. אין תצוגה של מדדים תפעוליים כמו "כמה דילים נשלחו" או "כמה מסלולים
נסרקו" (אלו עדיין נגישים פנימית דרך `GET /api/stats`, פשוט לא מוצגים בעמוד). המונה "X דילים
בוערים עכשיו" על המפה נשאר — הוא נועד ליצור דחיפות/FOMO, לא לדווח על תפעול המערכת.

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
- **תאריכי מלון משוערים**: לינק ה-Hotellook מניח 5 לילות מתאריך הטיסה, כי אין לנו תאריך חזרה
  (חיפוש one-way). מסומן ככה בממשק, אבל המשתמש צריך לתקן בעמוד המלון בפועל.
- **לינקי רכב/eSIM לא מובנים בקוד**: דורשים הגדרת תבנית ב-`.env` מהדשבורד של Travelpayouts —
  ראו "בנה חבילה" למעלה.
- **גודל ה-JS bundle**: כ-508KB לפני gzip / ~173KB אחרי — סביר לאתר עשיר בפיצ'רים, אבל לא עבר
  code-splitting (למשל lazy-load למפה). אם מהירות בנייד תהיה בעיה בפועל, זה המקום הראשון לבדוק.
