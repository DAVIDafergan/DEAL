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

## תמונות יעד (Pexels + Unsplash)

תמונה אמיתית לכל יעד (`images/destinationImageService.js`), בעדיפות: **Pexels** ראשון (אם
`PEXELS_API_KEY` מוגדר — חינמי, בלי דרישת attribution קשיחה), ואז **Unsplash** כ-fallback
(`UNSPLASH_ACCESS_KEY`). שניהם משתמשים ב**אותו cache** בטבלת `destination_images` (30 יום, כדי
לא לעבור מכסות rate-limit), עם עמודת `source` שמסמנת מאיזה ספק הגיעה כל תמונה — ה-frontend
(`DestinationImage.jsx`) מציג ייחוס נכון בהתאם (`Photo by X / Pexels` או `/ Unsplash`), לא
מציג "Unsplash" על תמונה שבאה מ-Pexels. Unsplash עדיין מקבל ping ל-`download_location` כנדרש
בתנאי השימוש שלו; Pexels לא דורש את זה. בלי שום מפתח, או אם היעד לא נמצא — gradient placeholder
בלבד, בלי קריסה. **חשוב**: שני המפתחות מוגדרים ב-Railway Variables בעצמכם — זה לא משהו
שאני יכול לעשות מכאן; הקוד כבר קורא אותם נכון ויפעיל אותם אוטומטית כשהם קיימים.

## סינון מהיר וקטגוריות יעד

תיוג הקהל/סוג-היעד (`web/src/data/destinationTags.js`) הוא **תוכן עורכי, לא נתון מ-API** — בדיוק
כמו שאתרי תוכן נסיעות מתייגים יעדים. סינון התקציב מבוסס על מחיר אמיתי של הדיל, מומר ל-₪ בשער
קירוב קבוע (`APPROX_USD_TO_ILS`, לא שער חליפין חי) — מדויק מספיק לחלוקה גסה ל-3 קטגוריות.

## בנה חבילה (Hotel / Car / eSIM)

