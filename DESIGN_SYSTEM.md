# Deal Radar Pro — Design System v2
## Concept: "Midnight Souk"

A platform where Tel Aviv's startup urgency meets the drama of an airport departure board at 2am.
Not terracotta-on-cream. Not generic travel-blue-and-white. Not near-black with lime green.

**Why this palette is specific to this project:**
- "Deal Radar" = scanning, finding, targeting. The teal (#17c3b2) echoes both radar screens
  (classic phosphor-green shifted toward the Mediterranean) and the sea itself.
- Prices in amber (#f5a623) = treasure. A deal is gold you found.
- Coral (#ff4d6d) for urgency only — exclusive badges, destructive actions. Rationed carefully.
- The deep void-navy base (#07080f) is a night flight: dark, calm, purposeful.

---

## 1. Color Palette

| Token | Hex | Name | Usage |
|---|---|---|---|
| `--ds-void` | `#07080f` | Void | Deepest background |
| `--ds-ink` | `#0e1120` | Ink | Surface: cards, panels |
| `--ds-slate` | `#1a2038` | Slate | Elevated: modals, hover states |
| `--ds-bone` | `#eff1f8` | Bone | Primary text (cool white, not warm) |
| `--ds-ash` | `#6b7694` | Ash | Secondary / muted text |
| `--ds-amber` | `#f5a623` | Amber | Prices, value scores — TREASURE |
| `--ds-coral` | `#ff4d6d` | Coral | Urgency: exclusive badges, delete, errors |
| `--ds-teal` | `#17c3b2` | Teal | SIGNATURE — see §5 |
| `--ds-ghost` | `rgba(255,255,255,0.06)` | Ghost | Subtle borders, dividers |

**Retained from v1 (deal heat system):**
- `--color-accent-from: #f97316` (orange) — used in existing gradients, not replaced
- `--color-accent-to: #ef4444` (red) — CTAs that already use gradient

---

## 2. Typography

**Display face:** `Plus Jakarta Sans` (800 weight)
- Character: slightly rounded, assertive, works at large sizes. NOT Poppins (too soft), NOT Inter (too neutral).
- Used for: destination names on cards, page heroes, price display, logo wordmark.

**Body face:** `Noto Sans Hebrew` / `Plus Jakarta Sans`
- Inherits from system; Hebrew falls back to `Noto Sans Hebrew` (already loaded).

**Utility (data):** tabular numbers via `font-variant-numeric: tabular-nums`
- Prices, dates, counts — feels like a departure board display.

### Type Scale
```
--ts-hero:    clamp(2rem, 5vw, 3.5rem) / 800   — page heroes
--ts-display: 1.4rem / 700                     — card destination name overlay
--ts-title:   1.05rem / 700                    — card body title
--ts-price:   1.75rem / 800 / tabular-nums     — THE price
--ts-label:   0.72rem / 600 / letter-spacing 0.06em / uppercase — category chips
--ts-body:    0.875rem / 400                   — descriptions
--ts-micro:   0.7rem / 500                     — dates, muted info
```

---

## 3. Layout Concept

### Deal Card (grid)
```
┌─────────────────────────────────────┐
│  [PHOTO — 200px tall]               │
│                         [-23%] ←coral badge│
│  ✓ Agency Name ← glass pill bottom-left   │
│  🔥 EXCLUSIVE ← top-right if set    │
├─────────────────────────────────────┤
│  Barcelona, Spain          ← 700    │
│  ─────────────────────────          │
│  ✈ Arkia · 12.07 → 19.07  ← micro  │
│  🏨 Hilton ★★★★ · ☕       ← micro  │
├─────────────────────┬───────────────┤
│  ₪ 2,490            │ [❤] [WA] [→] │
│  ← amber 800        │  ← action row │
└─────────────────────┴───────────────┘
Hover: teal 3px left border + amber shadow lift
```

### Home page
```
[HEADER sticky: Logo | Name | ❤ | 🌐 | Auth]
─────────────────────────────────────────────
[TOP 5 HERO — full width cards, 280px image]
─────────────────────────────────────────────
[REELS STRIP — horizontal scroll]
─────────────────────────────────────────────
[PACKAGES STRIP]
─────────────────────────────────────────────
[AGENT DEALS GRID — 2→3 cols]
─────────────────────────────────────────────
[FOOTER]
```

### Agent Dashboard
```
[TOPBAR: ← Home | Agent Name · status | ⚙ ⎋]
─────────────────────────────────────────────
[KPI: Deals Active] [KPI: Leads/Month]
─────────────────────────────────────────────
[Profile link →]
[────── Deals Tab ──────]
[+ הוסף דיל]
[deal row] [deal row] [deal row]
```

### Admin Panel
```
[ADMIN TOPBAR: Logo | פאנל ניהול | refresh | logout]
─────────────────────────────────────────────────────
[KPI ROW: Pending Agents | Pending Deals | Total Agents | Active Deals]
─────────────────────────────────────────────────────
[TABS: Agents pending | All agents | Deals pending | Active deals]
─────────────────────────────────────────────────────
[ROWS: card-style rows, clean typography]
```

---

## 4. Component Rules

### Cards
- Border-radius: `--radius-lg (24px)` on outer card, `--radius-md (16px)` on inner elements
- Image overlay: `linear-gradient(180deg, transparent 30%, rgba(7,8,15,0.9) 100%)`
- Price: always `--ds-amber`, `font-variant-numeric: tabular-nums`, weight 800
- Hover: 3px left border in `--ds-teal` + `box-shadow: 0 16px 40px rgba(23,195,178,0.12)`

### Buttons
- Primary CTA: `--gradient-accent` (orange→red), white text, 10px radius
- Secondary: ghost (border only), `--ds-ash` text
- WhatsApp: `#25d366` (WhatsApp green is non-negotiable brand color)
- Danger/delete: `--ds-coral`

### Badges
- Value score: `--ds-coral` bg, white text, pill shape, weight 700
- Exclusive: amber gradient bg
- Agent verified: `rgba(255,255,255,0.15)` glass with checkmark

---

## 5. Signature Element — The Radar Sweep

**One thing. Done perfectly.**

On every page load, the logo SVG draws its sweep arc (120° clockwise from 12 o'clock)
via `stroke-dashoffset` animation, 0.7s duration, `cubic-bezier(0.6,0,0.4,1)`.

Then the center dot pulses with a `--ds-teal` glow every 3.5 seconds — forever.

This is the "Deal Radar" moment: the radar found your deal.
Every other animation on the site should feel slower and calmer than this.

**CSS:**
```css
.logo-sweep {
  stroke-dasharray: 36;
  stroke-dashoffset: 36;
  animation: logo-draw 0.7s cubic-bezier(0.6,0,0.4,1) 0.2s forwards;
}
.logo-dot {
  animation: logo-pulse 3.5s ease-in-out 1.1s infinite;
}
@keyframes logo-draw { to { stroke-dashoffset: 0; } }
@keyframes logo-pulse {
  0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px var(--ds-teal)); }
  50%       { opacity: 0.75; transform: scale(1.35); filter: drop-shadow(0 0 7px var(--ds-teal)); }
}
```

---

## 6. Content & Copy Principles

- Write from the user's POV: "המועדפים שלי" not "ניהול favorites"
- Empty states = invitation to act, not dead screens
- Errors explain what happened AND how to fix it
- Numbers: always with currency symbol, always `font-variant-numeric: tabular-nums`
- Hebrew RTL is the primary language; all layout works RTL-first

---

## 7. What NOT to do

- No terracotta, no sage green, no warm beige — these are AI-default palettes
- No gradient everywhere — gradients are reserved for the accent CTA and the price badge
- No shadows on everything — only cards and modals get elevation shadows
- No Inter or Poppins as display faces
- Never use the teal (#17c3b2) for more than 2 UI elements — it's a signature, not a theme
