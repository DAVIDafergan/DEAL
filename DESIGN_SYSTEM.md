# Deal Radar Pro — Design System v3 "Golan Hearth"

> Supersedes v2 "Midnight Souk" (dark radar/flight-deal identity). The flight-deals/agent-reel
> world it was built for is retired and unrouted (see `AppShell.jsx`) — the live site is now
> exclusively the צימרים (cabin/villa rental) marketplace. v2's content is kept below §8 for
> historical reference only; do not extend it.

## Concept

A working weekend cabin in the Galilee or Golan: whitewashed stone, a wood fire, olive groves
outside the window. Not a SaaS dashboard, not a generic "sun-and-sand" travel-blue site, not
terracotta-on-cream (the AI-default rural cliché).

**Why this palette is specific to this project:**
- **Hearth copper** (`#C1592B`) — the fireplace every cabin listing photographs. Warm, not
  aggressive-red like a sale banner. Used for every CTA and interactive accent, so it reads as
  "the site's color," not "a promo color."
- **Olive** (`#5B6B4E`) — the tree line outside. Reserved for trust signals only (verified
  badges, success states, confirmed bookings) so it carries meaning, not decoration.
- **Gold** (`#B8860B`) — used for money and only money (prices, "from ₪X"). A guest should be
  able to scan a page and find the price by color alone.
- **Wine** (`#8C2F39`) — urgency/danger only (delete, sold out, validation errors). Rationed.
- **Warm linen** (`#FAF6EF`) base instead of white/gray — feels like paper/plaster, not a screen.
  Cards sit on it in true white (`#FFFFFF`) so elevation is legible without heavy shadows.
- Charcoal-brown ink (`#2A2118`) for text instead of pure black — softer, warmer reading color.

## 1. Color tokens

| Token | Hex | Usage |
|---|---|---|
| `--ds-void` | `#FAF6EF` | Page background |
| `--ds-ink` | `#FFFFFF` | Card/panel surfaces |
| `--ds-slate` | `#F3ECE0` | Hover/elevated fill |
| `--ds-bone` | `#2A2118` | Primary text |
| `--ds-ash` | `#7A6C5B` | Secondary/muted text |
| `--ds-hearth` | `#C1592B` | Primary — CTAs, links, active filters, focus accents |
| `--ds-olive` | `#5B6B4E` | Verified/trust badges, success states |
| `--ds-gold` | `#B8860B` | Prices — nowhere else |
| `--ds-wine` | `#8C2F39` | Errors, delete, sold-out |

Never place hearth + olive + gold + wine all on one screen at equal visual weight — one accent
leads per screen (hearth for marketing/booking flows, olive for dashboards).

## 2. Typography

**Display:** `Fraunces` (a warm, slightly-serif display face with real character — used for
H1s, hero headlines, property names on cards). Falls back to `Plus Jakarta Sans` 800 for Hebrew,
since Fraunces has no Hebrew glyphs — Hebrew headlines use the Jakarta fallback directly, so no
missing-glyph flash occurs.

**Body:** `Plus Jakarta Sans` (Latin) / `Noto Sans Hebrew` (Hebrew) — unchanged from v2, both
already loaded and battle-tested for RTL.

**Numbers:** `font-variant-numeric: tabular-nums` on all prices/counts/dates.

### Scale
```
--ts-hero:    clamp(2rem, 5vw, 3.5rem) / 800   — page heroes
--ts-display: 1.4rem / 700                     — card title overlay
--ts-title:   1.05rem / 700                    — card body title
--ts-price:   1.75rem / 800 / tabular-nums / --ds-gold
--ts-label:   0.72rem / 600 / uppercase / letter-spacing 0.06em
--ts-body:    0.875rem / 400
--ts-micro:   0.7rem / 500
```

## 3. Spacing / radius / shadow

- Spacing scale: `--sp-1` (4px) … `--sp-16` (64px), multiples of 4.
- Radius: `--radius-sm` 10px (inputs, chips), `--radius-md` 16px (cards' inner elements),
  `--radius-lg` 22px (outer cards, modals), `--radius-pill` 999px (badges, filter chips).
- Shadows are warm-tinted (brown-based rgba, not pure black) — `--shadow-card`,
  `--shadow-card-hover` (hearth-tinted lift on hover), `--shadow-popover`.

## 4. Component rules

- **Cards**: white on linen, `--radius-lg`, `--shadow-card` at rest, lift to
  `--shadow-card-hover` + `translateY(-2px)` on hover — no color border flip (that was v2's
  teal-left-border move; v3 uses shadow + lift only, calmer).
- **Buttons**: primary = `--gradient-accent` (hearth → hearth-dark), white text, `--radius-sm`.
  Secondary = ghost (1px `--ds-ghost` border, `--ds-ash` text). WhatsApp stays brand green
  (`#25d366`, non-negotiable). Destructive = `--ds-wine`.
  Dashboard/admin screens: flat `--ds-hearth` fill, no gradient — gradients are for
  guest-facing marketing surfaces only (Home, property page, search).
- **Badges**: "verified" = olive fill + checkmark. Price = gold text, never a filled badge.
  Urgency ("2 units left") = wine text, no background — wine is a signal, not decoration.
- **Focus ring**: `--ds-hearth`, 3px, offset 2px — replaces v2's blue `#2563EB` global ring.

## 5. RTL as a first-class citizen

All new layout uses logical properties (`inset-inline-start/end`, `margin-inline-*`,
`padding-inline-*`) exclusively — never `left`/`right`. Hebrew (`dir="rtl"`) is the default and
the layout every component is designed in first; English is verified afterward, not the other
way around.

## 6. What NOT to do

- No terracotta-on-cream postcard look — hearth copper is warmer/darker, gold carries the
  "treasure" role terracotta usually plays, so the two don't compete.
- No sage-green-and-beige "wellness brand" pastel wash — olive here is deliberately muted/deep,
  not minty.
- No stark pure white/pure black anywhere — every neutral has warmth in it.
- No teal, no blue — those belonged to v2's "radar" concept and have no place in a
  hospitality/trust identity.
- Gradients reserved for guest-facing CTAs only; dashboards stay flat and calm.

## 7. Scope note (honest, see also `DECISIONS.md` §9.0)

The retired flight-deals/agent-reel/vibe-feed UI (`vibeFeed.css`, `heatmap/*`, `DealCard`,
`questionnaire/*`, etc.) is **not** re-themed to v3 — those routes are unmounted
(`AppShell.jsx`), the components are dead code kept on disk, and re-theming ~4,500 lines of CSS
that no user can ever reach is not a good use of effort under this step's deadline. Legacy
`--color-*` aliases in `theme.css` keep those dead files non-broken (they still compile/render
if ever re-mounted) without requiring a v3 pass over them.

---

## 8. v2 "Midnight Souk" (retired — historical reference only)

<details>
<summary>Original v2 content, kept for history</summary>

A platform where Tel Aviv's startup urgency meets the drama of an airport departure board at 2am.
Void-navy base, teal signature accent, amber prices, coral urgency. Built for the flight-deal
radar concept before the pivot to cabin/villa rentals. See git history for the full v2 doc.

</details>
