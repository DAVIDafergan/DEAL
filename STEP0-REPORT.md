# דוח שלב 0 — מיפוי הפרויקט לפני המרה לפלטפורמת צימרים

> נכתב לפני כל שינוי קוד. מטרתו: תמונת מצב מלאה של הפרויקט הקיים + טבלת מיפוי מלאה לעולם הצימרים.
> ראה גם הערת אזהרה בסוף הקובץ לגבי קונפליקט עם README הקיים (`אין web scraping בקוד הזה`).

---

## 1. Frontend — ספריות, ניתוב, מבנה תיקיות

**ספריות עיקריות** (`web/package.json`):
- `react` 18.3 + `react-dom` 18.3
- `react-router-dom` 6.30 — ניתוב client-side
- `framer-motion` 11.11 — כל האנימציות (מעברי שלבים בטפסים, reel feed, radar sweep)
- `lucide-react` — סט אייקונים יחיד בפרויקט כולו
- `react-simple-maps` + `world-atlas` — מפת החום (heatmap) של יעדי טיסות
- Build tool: **Vite 5** (`@vitejs/plugin-react`)
- **אין Tailwind, אין CSS-in-JS, אין ספריית קומפוננטות (MUI/Chakra/etc)** — הכל CSS רגיל עם custom properties. זה מפשט מאוד את שלב 2 (השינוי לא יכול "לדרוס" ספריית עיצוב כי אין כזו).

**ניתוב** — מוגדר במקום אחד: `web/src/main.jsx`.
```
BrowserRouter
├── <Route element={<PublicLayout />}>   ← header משותף
│   ├── /register                         RegisterPage (בחירה: traveler / agent)
│   ├── /register/traveler                TravelerRegisterPage
│   ├── /register/traveler/login          TravelerLoginPage
│   ├── /agent/register                   AgentRegisterPage
│   ├── /agent/login                      AgentLoginPage
│   ├── /agent/dashboard                  AgentDashboardPage
│   ├── /agent/dashboard/settings         AgentSettingsPage
│   ├── /agent/:slug                      AgentPublicProfilePage
│   ├── /my/favorites                     FavoritesPage
│   ├── /account                          AccountPage
│   ├── /terms /privacy /accessibility /contact
├── /admin                                AdminPage (layout נפרד, full-screen)
└── /*                                    AppShell (3 טאבים: deals reel / flights / plan)
```
שני `AuthProvider` עוטפים הכל: `AgentAuthProvider` (סוכנים) ו-`TravelerAuthProvider` (גולשים/end-users) — נפרדים לגמרי, טוקנים נפרדים ב-localStorage (`agent_token` מול טוקן משתמש).

**מבנה `web/src/`:**
```
api/client.js            עטיפת fetch יחידה ל-API (agentApi, וכו')
App.jsx                  טאב "טיסות" — heatmap + grid
AppShell.jsx              ה-shell עם 3 הטאבים (deals reel / flights / plan), header פנימי
components/               ~45 קומפוננטות UI כלליות (DealCard, FilterBar, Header, SiteFooter...)
  agent/                  AddDealForm, AgentDealCard, DealWizard (טופס רב-שלבי), OnboardingTour
  heatmap/                מפת החום + tooltip + radar sweep overlay
  questionnaire/           אשף "בנה לי חבילה" (טיסה+מלון מותאם אישית)
context/                  AgentAuthContext, TravelerAuthContext, LanguageContext, NowContext
data/                     נתוני עזר סטטיים (קואורדינטות שדות תעופה, שמות ערים, אזורי זמן)
hooks/                    useFavorites, useLiveDeal, useCountUp
i18n/translations.js      מילון תרגומים he/en/es
pages/                    15 עמודי route (ראה §2)
styles/                   theme.css, agentPortal.css, vibeFeed.css
utils/                    פורמט מטבע, פורמט טיסה, countdown, שיתוף וכו'
vibe/                     ה"רילס" — DealsTab, DealSlide, AgentDealSlide (feed גלילה אנכית)
```

---

## 2. מבנה התיקיות והדפים הקיימים (מלא)