כל כרטיס דיל מציג **"הוסף מלון"** — כפתור פשוט, בלי דיאלוג: לחיצה בונה URL ל-Hotellook ופותחת
אותו בטאב חדש ישירות (`DealCard.jsx`'s `handleAddHotel`, מדפיס את ה-URL ל-console לדיבוג).
פורמט הלינק: `https://hotellook.com/search?destination=X&checkIn=Y&checkOut=Z&currency=ILS&ref=MARKER`
(`buildHotelUrl` ב-`packageLinks.js`) — ⚠️ עדיין לא מאומת מול תשובת API/redirect אמיתי של
Hotellook (אין production access לבדוק), אבל זה הפורמט שצוין במפורש, לא ניחוש. תאריכי
הצ'ק-אין/אאוט: אם לדיל יש `returnDate` אמיתי (live_price הלוך-חזור) משתמשים בו כ-checkOut;
אחרת (anomaly, one-way במכוון) נופלים להערכה של 5 לילות.

כפתור **"קנה חבילה"** (`BuyPackageDialog.jsx`) פותח `BundleModal.jsx` — דיאלוג גנרי משותף
(גם לגריד וגם לפיד הווייב, ראו למטה) עם כפתור צבעוני נפרד לכל פריט (טיסה=כחול, מלון=ירוק,
רכב=כתום, eSIM=סגול), כל אחד עם deep link אמיתי; לחיצה פותחת טאב חדש ומסמנת ✓. **בלי
breakdown כאן בכוונה**: דילי הגריד (anomaly/live_price) הם טיסה בודדת — יש לנו מחיר טיסה
אמיתי (כבר מוצג על הכרטיס) אבל לא מחיר מלון אמיתי, אז אין דרך הוגנת להציג "סה"כ" שמשלב את
שניהם בלי להמציא נתון. ה-breakdown האמיתי (טיסה+מלון, שני המחירים אמיתיים) קיים רק בפיד
הווייב, ששם יש לנו את שניהם מחיפוש אמיתי.

- **רכב / eSIM** — ⚠️ הפורמט המדויק של הלינקים האלה משתנה בין חשבונות Travelpayouts, ולא היה לי
  אפשרות לאמת אותו בלי גישה לחשבון אמיתי. אלה מוגדרים כ-**תבנית**
  (`TRAVELPAYOUTS_CAR_RENTAL_URL_TEMPLATE` / `TRAVELPAYOUTS_ESIM_URL_TEMPLATE` ב-`.env`) עם
  placeholders `{marker}`/`{destination}`/`{checkin}`. בלי תבנית מוגדרת, הכפתור פשוט לא מוצג.

## שאלון אישי + מנוע חבילות דינמי (הפיצ'ר המרכזי)

לחיצה על "בנה לי חבילה" פותחת שאלון של 4 שאלות ויזואליות (כמה אנשים / תקציב / כמה ימים / סוג
חופשה). בסיום, השרת מחפש **טיסה הלוך-חזור אמיתית** (Travelpayouts) + **מלון אמיתי** (Hotellook)
ל-2-3 יעדים מתאימים, ומציג חבילות עם מחיר לאדם.

חשוב להבין על המחיר: **רק רכיבים עם מחיר אמיתי נכנסים לסכום** — טיסה (תמיד) ומלון (אם נמצא).
רכב ו-eSIM הם לינקים מומלצים בלי מחיר אמיתי שיש לנו, ולכן **לא נספרים** ב"מחיר לאדם" — זה לא
מחיר "סודי שמתחזה לכולל", פשוט חשבנו רק את מה שיש לנו נתון אמיתי עליו.

⚠️ **Hotellook לא אומת מול תשובת API אמיתית** (אין מפתח Production לבדוק) — ראו את ההערה
המפורטת בקובץ `sources/hotellookClient.js` על ההנחות (איזה פורמט `location` מקבל, האם המחיר
המוחזר הוא ללילה או לכל השהייה). אם המבנה האמיתי שונה, זה המקום הראשון לתקן.

**שני מנגנוני "בנה חבילה" שונים, בכוונה:**
- **דיל בודד → "בנה חבילה"** (בתוך `DealCard`): הטיסה היא הדיל שכבר מוצג, מציע *תוספות*
  (מלון/רכב/eSIM) ללא חישוב מחיר כולל.
- **שאלון → חבילה דינמית** (הפיצ'ר הזה): מחפש טיסה+מלון *מההתחלה* בהתאם לתשובות, עם מחיר לאדם.

**יעילות/rate-limit**: לא כל הקומבינציות האפשריות נבדקות בזמן אמת. "דילים פופולריים" מתעדכנים
כל 30 דק' לכמה פרסטים מוגדרים מראש (`POPULAR_PRESETS` ב-`core/packages/packageEngine.js`),
ותוצאות שאלון אישי נשמרות ב-cache לשעה (לפי hash של התשובות) כדי לא לחפש מחדש על כל הגשה חוזרת
של אותן תשובות.

## טיסות הלוך-חזור ב-"Best Live Prices"

`live_price` (לא `anomaly`) מציג כעת מחיר **הלוך-חזור אמיתי** כשהמקור תומך בכך, לא רק one-way:
`DealScanner` עושה קריאת round-trip נוספת (`SCAN_RETURN_TRIP_DAYS`, ברירת מחדל 7 ימים — הנחת
אורך חופשה לתצוגה בלבד) ומשתמש במחיר הלוך-חזור האמיתי כ"המחיר המוצג", כדי שתצוגת
"TLV → BCN (תאריך) ← TLV (תאריך)" תמיד תשקף בדיוק את המחיר שמוצג — לא ש-price הוא one-way
אבל מוצג עם תאריך חזור (זה היה מטעה).

**`anomaly` נשאר one-way במכוון** — אם הוא היה עובר ל-round-trip, זה היה משבש את ממוצע ההיסטוריה
הקיים ב-`price_history` (מחיר הלוך-חזור הוא בגודל-סדר אחר ממחיר one-way), ובכך לפגוע באמינות
חישוב ה-Z-score לאנומליות עתידיות. כל מסלול עושה כעת 2 קריאות API במקום 1 (one-way לאנומליה +
round-trip ל-live-price) — ⚠️ עם `SCAN_INTERVAL_MINUTES=5` (ברירת המחדל החדשה) זה כ-960 קריאות
שעה ל-Travelpayouts על ~40 מסלולים; אם נתקלים ב-429 תכופים, העלו את המספר הזה.

## כרטיס טיסה: עצירות עם אנימציה, וזום במפה

- כרטיס שנפתח מציג קו שמצייר את עצמו (SVG `pathLength`) בין המוצא ליעד, עם עיגול מהבהב בכל
  נקודת עצירה (`web/src/components/RouteAnimation.jsx`) — לא עוד שני עיגולי קצה סטטיים.
- המפה תומכת בזום אינטראקטיבי מלא (`ZoomableGroup` מ-react-simple-maps — wheel/pinch/drag
  עובדים מהקופסה דרך d3-zoom), כפתורי +/-, ולחיצה על דיל ש"ממרכזת" ומתמקדת על היעד שלו.

## מיון לפי מחיר, רענון, ודילים שנעלמים

- `GET /api/deals?sorted=true` מחזיר מחיר עולה (הזול ביותר ראשון); בלי הפרמטר — העדכני ביותר
  ראשון (זה מה שה-feed/מפה עדיין משתמשים בו, כדי לשמור על "מה נכנס עכשיו"). ה-frontend מביא
  את שתי הגרסאות במקביל (שתיהן מול ה-DB שלנו, לא קריאה חיצונית נוספת).
- הכרטיס הזול ביותר ברשימה המוצגת מקבל badge זהוב נפרד ("הזול ביותר") — לא תלוי ב-badge
  ה"מחיר טוב"/הנחה הקיים, מחליף אותו רק עבור הכרטיס הזה.
- כשהמחיר של דיל משתנה בין רענון לרענון (frontend poll, לא backend scan), המחיר "מבריק" —
  ירוק אם ירד, כתום אם עלה — אנימציית `box-shadow`/`background-color` קצרה, לא דהויה.
- `SCAN_INTERVAL_MINUTES=15` (ברירת מחדל, ירד מ-5) — פחות אגרסיבי מבחינת מכסת Travelpayouts.
- `live_price` שלא התעדכן ב-35 הדקות האחרונות (~2 מחזורי סריקה) מוחרג מ-`listDeals` — זה מה
  שגורם לדילים "שהתחסלו"/לא רלוונטים יותר להיעלם מהתצוגה בעדינות, במקום להישאר תקועים עם
  מחיר ישן. `anomaly` נשאר ללא הגבלת גיל (פיד היסטורי, לא "מלאי כרגע").

## דיאלוגים: הוסף מלון, קנה חבילה

- **"הוסף מלון"** (`AddHotelDialog.jsx`) — דיאלוג ממוקד: תמונת היעד, תאריכי צ'ק-אין/אאוט,
  וכפתור לחיפוש ב-Hotellook. אם לדיל יש `returnDate` אמיתי (live_price הלוך-חזור) זה ה-
  checkOut המוצג — לא הערכה. רק כש**אין** תאריך חזרה אמיתי (anomaly, one-way במכוון) נופלים
  להערכה של 5 לילות, ומסמנים את זה בבירור עם הערה למשתמש.
- **"קנה חבילה"** (`BuyPackageDialog.jsx`) — עוטף את `PackageBuilder` (טיסה+מלון+רכב+SIM,
  4 בחירות נפרדות עם ה-marker) בדיאלוג מסודר, במקום ה-toggle המוטמע הישן בתוך הכרטיס.

## תמונות יעד: דיבוג

אם תמונות לא נטענות ב-Railway: בדקו את לוג העלייה של השרת — יש כעת שורה מפורשת
(`UNSPLASH_ACCESS_KEY is set/NOT set`) שמאשרת אם ה-Variable בכלל הגיע לשרת. אם המפתח קיים
אבל עדיין אין תמונות, `images/destinationImageService.js` מדפיס שגיאה ברורה לכל כשלון אמיתי
(לא ל-404 "אין תמונה" הרגיל) — וגם `DestinationImage.jsx` בצד ה-client מדפיס ל-console אם
קובץ התמונה עצמו נכשל לטעון (`onError`). ה-gradient placeholder (per-destination, לא generic)
ממשיך לעבוד תמיד כ-fallback, ול-`<img>` יש `loading="lazy"`.

## Vibe Feed + Bottom Nav (`/`) — פיד מסך-מלא בסטייל TikTok, עכשיו הבית

⚠️ **שינוי routing נוסף** (היסטוריה: שתי הפיכות בנושא הזה — תועלת לדעת אם משהו מרגיש לא
עקבי בהיסטוריית הקוד). הארכיטקטורה הסופית: `AppShell.jsx` הוא מעטפת **אחת** עם 3 טאבים
קבועים (`web/src/components/BottomNav.jsx`, תפריט תחתון בסגנון טיקטוק/אינסטגרם):
- **🎬 דילים** (`/`, `web/src/vibe/DealsTab.jsx`) — ברירת מחדל, **בלי שום מסך-בחירה חוסם**.
  נכנס ישר לפיד עם `vibe=all` (כל הווייבים מאוחדים, ממוין מחיר עולה, deduped לפי יעד —
  `listAllVibesFeedCards` ב-`vibeFeedStore.js`). בחירת ווייב ספציפי היא תפריט **אופציונלי**
  בתוך הפיד (`VibeFilterMenu.jsx`, לא שלב כניסה) — `/urban`/`/beach`/`/nature`/`/romantic`
  עדיין עובדים כ-URL-ים ישירים לווייב ספציפי.
- **✈️ טיסות** (`/flights`) — עמוד הבית הישן (heatmap/רשת/פילטרים, `App.jsx`) ללא שינוי
  תוכן, רק הוסר ממנו כפתור פתיחת השאלון (עבר לטאב הבא).
- **🔍 חופשה מושלמת** (`/plan`, `PlanTab.jsx`) — השאלון (`QuestionnaireModal.jsx`) מוצג
  **ישר** כתוכן הטאב, לא חוסם מאחורי כפתור.

**שלושת הטאבים נשארים mounted כל הזמן** — `AppShell.jsx` מחליף תצוגה (display:none) ולא
route/conditional-render, כדי שגלילה ב-feed (ומצב בטאבים האחרים) לא תתאפס במעבר טאב וחזרה.
זו תכונה מובנית של אלגוריתם ה-reconciliation של React (אותו component type באותו מקום
בעץ ב-render הבא = לא remount), לא טריק שדורש בדיקת דפדפן להוכיח.

**הנתונים אמיתיים, לא דמה**: כל כרטיס בפיד נבנה ע"י `core/vibes/vibeFeedEngine.js`, חיפוש טיסה
הלוך-חזור אמיתי (Travelpayouts) + מלון אמיתי (Hotellook, best-effort) ליעד שמתאים לווייב לפי
התיוג העורכי הקיים (`web/src/data/destinationTags.js` — אותו תיוג ששירת את כפתורי הסינון
בעמוד הבית, לא מערכת תיוג נפרדת). המחיר-לאדם מחושב מ-טיסה+מלון אמיתיים בלבד, בדיוק כמו
`core/packages/packageEngine.js`. מתעדכן כל 30 דק' (`VIBE_FEED_INTERVAL_MINUTES`, ירד מ-4
שעות לפי הנחיה מפורשת — ~64 קריאות Travelpayouts/שעה נוספות, בנוסף לסריקת המסלולים, עם
אזהרת לוג אם זה אגרסיבי מדי), נשמר בטבלת
`vibe_feed_cards`, מוגש ב-`GET /api/deals/feed?vibe=X&lang=Y` (X = `all` או אחד מ-4 הווייבים).

**"ויסות מחירים" — `totalPrice`/`pricePerPerson` הם כבר source-of-truth יחיד**: לא הוספתי
מחירי SIM/רכב מומצאים (₪15/₪40 קבועים) לסכום — אין לנו מחיר אמיתי לרכיבים האלה (Travelpayouts
לא חושף מחיר רכב/eSIM, רק לינק), אז הם **לא** נכנסים ל-total. `DealBreakdown.jsx` (component
משותף, גם בגריד וגם בפיד) מציג רק שורות עם מחיר אמיתי — בדיוק העיקרון שכבר היה ב-README הזה
תחת "בנה חבילה" מאז ההתחלה.

### "מחירים לא תואמים" — ה-root cause שנמצא ותוקן

חיפשתי במפורש (לא הנחתי) דרך כל שלושת המקורות שהוזכרו: `sources/travelpayouts.js` שואל
`currency: 'usd'`, `sources/hotellookClient.js` שואל `currency: 'usd'`, `card.currency` מוגדר
`'USD'` ב-`vibeFeedEngine.js`, וכל מקום שמציג מחיר (`DealBreakdown`, `DealCard` וכו') מציג
`{currency}` שמגיע מאותו מקור — **שלושת ה"מקורות" באמת מסכימים, אין שלוש "אמיתות" מתחרות**.

הבאג האמיתי היה ב-`buildHotelUrl` (`packageLinks.js`): הלינק ל-Hotellook ביקש `currency=ILS`
(לפי הנחיה מפורשת מסבב קודם) בזמן שכל מה שאנחנו מציגים בעצמנו הוא USD — משתמש היה רואה
"Total: 540 USD" אצלנו, ואז "540 ₪" אחרי שלוחץ (אותו מספר, מטבע אחר, נראה כמו דיל שונה).
תוקן ל-`currency=USD`, ואישרתי ב-`curl -L` שזה שורד את כל שרשרת ה-redirect עד הדף הסופי.

**באג שני, חשוב יותר, שנמצא בבדיקה**: `https://hotellook.com/search?...` (הדומיין שהיה כאן,
גם הוא לפי הנחיה מפורשת) **לא reachable בכלל** — נבדק עם `curl`, אין שום תגובה. הפורמט הנכון
שעובד בפועל: `https://search.hotellook.com/?marker=X&destination=Y&checkIn=Z&checkOut=W&
adults=2&currency=USD` — אישרתי ב-`curl -L` ש-302 ל-`hotels-api.aviasales.ru` (עם ה-marker)
ואז 302 ל-`sp.booking.com` (`selected_currency=USD` מאושר בתשובה) ואז landing סופי ב-
`www.booking.com/searchresults.html`. שרשרת redirect אמיתית ועובדת, לא ניחוש. תוקן ב-`buildHotelUrl`.

### 🔴 ממצא קריטי: ה-Hotellook **price API** (לא ה-deep link) לא פעיל בכלל

זה משהו אחר מהלינק ל-`search.hotellook.com` מעלה (שעובד) — `sources/hotellookClient.js`
משתמש ב-API **נפרד** (`engine.hotellook.com/api/v2/cache.json`) כדי למשוך **מספר** (מחיר
מלון בפועל) שמתחבר ל-totalPrice. בדקתי אותו ב-`curl` בפועל — **404 מ-CloudFront על כל path,
כולל ה-root** ("Error from cloudfront" ב-header, לא Unauthorized שהיה מצביע על חוסר token).
זה domain שאין לו backend מאחוריו, כלומר ה-API הזה כבר לא קיים.

**המשמעות**: `totalPrice`/`pricePerPerson` בפועל היום הם **flight-only** לכל דיל — לא בגלל
בעיה בלוגיקת השילוב (`vibeFeedEngine.js` כבר נכון: `total = flight + hotel` רק אם hotel
נמצא), אלא בגלל שמקור הנתונים עצמו שבור. תיקנתי את הטיפול בכשלון (היה bug שבו ה-404 הראשון
בלבד טופל בעדינות, וכל ה-404-ים הבאים זרקו שגיאה בכל זאת — עכשיו כולם מטופלים בעדינות, אזהרה
אחת בלוג ולא spam). **לא הומצא תחליף** — אין לי מקור אמיתי למחיר מלון כרגע. אם יש לכם
endpoint/API key מעודכן של Hotellook, או חשבון Booking.com Affiliate אמיתי, זה המקום הראשון
לחבר אותו (`sources/hotellookClient.js`).

**בדקתי שוב ב-curl** (לא הסתפקתי בזיכרון מהבדיקה הקודמת) — אותה תוצאה מדויקת, 404 מ-CloudFront.
הוספתי `hotelBreakfastIncluded` ל-`hotellookClient.js`'s shape: `null` במכוון (לא ידוע אם/איך
תשובה אמיתית תחזיר את זה) — ה-UI מציג "פרטים באתר" כש-null, ומציג "כולל ארוחת בוקר" רק אם
זה במפורש `true`. גם `hasCarRentalOption` נוסף — לא תלוי ב-Hotellook (זה לינק רכב נפרד), אז
זה כן מוצג כש-`TRAVELPAYOUTS_CAR_RENTAL_URL_TEMPLATE` מוגדר, גם על השקף הראשי (לא רק במודאל).

**השקף עצמו ("Bottom Line") נקי**: יעד, שורת טיסה+מלון קצרה אחת, מחיר כולל בולט אחד, ו-UI
נקי עם **כפתור מרכזי אחד** ("הזמן את הטיול עכשיו"). ה-breakdown המפורט (icons, שורה לכל
רכיב) **לא** מוצג על השקף עצמו — רק בתוך `BundleModal.jsx`, אחרי לחיצה, כדי לא להעמיס.

לחיצה פותחת **מיד** את `BundleModal.jsx` (בלי אנימציית טעינה — זו בקשה מפורשת משני סבבים:
גם "בלי delay" וגם "modal עם breakdown+כפתורים", ששניהם מתיישבים יחד כל עוד ה-modal עצמו
נפתח instant). המודאל מציג `DealBreakdown`: ✈️ טיסה (מחיר אמיתי) + 🏨 מלון (מחיר אמיתי, אם
נמצא — נכון לעכשיו, **לא** נמצא, ראו הממצא הקריטי מעלה) + 🚗/📱 רכב/eSIM **בלי מחיר**, מתויגים
בבירור "הערכה — ראו מחיר בלינק" (לא ממציאים מספר). סה"כ = רק רכיבים עם מחיר אמיתי. הכפתורים
**כולם באותו צבע/עיצוב אחיד** (לא צבעוני לפי סוג, ראו "עיצוב מינימליסטי" למטה), מובחנים רק
ב-icon+label. לא בונה URL מומצא בסטייל `booking.com/checkout?hotel_id=...` — פותחים את לינקי
Aviasales/Hotellook **האמיתיים** (`card.flightBookingUrl`/`card.hotelBookingUrl`, כבר עם
ה-marker), עם `console.log` של כל URL לדיבוג.

**`UrgencyBanner.jsx` — דחיפות אמיתית, לא "X חדרים נותרו"**: המפרט המקורי ביקש "fake urgency
(אבל לא שקר)" — ניסוח שמתנגש בעצמו. בחרתי בגרסה שאפשר להגן עליה: "מחירי טיסות משתנים תוך
דקות" (עיקרון אמיתי וידוע, לא ספציפי לדיל) + **"מחיר נכון ל-HH:MM"** (שעון קבוע, לא "לפני X
דק'" — לפי בקשה מפורשת, בזמן המקומי של המשתמש via `toLocaleTimeString`) + הערת אמון "המחיר
הסופי מאומת אצל הספק". **לא** הוספתי טענת מלאי ("X חדרים נותרו") — `Hotellook`
(`sources/hotellookClient.js`) גם לא מחזיר נתון availability אמיתי (רק `priceFrom`, וגם
זה כרגע לא נגיש בכלל), אז אין לנו שום נתון שתומך בטענה כזו.

**אפקט "Live API Drop"**: מופיע פעם אחת לכרטיס (לא בלופ) אם `card.isGlitchDrop` (כל כרטיס
חמישי בערך). הטקסט הוא אפקט אווירה ("🔴 LIVE — דיל פעיל ברגע זה"), **לא** טוען טענת "ירידת
מחיר X%" או "נשארו X חדרים" — אין לנו נתון היסטוריה אמיתי לכרטיסי הפיד (בניגוד ל-anomaly)
שיתמוך בטענה כזו, ולא ממציאים אותה.

### עיצוב מינימליסטי — לא "AI-looking"

לפי הנחיה מפורשת ("לא AI, מקצועי וברור"), הוסרו שני אלמנטים שנראו "אקראיים/אמנותיים":
- **gradient לפי-יעד (hue rotation)** בכל כרטיס (`DealCard.jsx`, `PackageCard.jsx`,
  `DealSlide.jsx`) — כל יעד קיבל צבע אקראי-לכאורה (`hsl` מבוסס hash). הוחלף ברקע כהה אחיד
  (`--gradient-card`/`--color-heatmap-bg`, אותם משתנים שכבר היו ב-theme.css) — נראה מכוון,
  לא "דמו AI צבעוני".
- **כפתורי `BundleModal` בארבעה צבעים** (כחול/ירוק/כתום/סגול, אחד לכל סוג רכיב) — הוחלף
  בעיצוב אחיד אחד (`--gradient-accent`, צבע המותג הקיים) לכל הכפתורים, מובחנים רק ב-icon+label.

### תיקונים לפי צילום מסך אמיתי (רודוס)

- **היררכיית מחיר**: לפני — מחיר-לאדם וסה"כ דחוקים בשורה אחת ("284 USD · 142 USD לאדם").
  אחרי — שתי שורות נפרדות: מחיר-לאדם גדול ובולט (`deal-slide__price-per-person`), סה"כ-לקבוצה
  קטן מתחתיו (`deal-slide__price-total`) עם תג "טיסה + מלון". סימן מטבע קצר (`$`/`₪`,
  `web/src/utils/currency.js`) במקום הטקסט המלא "USD".
- **"מה כלול"**: שורת ✈️ עם תאריכים אמיתיים (`formatShortDate`) ומספר חניות, ושורת 🏨 עם שם
  מלון+כוכבים+לילות — רק כשיש מחיר מלון אמיתי (כרגע אין, ראו הממצא הקריטי על Hotellook מעלה).
  מוצג **מעל** המחיר, לא רק תוך כדי לחיצה.
- **וידאו לא-קשור ליעד (Rhodes קיבל מבנה תעשייתי)**: ה-query ל-Pexels היה רק שם העיר
  ("Rhodes travel"). עכשיו `media/vibeQueryTerms.js` מוסיף הקשר לפי הווייב — `"Rhodes beach
  landscape ocean coastline"` עבור ווייב חוף, `"... city aerial skyline downtown"` עבור
  אורבני וכו'. אישרתי במוק אמיתי (לא רק קוד) שזה ה-query שבאמת נשלח. **לא** הוספתי vibe
  לחיפוש התמונה (Pexels/Unsplash) — ה-cache שלה משותף לכל הווייבים לפי `iataCode` בלבד (גם
  הגריד משתמש בו), אז הוספת vibe לשם הייתה מזהמת בין ווייבים (היעד הראשון שמבקש תמונה
  "קובע" אותה לכולם). וידאו אין לו cache משותף כזה — לכל ווייב/יעד יש URL נפרד משלו ב-DB.
- **קריאות הטקסט**: ה-gradient מאחורי הטקסט היה דק/לא מספיק כהה. עכשיו 5 עיגונים (לא 3),
  כיסוי כהה יותר מוקדם יותר (15% ולא 25%), ו-`text-shadow` חזק יותר על כל שורת טקסט.
- **RTL**: בדקתי — אין שום `text-align`/`left`/`right` קשיח ב-CSS החדש, רק מאפיינים לוגיים
  (`inset-inline`), אז כיוון העברית עובד נכון בלי קוד מיוחד.

### וידאו + תמונה + מוזיקה רקע — שרשרת fallback, בלי המתחה לקרוס

בלי שום מפתח: הפיד עובד מלא עם רקע כהה אחיד (`--color-heatmap-bg`) + פעימת motion עדינה
במקום וידאו/תמונה, ובלי מוזיקת רקע. עם מפתחות:
- **`RUNWAY_API_KEY`** (`media/videoResolver.js`) — וידאו AI-generated. ⚠️ לא מאומת מול
  תשובת API אמיתית, אין מפתח Production לבדוק — אם הפורמט בפועל שונה, זה המקום הראשון לתקן.
- **`PEXELS_API_KEY`** — וידאו אנכי אמיתי של היעד (`orientation: portrait`, quality `sd` כדי
  לחסוך bandwidth) + `poster` frame להצגה מיידית לפני שהוידאו נטען, **וגם** תמונה (`media/photoResolver.js`)
  שמוצגת מעל ה-gradient (opacity 0.7) כשאין וידאו — שתי קריאות API נפרדות (`/videos/search`
  ו-`/v1/search`), לא אינטגרציה אחת.
- אם Pexels לא משיג תמונה (או שאין `PEXELS_API_KEY`), `photoResolver.js` נופל ל-Unsplash
  (`UNSPLASH_ACCESS_KEY`) — **משתמש מחדש** ב-`images/destinationImageService.js` הקיים
  (כולל ה-cache שלו ב-MySQL), לא אינטגרציה כפולה.
- **`MUBERT_API_KEY`** (`media/musicResolver.js`) — מוזיקת רקע AI לפי ווייב. ⚠️ גם זה לא מאומת.
- **`AWS_S3_BUCKET`/`CLOUDINARY_URL`** (`media/cloudStorage.js`) — stub שקוף, לא מיושם בפועל
  (מחזיר את ה-URL המקורי כמו שהוא) עד שתאשרו איזה provider — אין credentials לבדוק נגדו.

**מה שכן מאומת**: הזרימה המלאה דרך MySQL אמיתי + HTTP אמיתי, עם Pexels (וידאו+poster+תמונה)
ו-Travelpayouts/Hotellook מדומים — אישרתי שה-quality שנבחר לוידאו הוא `sd` (לא הקובץ הראשון
שמוחזר, שיכול להיות 4K), ושה-poster/photo מתמלאים מהשדות הנכונים בתשובת Pexels. גם ה-fallback
ל-`null` (לא URL מומצא) כש-Runway/Pexels/Mubert לא מוגדרים נשאר מאומת מסשן קודם.

**`PEXELS_API_KEY` עצמו**: אני לא יכול להגדיר משתני סביבה ב-Railway בעצמכם — זה משהו שעליכם
לעשות ב-Railway Variables (Settings -> Variables בשירות שלכם). הקוד קורא את המשתנה נכון
ומפעיל את האינטגרציה אוטומטית ברגע שהוא קיים, בלי deploy נוסף מעבר לרסטרט הרגיל.

### Bottom Nav פרימיום + מסך מעבר לרכישה

- **אייקונים**: `lucide-react` (`Clapperboard`/`Plane`/`Sparkles`) במקום emoji — tree-shaking
  עובד נכון (רק 3 אייקונים נכנסים ל-bundle, לא כל הספרייה — אישרתי בגודל ה-build הסופי).
- **אינדיקטור פעיל זוהר** שזז בחלקות בין טאבים — Framer Motion `layoutId` ("shared layout
  animation": אלמנט עם `layoutId` זהה שנעלם במקום אחד ומופיע במקום אחר באותו רענון מאונפש
  אוטומטית בין שתי המיקומים, לא טריק ידני). אייקון פעיל מקבל גם spring scale עדין.
- **`--bottom-nav-height` עבר ל-`theme.css`** (היה כפול/לא-עקבי, מוגדר גם ב-`vibeFeed.css`)
  — משתנה אחד, לא תלות בסדר טעינת קבצי CSS. גם הוגדל מ-64px ל-70px (spacing נדיב יותר),
  וה-padding-bottom של `.deal-slide__overlay` מתחשב בו + שולי ביטחון, כדי שכפתור "הזמן
  עכשיו" יישאר ברור מעל ה-nav. הוסר גם `max-height:80vh`/`overflow-y:auto` מהאוברליי —
  אינטראקציה בין max-height קבוע לריפוד-תלוי-במשתנה יכולה לחתוך תוכן בלי שזה ברור למה;
  עדיף שהקופסה תגדל לפי תוכן בפועל (התוכן קצר מספיק שזה לא בעיה בפועל).
- **מסך מעבר לפני פתיחת לינק** (`PurchaseTransitionOverlay.jsx`): ~900ms קבוע, לא ספינר
  גנרי (אייקון `ShieldCheck` עם פעימה עדינה), עם הטקסט המדויק שצוין ("מעבירים אותך...",
  "המחיר הסופי מאומת אצל הספק" — משתמש חוזר ב-`priceTrustNote` הקיים). **שונה מהותית**
  מהגרסה שהוסרה בכוונה (קומיט קודם, "תיקון UX") — שם הטקסט היה "נועל את המחיר מול
  הספקים..." שמשתמע ממנו תהליך אקטיבי שלא קורה באמת (לא "נועלים" שום דבר, פשוט פותחים
  לינק). הטקסט הנוכחי הוא תיאור עובדתי של מה שקורה בפועל ("מעבירים אותך" — וזה באמת מה
  שקורה), אז זה לא חזרה על הבעיה שתוקנה, גם אם זה נראה דומה ברמת ה-UX.

## עקרון עיצוב: בלי סטטיסטיקות פנימיות למשתמש

העמוד מכוון כולו ללחיצה. אין תצוגה של מדדים תפעוליים כמו "כמה דילים נשלחו" או "כמה מסלולים
נסרקו" (אלו עדיין נגישים פנימית דרך `GET /api/stats`, פשוט לא מוצגים בעמוד). המונה "X דילים
בוערים עכשיו" על המפה נשאר — הוא נועד ליצור דחיפות/FOMO, לא לדווח על תפעול המערכת.

## מגבלות ידועות

- **Amadeus test environment**: מפתחות ה-free tier מחוברים לסביבת הטסט של Amadeus, שמכילה לעיתים
  מחירים/זמינות לא מדויקים לחלוטין לעומת ה-production API (בתשלום).
- **SCAN_INTERVAL_MINUTES=5 (ברירת מחדל)**: סריקה תכופה כל 5 דק' על ~40 מסלולים, עם 2 קריאות
  API למסלול (one-way + round-trip), זה כ-960 קריאות/שעה ל-Travelpayouts. אם המכסה שלכם נמוכה
  (tier חינמי), זה עלול לגרום ל-429 תכופים — העלו את המספר הזה אם זה קורה.
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
