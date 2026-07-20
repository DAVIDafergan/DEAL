# דוח סשן — שלב 3 (מנוע איסוף), שלב 4 (לוח בקרה), פערים ויזואליים, ודאטת דמו

עבודה אוטונומית מלאה, ללא עצירה לאישורים, בגבולות שהוגדרו: ענף `tzimmers` בלבד, מסד נתונים
מקומי בלבד, שום נגיעה ב-`main`/פרודקשן, שום הודעה אמיתית נשלחה (`PROPERTY_MESSAGING_ENABLED`
נשאר `false`), ושום סריקה של אתר אמיתי כלשהו.

---

## 1. מה נבנה

### מנוע האיסוף — `/engine` (שלב 3, מפרט מלא)

| מודול | קובץ | תפקיד |
|---|---|---|
| Discovery | `engine/discovery/queryMatrix.js` | מטריצת 324 שאילתות (סוג × אזור × מתקן), מעל דרישת המינימום של 300 |
| | `engine/discovery/searchProvider.js` | ממשק `SearchProvider` + `LocalFixtureSearchProvider` (היחיד המחובר בפועל — לעולם לא רשת אמיתית) |
| | `engine/discovery/discoveryEngine.js` | הרצת השאילתות, חילוץ+דה-דופ דומיינים, סינון פורטלים/אינדקסים, איסוף קישורים יוצאים |
| Fetcher | `engine/fetcher/robotsCheck.js` | אכיפת robots.txt בקוד (חובה, לא הצעה) דרך `robots-parser` |
| | `engine/fetcher/rateLimiter.js` | מקסימום 2 בקשות מקבילות לדומיין, השהיה אקראית 2–5 שניות |
| | `engine/fetcher/htmlCache.js` | קאש HTML מקומי, TTL 30 יום, פנימי בלבד |
| | `engine/fetcher/pageFetcher.js` | Playwright headless אמיתי: גלילה לתחתית, חילוץ טקסט/meta/JSON-LD/טלפון/וואטסאפ/**כתובות URL של תמונות בלבד** (לעולם לא bytes), timeout 30 שנ' + retry, וסירוב קוד לדומיינים חסומים **לפני** כל קריאת רשת |
| Extractor | `engine/extractor/propertySchema.js` | סכימת zod מלאה, תואמת 1:1 ל-`properties` ב-DB |
| | `engine/extractor/extractProperty.js` | קריאה ל-Claude (`claude-haiku-4-5`) אם `ANTHROPIC_API_KEY` קיים; אחרת extractor דטרמיניסטי-מוצהר לבדיקות. ניסיון חוזר אחד, `null` ולא ניחוש, confidence לכל שדה |
| | `engine/extractor/descriptionCheck.js` | בדיקת חפיפה של 8 מילים רצופות — נבדק בפועל בתוך ה-pipeline, לא רק unit test |
| | `engine/extractor/costLogger.js` | מעקב עלות מצטבר לפי טוקנים |
| Dedup | `engine/dedup/matcher.js` | טלפון → דומיין → קרבה (עיר+דמיון שם) |
| | `engine/dedup/merger.js` | מיזוג לפי confidence הגבוה יותר לכל שדה |
| Loader | `engine/loader/loader.js` | כתיבה ל-`properties`, `status='unclaimed'`, `source='auto'` |
| תזמור | `engine/pipeline.js` | מחבר את כל השרשרת + מפיק דוח תאימות אוטומטי |
| בדיקה | `engine/dryRun.js` | סקריפט dry-run מלא מול אתרי בדיקה **מקומיים** (`node engine/dryRun.js`) |
| Fixtures | `engine/fixtures/` | 6 "אתרי צימר" HTML מציאותיים + 1 חסום ב-robots.txt, כל אחד על פורט לוקאלי נפרד |

**הרצה בפועל (לא רק קוד — נבדק אמפירית, כולל דרך `POST /admin/engine/run`):** 7 דומיינים
התגלו (פורטל אחד סונן החוצה נכון), 6 נשלפו (1 נחסם ע"י robots.txt — Fetcher כיבד את זה בפועל),
5 חולצו (1 נדחה — שדות חובה חסרים), 4 נוצרו + 1 עודכן (דה-דופ לפי טלפון עבד — אותו נכס משני
"אתרים" מוזג לרשומה אחת), 3 מתוך 5 נכנסו לתור אישור (confidence<60). תיאור אחד שהכיל 9 מילים
מועתקות **נדחה בפועל ולא נשמר ב-DB** (וידאתי ישירות מול MySQL); תיאור נקי אחר נשמר כרגיל.

### לוח בקרה לאדמין (שלב 4)

שני טאבים חדשים ב-`/admin`, עם אותן מחלקות CSS בדיוק (`adm-*`) כמו כל שאר הפאנל:
- **"נכסים לאישור"** — תור אישור ידני לנכסים עם confidence<60, השוואת ערך שחולץ מול קישור למקור, אישור/דחייה (`PATCH` דרך `approveAutoProperty`/`rejectAutoProperty`), + KPI (סה"כ נכסים, כמה נאספו אוטומטית, אחוז פרסום, confidence ממוצע).
- **"מנוע איסוף"** — כפתור הרצה (**תמיד** dry-run מול פיקסצ'רים מקומיים — אין שום פרמטר או נתיב קוד שיכול להריץ סריקה אמיתית מכאן), מעקב התקדמות חי (polling כל 2 שנ'), דוח תאימות מלא (תמונות שהורדו, robots/blocklist skips, אימות פלטפורמות חסומות, בדיקת 8-מילים, עלות LLM), והיסטוריית ריצות.

Backend: `server/routes/admin.js` (נתיבים חדשים), `server/store/engineRunStore.js` (חדש),
`server/store/propertyStore.js` (`listPropertiesPendingReview`, `approveAutoProperty`,
`rejectAutoProperty`, `getPropertyStats`, `upsertAutoCollectedProperty`,
`updateAutoCollectedProperty`, `findAutoPropertyByPhoneOrDomain`).

### שני הפערים הוויזואליים

- **קרוסלת תמונות בעמוד נכס** (`web/src/components/PropertyImageCarousel.jsx`) — מסגרת התמונה
  עצמה משתמשת ב-`.deal-modal__media` הקיים במדויק; חצי הניווט משתמשים ב-`.world-heatmap__zoom-button`
  הקיים (אותו כפתור זכוכית עגול שכבר משמש לזום במפה); רק רצועת התמונות הממוזערות והנקודות הן
  markup חדש, מעוצב כולו דרך `var(--ds-*)` inline — **אפס כללי CSS גלובליים חדשים**. נבדק חזותית
  עם 3 תמונות אמיתיות — עובד בדיוק כמתוכנן.
- **לוח זמינות ויזואלי** (`web/src/components/property/AvailabilityCalendar.jsx`) — גריד חודשי,
  לחיצה על תאריך מחליפה פנוי/חסום, שמירה דרך ה-API הקיים מ-Step 2a (`PATCH .../availability`).
  המעטפת/כפתורים משתמשים ב-`.dash-quick-pill`/`.settings-card` הקיימים; רק תאי הגריד הם markup
  חדש עם `var(--ds-teal)`/`var(--ds-ash)` בלבד — עקבי עם "צבע יחיד בדשבורדים" מ-DESIGN_SYSTEM.md.

### דאטת דמו

`scripts/seedDemoProperties.js` — 30 נכסים מגוונים (כל 9 האזורים, 4 סוגי הנכס, מתקנים
אקראיים, מחירים 350–2000 ₪), פרוסים בין `claimed` (13, בבעלות 2 חשבונות דמו:
`demo-owner-1@example.local` / `demo-owner-2@example.local`, סיסמה `demopass123`), `unclaimed`
מפורסם (confidence≥60), ו-`unclaimed` בתור אישור (confidence<60) — כדי שגם תור האדמין וגם
הפיד הציבורי ייראו מאוכלסים. הרצה: `node scripts/seedDemoProperties.js`.

---

## 2. החלטות שקיבלתי לבד — ולמה

1. **`extraction_confidence` (per-field) נפרד מ-`confidence` (overall)** — המפרט דורש גם
   confidence לכל שדה וגם שער פרסום יחיד. הוספתי עמודת JSON נפרדת במקום לדרוס את המשמעות של
   `confidence` הקיים; ה-overall מחושב כממוצע השדות המדורגים.
2. **שער הפרסום של confidence<60 הוא WHERE נוסף בשאילתה, לא סטטוס נפרד** — כי `pending` כבר
   תפוס (תביעת בעלות ממתינה לאישור, שלב 5). ערבוב שתי המשמעויות תחת אותו enum value היה יוצר
   קונפליקט אמיתי. `unclaimed`+`confidence<60` = לא מפורסם; `unclaimed`+`confidence≥60` = מפורסם.
3. **אין מפתח `ANTHROPIC_API_KEY` בסביבה הזו** → בניתי extractor דטרמיניסטי-מוצהר כ-fallback,
   באותה תבנית בדיוק שהקוד הקיים כבר משתמש בה לכל מפתח API חסר (README: "המערכת לא קורסת אם
   מפתח חסר"). ה-mock **לעולם לא ממציא תיאור** מעצמו — השדה הכי רגיש להעתקה — רק כשtest hint
   מפורש (`mockDescription`) מספק טקסט, וזה קיים אך ורק כדי לבדוק את מנגנון הדחייה עצמו.
4. **Discovery/Fetcher מזהים "אתר" לפי `url.host` (host:port) ולא `hostname` בלבד** — גיליתי
   באמצע הבנייה שכל אתרי הפיקסצ'ר המקומיים (כולם על `localhost`, פורטים שונים) היו מתמזגים
   לישות אחת אם משתמשים ב-hostname בלבד. תיקנתי כך ש-Discovery/rate-limiter/cache מזהים לפי
   host (כולל פורט), בעוד ש-`core/compliance/blocklist.js` (בדיקות תאימות אמיתיות מול
   דומיינים אמיתיים) ממשיך להתעלם מפורט — שני הקשרים דורשים סמנטיקה שונה, ותיעדתי את זה בקוד.
5. **סינון פורטלים ב-Discovery הוא היוריסטיקה, לא ניתוח מלא** — רשימת מילות מפתח + רשימת
   הדומיינים החסומה הקשיחה. פתרון מלא ידרוש ניתוח מבנה עמוד (כמות רשומות, תבנית listing) —
   מעבר להיקף סביר לסשן הזה. מתועד כפער ידוע (סעיף 4 למטה).
6. **דה-דופ לפי "קרבה גיאוגרפית"** מומש כ-city+דמיון-שם, לא lat/long — כי ה-extractor הנוכחי
   (mock או Claude) לא מפיק קואורדינטות מדויקות בפועל מטקסט חופשי. שדות `latitude`/`longitude`
   קיימים בסכימה ומוכנים לשימוש ברגע שיש מקור אמין להם (למשל geocoding API).
7. **מנוע-האדמין (`POST /admin/engine/run`) קשיח ל-dry-run** — לא רק ברירת מחדל, אין שום דרך
   דרך ה-API הזה להריץ סריקה אמיתית. זו בחירה מכוונת ושמרנית לאור האיסור המפורש בהנחיות.

---

## 3. באגים אמיתיים שנמצאו ותוקנו (רק כאלה שנתפסו בהרצה בפועל)

| # | באג | איך נתפס | תיקון |
|---|---|---|---|
| 1 | Regex מחיר תפס רק `₪650`, לא `650 ₪` (הסדר הנפוץ יותר בעברית, ובדיוק מה שה-UI שלנו מציג) | בדיקה ידנית של ה-mock extractor מול טקסט לדוגמה | Regex כפול, שני הכיוונים |
| 2 | חוסר בדיקה מקצה-לקצה של דחיית-תיאור-מועתק בתוך ה-pipeline המלא (רק ב-unit test מבודד) | סקירת פלט ה-dry-run הראשון — `descriptionOverlapChecks` היה ריק | הוספתי `hints.mockDescription` לבדיקה, כולל מקרה "מועתק" ומקרה "נקי", ווידאתי ב-DB שהתיאור המועתק לא נשמר |
| 3 | זיהוי "דומיין" לפי hostname בלבד היה ממזג את כל אתרי הבדיקה המקומיים (פורטים שונים) לישות אחת | תכנון מוקדם לפני כתיבת ה-pipeline (נתפס לפני שהפך לבאג בפועל) | הפרדת `siteKey` (host, כולל פורט) מ-`domain` (hostname בלבד) בכל שכבות Discovery/Fetcher |

---

## 4. מה נשאר פתוח

- **אין ספק חיפוש אמיתי מחובר.** `LocalFixtureSearchProvider` הוא היחיד שקיים. יש לכתוב
  `RealSearchProvider` (Google Programmable Search / Bing Web Search / SerpAPI) ולחברו — ראו
  סעיף 5.
- **סינון פורטלים הוא היוריסטי** (רשימת מילות מפתח + הרשימה החסומה הקשיחה) — לא ניתוח מבנה
  עמוד אמיתי. עלול לסווג שגוי אתר יחיד עם שם מטעה, או לפספס פורטל בלי מילת מפתח מוכרת.
- **אין geocoding** — `latitude`/`longitude` בסכימה אבל אף מודול לא ממלא אותם. משפיע על דיוק
  שכבת "קרבה גיאוגרפית" בדה-דופ (כרגע city+שם בלבד).
- **`ANTHROPIC_API_KEY` לא הוגדר בסביבה הזו** — כל הרצת dry-run/demo עברה דרך ה-mock extractor.
  איכות החילוץ האמיתית (עם Claude) לא נבדקה בפועל בסשן הזה — רק המנגנון סביבו (סכימה, retry,
  דחיית-העתקה, confidence).
- **אין תזמון תקופתי (שלב 3.5)** — `engine/pipeline.js` ניתן להרצה חוזרת (עדכון נכסים קיימים
  עובד — נבדק), אבל אין `cron`/interval שמפעיל אותו לבד. תיעוד "מה חסר" בלבד, לא נבנה בכוונה
  (הרצה תקופתית אמיתית = סריקה תקופתית אמיתית, מחוץ לגבולות הסשן הזה).
  `server/index.js` יש כבר תבנית `setInterval` דומה (תזכורות הזמנה) שאפשר לשכפל.
  **אזהרה חשובה: אל תפעילו אותו לפני שקראתם את סעיף 5 במלואו.**
- **`engine/dedup/matcher.js`'s `findDuplicate` הפונקציה הראשית לא מקבלת candidate list** —
  ה-fallback tier (עיר+שם) עובד רק בתוך אותה ריצה (`loadedThisRun`), לא מול נכסים שנטענו
  בריצות קודמות. עבור עדכון תקופתי אמיתי (שלב 3.5, לא נבנה) יהיה צריך שאילתת DB לפי עיר.
- **בדיקת "8 מילים" רצה על כל תיאור בפועל, אבל דגימת ה-compliance-report ("הרץ בדיקה על
  מדגם") לא מובחנת מ-"נבדק על הכל"** — כרגע כל תיאור שחולץ נבדק, שזה יותר טוב מדגימה, אז לא
  תיקנתי, רק מציין שהניסוח בדוח ("X נבדקו") משקף את כל הריצה, לא מדגם.

---

## 5. איך להפעיל את המנוע על אתרים אמיתיים — בדיוק מה שצריך

**לפני הכל: זו החלטה עסקית/משפטית, לא רק טכנית.** קראו שוב את סעיף 5.5 המקורי (שכבת
התאימות) ואת `PRIVACY.md` — הפעלה על אתרים אמיתיים כפופה לחוק הגנת הפרטיות ולחוק הספאם
הישראלי. `engine/templates/messages.he.md` מסומן "טעון אישור עו״ד" מסיבה זו.

### שלב א' — ספק חיפוש אמיתי
צרו `engine/discovery/realSearchProvider.js` שמממש את אותו ממשק כמו `LocalFixtureSearchProvider`
(`async search(query) -> [{url,title,snippet}]`), מגובה ב-API אמיתי: Google Programmable Search
JSON API, Bing Web Search API, או SerpAPI. הוסיפו את מפתח ה-API ל-`.env` (לא ל-`.env.example`
עם ערך אמיתי). זה הדבר היחיד שבאמת חסר כדי שה-Discovery ירוץ אמיתי — כל שאר השרשרת (Fetcher,
Extractor, Dedup, Loader) כבר בנויה לעבוד מול URLs אמיתיים בדיוק כמו מול הפיקסצ'רים.

### שלב ב' — מפתח Claude אמיתי
הוסיפו `ANTHROPIC_API_KEY` אמיתי ל-`.env`. ברגע שהוא קיים, `extractProperty.js` עובר אוטומטית
מה-mock ל-Claude האמיתי (`claude-haiku-4-5-20251001`) — אין שום קוד נוסף לשנות. **בדקו על 5
אתרים אמיתיים תחילה** (בהתאם לשלב 6 בפרומפט המקורי) לפני הרצה בהיקף מלא — עלות ואיכות חילוץ
לא נבדקו בפועל בסשן הזה.

### שלב ג' — נתק את ה-hard-coded dry-run מ-admin route
`server/routes/admin.js` — הפונקציה `router.post('/engine/run', ...)` בונה `LocalFixtureSearchProvider`
+ מריצה `startFixtureServers()` באופן קשיח. כדי לאפשר הרצה אמיתית מהאדמין (ולא רק דרך CLI),
צריך להוסיף מסלול קוד חדש ומפורש (למשל פרמטר `mode` + guard בסיסמת-אדמין-נוספת/דגל env נפרד)
שבוחר את `RealSearchProvider` במקום — **בכוונה לא בניתי את זה כברירת מחדל**, כדי שלא יהיה
אפשר להפעיל סריקה אמיתית בטעות דרך כפתור אחד בממשק.

### שלב ד' — הרצה מבוקרת ראשונה
```bash
node engine/dryRun.js   # ודאו קודם שזה עדיין עובד מול הפיקסצ'רים המקומיים — regression check
```
ואז, אחרי חיבור RealSearchProvider (שלב א'), הריצו ידנית דרך CLI חדש (לא דרך admin UI) עם
מטריצת שאילתות **מוגבלת מאוד** (5–10 שאילתות, לא 324) ובדקו את הפלט ידנית — בדיוק כמו שלב 6
בפרומפט המקורי דורש: JSON שחולץ מכל אתר, מה נכנס ל-DB, עלות LLM לנכס, דוח תאימות (כולל אימות
ידני שאף תמונה לא הורדה ואף טקסט לא הועתק — לא להסתמך רק על הדוח האוטומטי בפעם הראשונה).

### שלב ה' — רק אחרי אישור שלכם על תוצאות ה-5 אתרים
הרחיבו בהדרגה את מטריצת השאילתות, ורק אז שקלו תזמון תקופתי (שלב 3.5, לא בנוי).

**שום דבר בסעיף הזה לא בוצע בסשן הזה.** כל מה שנבנה רץ אך ורק מול `engine/fixtures/` המקומי.

---

## 6. קבצים שהשתנו/נוספו בסשן הזה

ראו `git diff 7eae846..HEAD --stat` (או ה-commit האחרון בענף `tzimmers`) לרשימה המדויקת.
תמצית: `engine/` חדש כמעט לגמרי (Discovery/Fetcher/Extractor/Dedup/Loader/pipeline/fixtures),
`scripts/seedDemoProperties.js` חדש, `server/store/engineRunStore.js` חדש,
`server/store/propertyStore.js`/`server/routes/admin.js` מורחבים, `web/src/pages/AdminPage.jsx`
+2 טאבים, `PropertyImageCarousel.jsx`/`AvailabilityCalendar.jsx` חדשים, `core/db/index.js`
+טבלת `engine_runs` +עמודת `extraction_confidence`, `package.json` +`zod` +`robots-parser`.