**רמת שורש (backend + תשתית):**
```
core/
  db/index.js              pool MySQL + SCHEMA_STATEMENTS + MIGRATIONS (bootstrap אוטומטי)
  anomaly-engine/           Z-score על היסטוריית מחירי טיסות
  scanner/DealScanner.js    מחבר sources ↔ anomaly-engine, "Best Live Prices"
  validation/               dealValidator, liveDealBuilder
  vibes/vibeFeedEngine.js   מחולל "רילס" טיסה+מלון
  packages/                 packageEngine, packageDeps — בניית חבילות
  watchedRoutes.js
sources/                   אדפטרים למקורות API רשמיים בלבד (Amadeus, Travelpayouts, hotellook)
ai/                         נרטיב דיל ב-3 שפות דרך Claude (קריאה אחת)
distribution/               שליחה ל-Telegram + WhatsApp (שיווקי, לערוצים, לא טרנזקציוני)
media/                      photoResolver/videoResolver/musicResolver — Pexels/Unsplash/Runway,
                             cloudStorage.js — **בדיקה נדרשת בשלב 1** אם זה Cloudinary בפועל
server/
  app.js                    composition root: helmet, cors, rate limit, כל ה-routers, SSR meta-tags
  index.js                  bootstrap: DB connect (non-blocking) + app.listen()
  middleware/                agentAuth.js, adminAuth.js, userAuth.js, rateLimiter.js
  routes/                    deals, agents, admin, billing, images, packages, personalRadar,
                             stats, config, contact, music, users
  services/agentMediaService.js
  store/                     שכבת גישה ל-DB: agentStore, agentDealStore, dealsStore, packagesStore,
                             personalRadarStore, ratingStore, statsStore, userStore, vibeFeedStore
web/                        frontend (ראה §1)
```

**דפי `web/src/pages/` (15):**
| קובץ | route | תפקיד |
|---|---|---|
| `RegisterPage.jsx` | `/register` | מסך בחירה: נרשם כטראבלר או כסוכן |
| `TravelerRegisterPage.jsx` / `TravelerLoginPage.jsx` | `/register/traveler`, `/register/traveler/login` | הרשמה/כניסה של גולש קצה |
| `AgentRegisterPage.jsx` | `/agent/register` | טופס 2-שלבים אנימציה (framer-motion), Google OAuth אופציונלי |
| `AgentLoginPage.jsx` | `/agent/login` | אימייל+סיסמה, מפנה לדשבורד |
| `AgentDashboardPage.jsx` | `/agent/dashboard` | KPIs, רשימת דילים, DealWizard להוספה |
| `AgentSettingsPage.jsx` | `/agent/dashboard/settings` | עריכת פרופיל (autosave) |
| `AgentPublicProfilePage.jsx` | `/agent/:slug` | פרופיל ציבורי + כל הדילים המאושרים שלו |
| `FavoritesPage.jsx` | `/my/favorites` | מועדפים (session-based, לא דורש login) |
| `AccountPage.jsx` | `/account` | חשבון גולש |
| `AdminPage.jsx` | `/admin` | פאנל ניהול, סיסמה משותפת |
| `TermsPage.jsx` / `PrivacyPage.jsx` / `AccessibilityPage.jsx` / `ContactPage.jsx` | סטטיים/טופס | תוכן משפטי + יצירת קשר |

אין כרגע **עמוד נכס/דיל בודד** כ-route React (יש רק SSR meta-page ב-`/deal/:id` שמוזרק מהשרת ל-Googlebot — ה-React app עצמו פותח מודל `DealDetailModal` על גבי ה-feed, לא עמוד נפרד). זו נקודה חשובה לשלב 2: `PropertyPage` (claimed/unclaimed) כנראה צריך להיות route אמיתי, לא רק modal, כדי לתמוך ב-SEO ובקישור ישיר.

---

## 3. סכמת מסד הנתונים — מלאה

MySQL, מוגדר ב-`core/db/index.js`. Bootstrap אוטומטי בכל עלייה: `SCHEMA_STATEMENTS` (יוצר טבלאות אם לא קיימות) + `MIGRATIONS` (מערך של פונקציות `ensureColumn` שמוסיפות עמודות בעדינות לטבלאות קיימות — לא הורס נתונים).

