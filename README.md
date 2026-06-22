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

## Vibe Feed (`/feed`) — פיד מסך-מלא בסטייל TikTok

מסך/route חדש **בנוסף** לעמוד הבית הקיים (לא מחליף אותו — `/` נשאר כמו שהיה: heatmap, רשת,
פילטרים, שאלון). `/feed` מציג שאלון-ווייב אחד (urban/beach/nature/romantic, 4 כפתורי ענק,
`web/src/vibe/VibeOnboarding.jsx`), ואז עובר ל-`/feed/:vibe` — פיד גלילה אנכית מלא-מסך
(scroll-snap טבעי של הדפדפן, לא ספריית swipe חיצונית — זה מה שנותן גלילה חלקה בלי lag).

**הנתונים אמיתיים, לא דמה**: כל כרטיס בפיד (`core/vibes/vibeFeedEngine.js`) הוא חיפוש טיסה
הלוך-חזור אמיתי (Travelpayouts) + מלון אמיתי (Hotellook, best-effort) ליעד שמתאים לווייב לפי
התיוג העורכי הקיים (`web/src/data/destinationTags.js` — אותו תיוג ששירת את כפתורי הסינון
בעמוד הבית, לא מערכת תיוג נפרדת). המחיר-לאדם מחושב מ-טיסה+מלון אמיתיים בלבד, בדיוק כמו
`core/packages/packageEngine.js`. מתעדכן כל 4 שעות (`server/index.js`), נשמר בטבלת
`vibe_feed_cards`, מוגש ב-`GET /api/deals/feed?vibe=X&lang=Y`.

**"נעל את הדיל"**: לא בונה URL מומצא בסטייל `booking.com/checkout?hotel_id=...` (אין לנו
גישת API ל-Booking.com, רק לינקי Travelpayouts/Hotellook) — האנימציה (טעינה 2 שניות +
קונפטי, `web/src/vibe/LockDealOverlay.jsx`) מסתיימת בפתיחת הלינקים **האמיתיים** של Aviasales
ו-Hotellook עם התאריכים/יעד כבר ממולאים — זה השווה-ערך האמיתי ביותר ל"הכל מוכן" שיש לנו.

**אפקט "Live API Drop"**: מופיע פעם אחת לכרטיס (לא בלופ) אם `card.isGlitchDrop` (כל כרטיס
חמישי בערך). הטקסט הוא אפקט אווירה ("🔴 LIVE — דיל פעיל ברגע זה"), **לא** טוען טענת "ירידת
מחיר X%" או "נשארו X חדרים" — אין לנו נתון היסטוריה אמיתי לכרטיסי הפיד (בניגוד ל-anomaly)
שיתמוך בטענה כזו, ולא ממציאים אותה.

### וידאו + מוזיקה + תמונות רקע — שרשרת fallback, בלי המתחה לקרוס

בלי שום מפתח: הפיד עובד מלא עם gradient+motion CSS במקום וידאו/תמונה, ובלי מוזיקת רקע. עם מפתחות:
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
