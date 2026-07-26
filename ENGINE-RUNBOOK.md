# מנוע האיסוף — הרצה, עצירה, קריאת דוח

מסמך תפעולי לשלב 8. קורא לזה מי שבפועל מפעיל את המנוע — לא הסבר ארכיטקטורה (זה ב-DECISIONS.md
וב-comments בקוד עצמו).

## מצב נוכחי

- **`dry-run`** (כפתור "הרץ מנוע" בפאנל האדמין) עובד היום, תמיד מול אתרי בדיקה מקומיים
  (`engine/fixtures/`). לעולם לא נוגע באינטרנט האמיתי — אין שום פרמטר שמשנה את זה.
- **`live`** (`POST /api/admin/engine/run-live`) קיים בקוד אבל **מסרב לרוץ בלי `SEARCH_API_KEY`**.
  זו לא המלצה — זו בדיקה בקוד (`server/routes/admin.js`), מחזירה 503 בלי המפתח.
- אין שום cron/scheduler שמפעיל ריצה חיה אוטומטית. כל ריצה חיה דורשת קריאת API מפורשת.

## לפני ריצה חיה ראשונה

1. **קבל מפתח ל-`SEARCH_API_KEY`** — Brave Search API מומלץ (הכי פשוט, מפתח יחיד). Serper או
   Google Programmable Search Engine גם נתמכים (`SEARCH_PROVIDER=serper|google_cse`).
2. הגדר ב-Railway (או `.env` מקומי לבדיקה): `SEARCH_API_KEY`, ואופציונלית `ENGINE_MAX_COST_USD`,
   `ENGINE_MAX_PAGES` (מומלץ להגדיר את שניהם לפני כל ריצה חיה, כולל סבב הכיול הראשון).
3. ודא ש-`ENGINE_AUTO_PUBLISH_ENABLED` **לא מוגדר ל-`true`** (או שלא מוגדר בכלל — ברירת המחדל
   `false` היא הנכונה). כל עוד זה כבוי, **כל** נכס שנאסף — בכל ציון confidence — הולך לתור אישור
   ידני בפאנל האדמין ("נכסים לאישור") ולא מתפרסם לבד. זו הדרישה המפורשת להרצה הראשונה בפרודקשן.
4. (אופציונלי אך מומלץ) מלא `engine/discovery/seedSources.json` בקישורים אמיתיים ומאומתים
   לאתרי תיירות אזוריים/מועצות/מושבים שמפרסמים קישורי צימרים — הקובץ מגיע ריק בכוונה, כי כל
   URL שם ייסרק בפועל ברגע שריצה חיה מתחילה.
5. הרץ סנכרון מטריצת שאילתות (כפתור "סנכרן מטריצה" בפאנל, או `POST /api/admin/engine/queries/sync`)
   — לא חובה (הריצה בונה מטריצה בעצמה אם לא סונכרן), אבל נותן ראייה מראש על 1296 השאילתות.

## הפעלה

```
POST /api/admin/engine/run-live
Authorization: Bearer <admin token>
Content-Type: application/json

{ "roundSize": 20 }
```

- `roundSize` = כמה **אתרים** (אחרי סיווג, לא שאילתות) לסרוק בפועל בריצה הזו. זה המימוש של
  הכיול המדורג (8.4):
  - **סבב א׳:** `roundSize: 20`
  - **סבב ב׳:** `roundSize: 200` — רק אחרי שעברת ידנית על כל 20 התוצאות מסבב א׳ ואישרת איכות.
  - **סבב ג׳ (הרצה מלאה):** בלי `roundSize` (או `null`) — אבל גם אז, מומלץ בכל פעם batch של
    500 (השדה `ENGINE_MAX_PAGES` הוא הבלם בפועל — הגדר אותו ל-500 לפני כל ריצת סבב ג׳).
  - **אל תדלג על סבב:** אין שום דבר בקוד שאוכף את הסדר הזה — זו הוראת תפעול, לא נעילה טכנית.

מעקב:
```
GET /api/admin/engine/status
```
מחזיר `running`, `liveCost` (עלות LLM מצטברת בזמן אמת), `emergencyStopped`, ו-`latestRun`
(הריצה הנוכחית/האחרונה כולל `compliance_report`).

## עצירה