### `deals` — טיסות שנסרקו אוטומטית (מהמקורות הרשמיים)
| שדה | טיפוס |
|---|---|
| id | VARCHAR(64) PK |
| type | VARCHAR(16) |
| origin, destination | VARCHAR(8) — קוד IATA |
| departure_date | DATE |
| price | DECIMAL(10,2) |
| currency | VARCHAR(8) |
| carrier | VARCHAR(8) |
| stops | INT |
| source | VARCHAR(32) |
| booking_url | TEXT |
| moving_average | DECIMAL(10,2) |
| z_score | DECIMAL(6,2) |
| enforcement_likelihood | INT |
| narrative_json | JSON |
| created_at, updated_at | DATETIME |
| **מיגרציות מאוחרות:** departure_at, arrival_at, duration_minutes (DATETIME/INT), return_date, return_departure_at, return_stops | |

### `agents` — סוכני נסיעות (הישות שהופכת ל"בעל צימר")
| שדה | טיפוס |
|---|---|
| id | INT PK AUTO_INCREMENT |
| slug | VARCHAR(128) UNIQUE — נוצר אוטומטית מ-business_name |
| business_name | VARCHAR(255) NOT NULL |
| contact_name | VARCHAR(255) NOT NULL |
| email | VARCHAR(255) UNIQUE NOT NULL |
| password_hash | VARCHAR(255) NOT NULL |
| phone | VARCHAR(32) |
| whatsapp_number | VARCHAR(32) |
| whatsapp_template | TEXT |
| license_number | VARCHAR(128) |
| logo_url | TEXT |
| description | TEXT |
| response_hours | VARCHAR(255) |
| preferred_currency | VARCHAR(8) DEFAULT 'USD' |
| status | ENUM('pending','approved','rejected') DEFAULT 'pending' |
| rejection_reason | TEXT |
| subscription_tier | ENUM('basic','pro','unlimited') DEFAULT 'basic' |
| subscription_status | ENUM('active','inactive','trial') DEFAULT 'trial' |
| subscription_expires_at | DATETIME |
| stripe_customer_id, stripe_subscription_id | VARCHAR(128) |
| lead_count | INT DEFAULT 0 |
| created_at, updated_at | DATETIME |
| **מיגרציות מאוחרות:** has_seen_onboarding (TINYINT), cover_url (TEXT), about (TEXT) | |

הערה: בפועל `createAgent` (`server/store/agentStore.js`) קובע `status='approved'` מיידית בהרשמה — אין תור אישור אמיתי לסוכנים חדשים כרגע (בניגוד למה שמשתמע מה-ENUM). שווה לוודא איתך אם זו התנהגות מכוונת שנשמרת גם לבעלי צימרים, או אם זה היה אמור להיות `pending`.

### `agent_deals` — דיל שסוכן פרסם (הישות שהופכת ל"נכס בבעלות")
| שדה | טיפוס |
|---|---|
| id | INT PK |
| agent_id | INT — FK → agents(id) ON DELETE CASCADE |
| destination | VARCHAR(8) |
| destination_name | VARCHAR(255) |
| country | VARCHAR(128) |
| video_url, photo_url | TEXT |
| departure_date | DATE NOT NULL |
| return_date | DATE |
| price | DECIMAL(10,2) NOT NULL |
| currency | VARCHAR(8) DEFAULT 'USD' |
| purchase_link | TEXT |
| whatsapp_override | VARCHAR(32) |
| is_exclusive | TINYINT(1) DEFAULT 0 |
| expires_at | DATE |
| description | TEXT |
| status | ENUM('pending','approved','rejected') DEFAULT 'pending' |
| rejection_reason | TEXT |
| quality_score, value_score | DECIMAL(5,2) |
| click_count | INT DEFAULT 0 |
| created_at, updated_at, approved_at | DATETIME |
| **מיגרציות מאוחרות:** airline (VARCHAR), includes_checked_baggage/includes_cabin_baggage/includes_meal (TINYINT), hotel_name (VARCHAR), hotel_stars (TINYINT), hotel_breakfast/hotel_lunch/hotel_dinner (TINYINT), car_type/car_company (VARCHAR), departure_time/arrival_time (VARCHAR(5)), hotel_link (TEXT), passenger_count (TINYINT DEFAULT 2), purchase_count (INT), purchased_at (DATETIME) | |

### שאר הטבלאות
| טבלה | תפקיד | שדות מרכזיים |
|---|---|---|
| `price_history` | סדרת זמן למחירי מסלול, מזין את ה-Z-score | route, date, price, scanned_at |
| `deals_sent` | לוג שליחות להפצה | savings_percent, sent_at |
| `packages` | חבילות טיסה+מלון (שאלון) | origin/destination, dates, nights, flight_*, hotel_*, total_price |
| `destination_images` | קאש URL תמונת יעד (Pexels/Unsplash) | iata_code PK, image_url, thumb_url, attribution, source |
| `vibe_feed_cards` | כרטיסי "רילס" | vibe, origin/destination, flight_*, hotel_*, video_url, music_url, is_glitch_drop |
| `users` | גולשי קצה (traveler) | name, email UNIQUE, password_hash (NULL-able — Google auth), auth_provider |
| `agent_ratings` | דירוג סוכן ע"י session | session_id, agent_id, rating (1-5), UNIQUE(session_id, agent_id) |
| `user_favorites` | מועדפים session-based | session_id, deal_id, deal_type |
| `contact_submissions` | טופס יצירת קשר | name, email, phone, message, is_read |

**חיבור DB** (`core/db/index.js`): pool מבוסס `mysql2/promise`, תומך גם ב-connection string מלא (`MYSQL_URL`/`DATABASE_URL`) וגם במשתנים נפרדים (Railway). `timezone: 'Z'` — כל DATETIME/DATE מטופל כ-UTC טהור. `decimalNumbers: true` — DECIMAL מוחזר כ-Number, לא string. השרת **לא נחסם** אם ה-DB עוד לא מוכן — מתחבר ברקע עם retry+backoff, ו-`app.listen()` עולה מיד.

---

## 4. מערכת האימות — מלאה, עם מיקום בקוד

**זרימת הרשמה (Agent):**
1. Frontend: `AgentRegisterPage.jsx` (טופס 2-שלבים, `useState` step 0/1/2, אנימציית slide עם framer-motion) → קורא ל-`agentApi.register()` (`web/src/api/client.js`) → `AgentAuthContext.register()` (`web/src/context/AgentAuthContext.jsx:29`).
2. Backend: `POST /api/agents/register` (`server/routes/agents.js:22`) — ולידציה בסיסית (business_name/email/password חובה, סיסמה ≥8 תווים), בדיקת אימייל כפול, `bcrypt.hash(password, 12)`, `createAgent()` (`server/store/agentStore.js:22`) שיוצר slug ייחודי אוטומטית מ-`business_name` (עם fallback לפרפיקס האימייל, ומספרים עוקבים אם יש התנגשות), status נקבע `'approved'` **מיידית** (לא תור אישור אמיתי כרגע).
3. `signAgentToken()` (`server/middleware/agentAuth.js:18`) — JWT עם `{agentId, status}`, secret מ-`JWT_SECRET` (fallback `'deal-radar-agent-secret'` ב-dev), תוקף 30 יום.
4. Frontend שומר את הטוקן ב-`localStorage['agent_token']`.

**זרימת התחברות:** `POST /api/agents/login` (`server/routes/agents.js:75`, מוגן ב-`authRateLimiter`) — `bcrypt.compare` מול `password_hash`, מנפיק אותו JWT. יש גם `POST /api/agents/google` — Google OAuth דרך `google-auth-library`, מאמת ID token, אם האימייל כבר קיים מתחבר ישירות, אחרת מחזיר `{isNew: true, email, name, picture}` כדי שה-frontend ישלים הרשמה.

**הרשאות (middleware):** `requireAgentAuth` (`server/middleware/agentAuth.js:3`) — קורא `Authorization: Bearer <token>`, מאמת JWT, שם `req.agentId`/`req.agentStatus`. כל route תחת `/me/*` מוגן בו.

**Admin — מערכת נפרדת לגמרי:** `requireAdminAuth` (`server/middleware/adminAuth.js`) — לא מבוסס משתמש/סיסמה פר-אדמין אלא **סיסמה משותפת אחת** (`ADMIN_PASSWORD` env) שמומרת ל-JWT עם `{role: 'admin'}` (secret **שונה**, ברירת מחדל `'deal-radar-jwt-secret-change-me'` — שים לב: זה secret אחר מזה של agentAuth, נקודה לתשומת לב אם ממזגים).

**Frontend context:** `AgentAuthContext.jsx` — `useState` על טוקן מ-localStorage, `useEffect` שמאמת מול `/agents/me` בעלייה, חושף `{token, agent, loading, login, register, logout, refreshAgent}` דרך hook `useAgentAuth()`.

**טראבלרים (`users`):** מערכת מקבילה ונפרדת — `TravelerAuthProvider`, `userAuth.js` middleware, תומכת גם Google OAuth (`auth_provider` column, `password_hash` NULL-able). לא רלוונטי ישירות ל"בעל צימר" אבל שווה לדעת שהיא קיימת ונפרדת.