**עצירת חירום** (עוצרת לפני הבקשה הבאה, לא מיידית באמצע fetch שכבר החל):
```
POST /api/admin/engine/emergency-stop
```
גם זמין ככפתור "עצירת חירום" בפאנל האדמין, מופיע כל עוד `running: true`.

הדגל מתאפס אוטומטית כשמפעילים ריצה חדשה (dry-run או live) — אין צורך לנקות ידנית לפני ריצה
הבאה, אבל אפשר עם:
```
POST /api/admin/engine/emergency-stop/clear
```

**עצירה גם קורית אוטומטית** אם `ENGINE_MAX_COST_USD` או `ENGINE_MAX_PAGES` נחצים — בדוק
`compliance_report.stoppedEarly` בדוח הריצה (`'max_cost'` / `'max_pages'` / `'emergency_stop'` /
`null` אם הריצה הסתיימה באופן טבעי).

## קריאת הדוח

`GET /api/admin/engine/status` (הריצה האחרונה) או `GET /api/admin/engine/runs/:id` (ריצה ספציפית).
שדות מרכזיים ב-`compliance_report`:
- `domainsSkippedRobots` / `domainsSkippedBlocklist` / `domainsSkippedHardBlocked` — דומיינים
  שנדלגו ולמה
- `hardBlockedDomainsVerified` — הוכחה בפועל (לא רק הנחה) שרשימת ה-OTA/פלטפורמות עדיין נחסמת
- `descriptionOverlapChecks` — בדיקת 8 המילים לכל תיאור
- `imagesDownloaded` — צריך תמיד להיות 0
- `stoppedEarly` — ראה סעיף עצירה למעלה
- `llmCost` — עלות + מספר קריאות לריצה זו

נכסים שנוצרו/עודכנו: `properties_created` / `properties_updated` בשורש הדוח.
התפלגות confidence ותור אישור: `GET /api/admin/properties/review-queue` — כל עוד
`ENGINE_AUTO_PUBLISH_ENABLED=false`, זה כולל **כל** נכס שנאסף (לא רק confidence<60).

## כשמשהו נכשל

- **הריצה נתקעת ב-`running` הרבה זמן:** בדוק לוגים (`railway logs` / stdout מקומי) — סביר
  שתקלת רשת/robots.txt איטי. עצירת חירום היא הפתרון המיידי; היא תתפוס את הבדיקה בתחילת ה-fetch
  הבא (עד כמה שניות, לא מיידי לגמרי אם fetch בודד כבר באמצע).
- **`SEARCH_API_KEY is set but no valid provider could be created`:** בדוק ש-`SEARCH_PROVIDER`
  הוא אחד מ-`brave`/`serper`/`google_cse`, ושאם `google_cse` — גם `SEARCH_CSE_ID` מוגדר.
- **הרבה `domainsSkippedRobots`:** תקין, לא באג — חלק מהאתרים חוסמים לפי robots.txt וזה מכובד.
- **`properties_created: 0` על אף הרבה `domainsDiscovered`:** בדוק את `rejectedPages` בתשובת
  ה-pipeline (לא נשמר כרגע ב-DB, רק בתגובת ה-HTTP המיידית של הריצה עצמה — cost/extraction
  reasons יהיו שם).
- **חושדים שנכס פורסם בטעות בלי אישור:** בדוק ש-`ENGINE_AUTO_PUBLISH_ENABLED` באמת `false`
  ב-Railway Variables (לא רק ב-`.env.example`) — זו ההגנה היחידה נגד פרסום אוטומטי.

## הפצה למסד הפרודקשן (`engine/syncToProduction.js`)

המנוע רץ **מקומית בלבד** (Railway לא מתקין את Playwright בבנייה — זו החלטה מכוונת, ראו הערה
בקומיט 11.11/11.12: התקנת דפדפן ב-build מגדילה זמן/גודל דיפלוי משמעותית, ורצוי שלא להריץ
Chromium על אותו dyno שמגיש את האתר לגולשים). הדרך היחידה שנתונים שנאספו מקומית מגיעים
לפרודקשן היא הסקריפט הזה — סנכרון חד-כיווני **מקומי -> פרודקשן** בלבד (אף פעם לא ההפך).

**מה הוא עושה, בסדר הזה:**
1. גיבוי מלא (`mysqldump`) של מסד הפרודקשן ל-`backups/prod_backup_<timestamp>.sql`, **תמיד**,
   לפני כל כתיבה. אם הגיבוי נכשל או יוצא קטן מדי (<1KB) — הסקריפט עוצר לפני שהוא נוגע בפרודקשן.