**מסקנה לשלב 1:** ניתן להעתיק את כל מנגנון ה-Agent (routes, middleware, store, context, JWT) כמעט 1:1 ל-Owner, כולל שינוי שם טבלאות/שדות בלבד — אין צורך להמציא זרימת אימות חדשה, בדיוק כפי שהפרומפט המקורי ביקש.

---

## 5. מערכת העיצוב — מלאה

**קובץ טוקנים יחיד:** `web/src/styles/theme.css` (78 שורות, `:root` בלבד):
```css
/* משטחים */
--ds-void: #EEF0F3;   /* רקע עמוד */
--ds-ink: #FFFFFF;    /* כרטיסים/פאנלים */
--ds-slate: #F8FAFC;  /* elevated/hover */
--ds-ghost: rgba(0,0,0,0.06);

/* טקסט */
--ds-bone: #1E293B;   /* טקסט ראשי */
--ds-ash: #64748B;    /* משני/מושתק */

/* מותג */
--ds-amber: #f5a623;  /* מחירים */
--ds-coral: #ff4d6d;  /* דחיפות/מחיקה/שגיאה */
--ds-teal: #17c3b2;   /* חתימה — radar pulse, מצבים פעילים */

/* שכבת legacy (alias) לתאימות אחורה עם קומפוננטות קיימות */
--color-bg, --color-surface, --color-text-primary, --gradient-accent (כחול, לא הטיל/קורל!), וכו'

/* טיפוגרפיה */
--font-display / --font-latin: 'Plus Jakarta Sans', 'Outfit', system-ui
--font-hebrew: 'Noto Sans Hebrew', 'Plus Jakarta Sans', system-ui
--ts-hero/display/title/price/label/body/micro  (סקאלת גדלים)

/* מרווח/רדיוס/צל */
--radius-sm/md/lg: 10/16/22px
--shadow-card, --shadow-card-hover
--transition-base: 200ms cubic-bezier(0.4,0,0.2,1)
```
**חשוב:** ה-`DESIGN_SYSTEM.md` בשורש (שנקרא בדוח הקודם) מתאר קונספט "Midnight Souk" כהה — אבל `theme.css` בפועל מיושם ב-**ערכת נושא בהירה** (`--ds-void: #EEF0F3` אפור בהיר, לא `#07080f`). כלומר המסמך הוא ה-vision המקורי; היישום בפועל התפתח לגרסה בהירה יותר. **יש לעבוד לפי `theme.css` בפועל, לא לפי `DESIGN_SYSTEM.md`**, כשמריצים קומפוננטות חדשות.

**קבצי CSS נוספים (component-scoped, לא tokens):**
- `web/src/index.css` — גלובלי (reset, fonts, RTL base)
- `web/src/styles/agentPortal.css` — כל הסטיילינג הספציפי לדשבורד/הרשמה/פרופיל סוכן
- `web/src/styles/vibeFeed.css` — סטיילינג ה-reel feed

**אין tailwind.config, אין theme provider ב-JS** — כל הסגנון נטען פעם אחת דרך `import './index.css'` ב-`main.jsx`, וכל קומפוננטה משתמשת ב-class names + `var(--ds-*)`/`var(--color-*)` בתוך ה-CSS. כלומר קומפוננטות חדשות (Owner/Property) יכולות וצריכות להשתמש באותם class patterns ו-CSS vars הקיימים ב-`agentPortal.css` כתבנית ישירה.

**רכיב סיגנצ'ר:** `web/src/components/Logo.jsx` + `RadarSweepOverlay.jsx` (heatmap) — אנימציית ה"radar sweep" המתוארת ב-DESIGN_SYSTEM.md §5.

---

## 6. אחסון והרצה

**Deployment:** Railway, שירות Node יחיד שמגיש גם API וגם frontend (אין split frontend/backend בפרודקשן).

**זרימת build/start** (`package.json` root + `server/app.js`):
- Build: `npm run build` → `npm install --prefix web && npm run build --prefix web` → פלט ל-`web/dist`
- Start: `npm start` → `node server/index.js`
- `server/app.js` מגיש: `/api/*` כ-JSON, `express.static(WEB_DIST_DIR)` לקבצים סטטיים, SPA fallback ל-`index.html` לכל route אחר.
- **SSR meta-tag injection** (חשוב לשלב 2!) — `server/app.js:414-544`: השרת קורא את `index.html` פעם אחת בעלייה, ולשלוש נתיבים ספציפיים מזריק תוכן HTML גולמי + JSON-LD schema לפני שה-React app נטען, כדי ש-Googlebot יראה תוכן בלי JS:
  - `GET /` — מזריק ItemList + FAQPage schema + רשימת קישורי דילים קריאה (crawlable)
  - `GET /deal/:id(\d+)` — עמוד שיתוף לדיל בודד, Product schema, `buildDealSeoBody()`
  - `GET /agent/:slug([a-z0-9-]+)` — עמוד שיתוף לפרופיל סוכן, `buildAgentSeoBody()`
  - שני האחרונים קוראים ל-DB ישירות (`fetchDealForOg`, `fetchAgentForOg`) ומחזירים `next()` ל-SPA fallback אם לא נמצא. **דפוס זה יצטרך תוספת מקבילה ל-`/property/:id` ו-`/owner/:slug`** בשלב 2 כדי לשמור SEO.