2. שולף מהמקומי רק נכסים `source='auto'` עם `source_url` אמיתי, לא opted-out, לא hidden, לא
   deleted — ומסנן החוצה נתוני פיתוח/דמו (`example-*.co.il` מ-`scripts/seedDemoProperties.js`,
   `localhost` מריצות ה-dry-run של `engine/fixtures/`) לפי hostname, כדי שאף פעם לא יגיעו
   לפרודקשן בטעות.
3. לכל נכס, לפי `source_url` (מפתח הדה-דופ):
   - **לא קיים בפרודקשן** -> `INSERT` חדש, **תמיד** `status='unclaimed'`, `auto_review_status='pending'`,
     `owner_id=NULL` — בלי קשר למה שהיה מקומית. כולל שורת `property_units` תואמת.
   - **קיים, ועדיין לא נגע בו אף אדם בפרודקשן** (`status='unclaimed' AND auto_review_status='pending'
     AND owner_id IS NULL AND opted_out=0`) -> מרענן רק שדות תוכן (שם/תיאור/מחיר/תמונות/וכו'),
     **לא** נוגע ב-status/owner/review/units.
   - **קיים וכבר טופל בפרודקשן** (אדמין אישר/דחה/בעלים תבע בעלות) -> מדלג לגמרי, לא נוגע.
4. מדפיס דוח: כמה נוצרו / עודכנו / דולגו (קיים+טופל) / דולגו (fixture) / נכשלו.

**איך מריצים:**
```
PROD_MYSQL_URL=<production MySQL public proxy URL> node engine/syncToProduction.js
```
או, שמרו את זה פעם אחת בקובץ `.env.production.local` (כבר ב-`.gitignore`, אף פעם לא נדחף):
```
PROD_MYSQL_URL=mysql://root:PASSWORD@HOST.proxy.rlwy.net:PORT/railway
```
לקבל את ה-URL הזה (ה-public proxy, לא `MYSQL_URL`/`MYSQLHOST` הפנימיים שרק Railway יכול להגיע
אליהם): `railway variables --service MySQL --kv | grep MYSQL_PUBLIC_URL` (דורש `railway login`
מקומי מחובר לפרויקט — כבר מוגדר בסביבה הזו דרך ה-CLI ב-`~/.npm/_npx/.../railway`).

הרצה בטוחה לחלוטין לחזור עליה — `source_url` הוא מפתח הדה-דופ, ריצה שנייה על אותם נתונים פשוט
תדלג על מה שכבר קיים (או תרענן תוכן אם עדיין לא טופל בפרודקשן).

## מה שעדיין ידני/לא בנוי

- **רענון תקופתי (8.7)** — `engine/refresh.js` בנוי (מעקב כשלונות, סימון `inactive` אחרי 3
  כשלונות רצופים) אבל **אין** cron שמפעיל אותו. תפעול: להריץ ידנית מתי שרוצים (route ל-"הרצה
  בפועל" של הרענון לא נבנה עדיין — רק `GET /api/admin/engine/refresh-candidates` שמראה מי
  ה-candidates, בלי לגעת ברשת). אם רוצים רענון אוטומטי שבועי, זה שלב נפרד שדורש אישור מפורש
  (זו בדיוק "הרצת המנוע על אתרים אמיתיים" ללא השגחה).
- **`SeedSourceProvider`** (`engine/discovery/seedSourceProvider.js`) בנוי ומוכן, אבל
  `engine/discovery/seedSources.json` ריק — למלא אותו לפני שהוא תורם משהו.
- **קישורים יוצאים מאתר שכבר נסרק** (`collectOutboundLinks` ב-`discoveryEngine.js`) — הפונקציה
  קיימת ונבדקה, אבל **לא מחוברת** אוטומטית ללולאת ה-pipeline הראשית (כדי לא לסכן את הערבות
  "dry-run אף פעם לא נוגע באינטרנט" — חיבור לא זהיר עלול לגרום ל-dry-run לנסות להביא HTML אמיתי
  מקישורים בתוך ה-fixtures). לשימוש עתידי: לקרוא לה ידנית מתוך ריצה חיה, לא מתוך `runPipeline`
  המשותף.