**DB hosting:** MySQL service מחובר ב-Railway, env vars (`MYSQLHOST`/`MYSQLUSER`/וכו') נחשפים אוטומטית לשירות ה-Node המקושר.

**הרצה לוקאלית:**
```bash
./setup.sh              # מתקין backend+frontend, בודק Node version + מפתחות חסרים
npm start                # Express API → http://localhost:3001
npm run web:dev          # (טרמינל נפרד) Vite dev server → http://localhost:5173
```
או ידנית: `cp .env.example .env` (למלא מפתחות רלוונטיים) → `npm install` → `npm install --prefix web` → `npm start` + `npm run web:dev`. הדרישה היחידה: Node ≥18. השרת **לא קורס** אם מפתחות API/DB חסרים — רק משבית את הפיצ'ר התלוי.

**עמודי sitemap:** `GET /sitemap.xml` (`server/app.js:341`) — נבנה דינמית, גם הוא יצטרך תוספת ל-property pages.

---

## 7. טבלת מיפוי מלאה — טיסות → צימרים

### ישויות וטבלאות

| טיסות (קיים) | צימרים (חדש) | הערות |
|---|---|---|
| `agents` | `owners` | להעתיק כמעט 1:1: slug, business_name→ אולי `full_name`/`business_name`, contact_name, email, password_hash, phone, whatsapp_number, status, created_at/updated_at. **להשמיט:** license_number (לא רלוונטי אלא אם יש רישוי לצימרים), preferred_currency (בד"כ ₪ בלבד), subscription_tier/status/stripe_* (אלא אם גם לבעלי צימרים יש דגם מנוי) |
| `agent_deals` | `properties` | לא זהה — שדות שונים לגמרי (ראה טבלת שדות למטה). ה-FK ל-owner נשאר באותו דפוס (`owner_id` → `owners(id)` ON DELETE CASCADE) |
| `deals` (טיסות שנסרקו אוטומטית, מקור רשמי) | `properties` עם `source='auto'` | **אין טבלה נפרדת בעולם הצימרים** — נכס יכול להיות גם `source=auto/status=unclaimed` וגם `source=manual` בבעלות owner, כנראה טבלה אחת עם owner_id NULL-able (ראה נקודה פתוחה #1 מהדוח הקודם) |
| `price_history` + `core/anomaly-engine` (Z-score) | ⚠️ **אין מקבילה** | מחירי טיסות משתנים יומית ודורשים סטטיסטיקה; מחיר צימר קבוע/עונתי. המנוע כולו כנראה מיותר בעולם הצימרים |
| `packages` / `vibe_feed_cards` (טיסה+מלון) | ⚠️ **אין מקבילה ישירה** | ה"רילס" מבוסס על שילוב טיסה+מלון+וידאו; לצימר בודד אין הגיון מקביל, אלא אם רוצים "רילס נכסים" עתידי — out of scope |
| `sources/` (Amadeus/Travelpayouts — API רשמי) | `/engine` (Discovery/Fetcher/Extractor/Dedup) | **שינוי פילוסופי מלא** — ראה אזהרה למטה |
| `distribution/` (Telegram/WhatsApp שיווקי לערוצים) | לוגיקת התראה טרנזקציונלית פר-בקשת-הזמנה (שלב 5) | לא הרחבה — היגיון עסקי שונה לגמרי (push שיווקי לערוץ מול הודעה חד-פעמית ליחיד עם opt-out מחייב) |
| `contact_submissions` | נשאר כפי שהוא, אולי + `BookingRequest` נפרדת | |
| `destination_images` (קאש URL תמונות יעד, לא מוריד קבצים) | דפוס דומה ל-`source_image_urls` | תבנית טובה לחיקוי — כבר "URL בלבד, בלי הורדה" |
| `user_favorites`, `agent_ratings`, `users` | נשארים במבנה דומה, `agent_id`→`owner_id`/`property_id` | |

### שדות `agent_deals` → `properties` (מיפוי פר-שדה)

| agent_deals (טיסה) | properties (צימר) | סוג |
|---|---|---|
| destination (IATA) | — מוחלף | |
| destination_name, country | region, city, address | VARCHAR |
| — (אין) | latitude, longitude | DECIMAL |
| departure_date / return_date | — מוחלף ע"י `Availability` (טבלה נפרדת) | |
| video_url, photo_url | **owner_images** (JSON array/טבלה נפרדת, מאומת בלבד) + **source_image_urls** (פנימי, לא מוצג) | |
| price + currency | base_price_night, weekend_price, holiday_price, cleaning_fee, min_nights | DECIMAL |
| purchase_link | website | TEXT |
| whatsapp_override | whatsapp (כבר קיים דפוס `agent_deals.whatsapp_override` — כמעט זהה מושגית) | |
| is_exclusive | featured (אין מקבילה ברורה בדרישות — לשאול) | |
| description | description (**אך המקור בעולם הצימרים: נכתב ע"י LLM, לא ע"י הבעלים ישירות בשלב האיסוף**) | TEXT |
| status ENUM(pending/approved/rejected) | status ENUM(**unclaimed/claimed/active/hidden**) — enum שונה לגמרי, לא ניתן להשתמש חוזר | |
| quality_score, value_score | confidence (0-100) — מושג שונה: איכות חילוץ נתונים, לא איכות/כדאיות כלכלית | DECIMAL |
| click_count, purchase_count | leads/הזמנות — כנראה נשאר דומה | INT |
| airline, includes_checked_baggage/cabin_baggage/meal, departure_time/arrival_time | ⚠️ שדות טיסה טהורים — **לגמרי לא רלוונטיים**, נמחקים | |
| hotel_name, hotel_stars, hotel_breakfast/lunch/dinner, hotel_link | ⚠️ שדות מלון (מהרחבת "בנה חבילה") — לא רלוונטיים לצימר עצמו | |
| car_type, car_company | ⚠️ לא רלוונטי | |
| passenger_count | guest_capacity | TINYINT |
| — (אין שדה מקביל היום) | property_type (צימר/וילה/בקתה/סוויטה) | ENUM — **שדה חדש** |
| — (אין) | bedrooms, beds, bathrooms | TINYINT — **שדות חדשים** |
| — (אין) | 15 שדות boolean מתקנים (ג'קוזי/בריכה/סאונה/וכו') | TINYINT(1) — **שדות חדשים** |
| — (אין) | kosher_level ENUM | **שדה חדש** |
| — (אין) | opted_out, do_not_contact, opt_out_date, opt_out_method | **שדות חדשים — קריטיים לתאימות (שלב 5.5)** |
| — (אין) | collected_at, source_url | **שדות חדשים** |

### עמודים

| טיסות (קיים) | צימרים (חדש) |
|---|---|
| `App.jsx` (טאב טיסות, heatmap+grid) | טאב חיפוש צימרים (אזור/תאריכים/אורחים/מחיר) — **מחליף heatmap** (אין הגיון גיאוגרפי-דינמי דומה לצימר בישראל בודד; אולי מפת ישראל עם pins לפי אזור, לדון) |
| `DealsTab.jsx` (רילס) | ⚠️ ללא מקבילה ברורה — ראה טבלת ישויות למעלה |
| `DealDetailModal.jsx` (מודל, לא route) | **`PropertyPage` — route אמיתי חדש**, כולל תמיכת SSR (ראה §6) — claimed מול unclaimed |
| `AgentRegisterPage.jsx` → `/agent/register` | `OwnerRegisterPage.jsx` → `/owner/register` (אותו טופס 2-שלבים) |
| `AgentLoginPage.jsx` | `OwnerLoginPage.jsx` |
| `AgentDashboardPage.jsx` | `OwnerDashboardPage.jsx` — רשימת נכסים במקום דילים |
| `AgentSettingsPage.jsx` | `OwnerSettingsPage.jsx` |
| `AgentPublicProfilePage.jsx` (`/agent/:slug`) | `OwnerPublicProfilePage.jsx` (`/owner/:slug`) |
| `AdminPage.jsx` | מורחב: + תור אישור בעלות + תור confidence-נמוך (שלב 4) |
| `FilterBar.jsx` | פילטרים חדשים: אזור, מחיר, אורחים, מתקנים, כשרות, סוג נכס |
| — (אין היום) | `/remove` — עמוד הסרה עצמאי (שלב 5.5, קריטי משפטית) |
| `PrivacyPage.jsx` / `TermsPage.jsx` | מתעדכנים לכלול placeholder "טעון אישור עו״ד" למדיניות האיסוף |

---

## ⚠️ אזהרה שחוזרת מהדוח הקודם — קונפליקט README

`README.md` שורה 4 קובעת באופן מפורש: **"כל הנתונים מגיעים מ-APIs רשמיים בלבד — אין web scraping בקוד הזה."** זו הייתה החלטת ארכיטקטורה/משפטית מכוונת בפרויקט הקיים (`sources/` הם strategy-pattern adapters ל-Amadeus/Travelpayouts בלבד, לא scrapers).

שלבים 3–6 בפרומפט שלך דורשים בניית מנוע scraping מלא (`/engine`) — זו לא הרחבה של הארכיטקטורה הקיימת אלא **הכנסת קטגוריה חדשה של סיכון** שלא הייתה שם קודם, גם אם עטופה בגדרות תאימות טובות (5.5). כשנגיע לשלב 3 כדאי:
1. לעדכן את ה-README כדי שלא יסתור את המציאות.
2. לוודא ש-`/engine` רץ כשירות נפרד ומבודד היטב מ-`sources/` הקיים (לא לגעת בקוד הטיסות), כפי שהפרומפט כבר ביקש.
3. לשקול אישור עו"ד **לפני** כתיבת קוד האיסוף עצמו, לא רק לפני שליחת הודעות — סעיף 5.5 בפרומפט מבקש אישור עו"ד רק לתבניות ההודעה, אבל האיסוף עצמו (במיוחד טלפונים + כתובות) כפוף לחוק הגנת הפרטיות גם בלי לשלוח הודעה.

---

---

## החלטות שאושרו

**8. `PropertyPage` — route אמיתי, לא מודל.** מאושר: `/property/:id` יהיה React route ממשי (כמו `AgentPublicProfilePage` היום, לא כמו `DealDetailModal`). בשלב 2:
- להוסיף ל-`server/app.js` בלוק SSR meta-injection מקביל לזה שקיים כבר ל-`/deal/:id` ול-`/agent/:slug` (`server/app.js:521-544`), עבור `/property/:id` ו-`/owner/:slug` — כולל `fetchPropertyForOg`/`fetchOwnerForOg`, `propertyToOgMeta`, `buildPropertySeoBody`/`buildOwnerSeoBody` (אותו דפוס פונקציות בדיוק, שמות מקבילים).
- להוסיף Product/LocalBusiness schema (JSON-LD) לעמוד נכס, במקום Product schema של דיל טיסה.
- להרחיב את `GET /sitemap.xml` (`server/app.js:341`) לכלול `/property/:id` לכל נכס `active`/`claimed` ו-`/owner/:slug` לכל בעלים — בהתאם לעקרון שעמודי נכס הם ערוץ ה-SEO המרכזי של הפלטפורמה (במקביל לרשימת הדילים הקריאה שכבר מוזרקת היום ל-`/`).
- ה-homepage SSR injection (`server/app.js:419-518`, ItemList+FAQ schema) יצטרך גרסה מקבילה עם רשימת נכסים קריאה במקום רשימת דילים.

---

**סטטוס:** דוח מלא + החלטה #8 מתועדת. ללא שינויי קוד. ממתין לאישור שלך על יתר הנקודות הפתוחות (§7 בדוח הקודם: מבנה טבלת properties יחידה מול הפרדת owner/property, גורל הטבלאות הישנות, אימות Cloudinary) לפני מעבר לשלב 1.
