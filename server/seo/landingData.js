import { searchProperties, listCitiesForRegion } from '../store/propertyStore.js';
import { REGIONS, findRegionBySlug, regionLabel } from './regions.js';
import { SEO_CATEGORIES, findCategoryBySlug, categoryToSearchFilters } from './categories.js';

const MIN_LISTINGS_TO_INDEX = 3;

/** 9.7 golden rule: a landing page is only indexable once it has >=3 real matching listings.
 * Below that it still renders (real content, never a dead end) but every meta/JSON-LD layer
 * marks it noindex — thin programmatic pages at scale are a known Google penalty risk, and
 * inventory is still small, so most combinations legitimately return few/zero results today.
 * That's expected, not a bug: as the collection engine fills in properties, more of these
 * combinations cross the threshold and start getting indexed on their own. */
export async function buildSeoLandingData({ regionSlug, citySlug, categorySlug }) {
  const region = regionSlug ? findRegionBySlug(regionSlug) : null;
  if (regionSlug && !region) return null;
  const city = citySlug ? decodeURIComponent(citySlug) : null;
  const category = categorySlug ? findCategoryBySlug(categorySlug) : null;
  if (categorySlug && !category) return null;
  if (!region && !city && !category) return null;

  const filters = {
    region: region?.value,
    city: city || undefined,
    ...categoryToSearchFilters(category),
    limit: 60,
  };
  const properties = await searchProperties(filters);
  const count = properties.length;
  const indexable = count >= MIN_LISTINGS_TO_INDEX;

  const prices = properties.map((p) => p.price_from).filter(Boolean);
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;

  const amenityCounts = {};
  for (const p of properties) {
    for (const key of ['has_private_jacuzzi', 'has_private_pool', 'has_heated_pool', 'has_view', 'has_sauna', 'is_kid_friendly']) {
      if (p[key]) amenityCounts[key] = (amenityCounts[key] || 0) + 1;
    }
  }
  const AMENITY_LABELS = { has_private_jacuzzi: 'ג\'קוזי פרטי', has_private_pool: 'בריכה פרטית', has_heated_pool: 'בריכה מחוממת', has_view: 'נוף', has_sauna: 'סאונה', is_kid_friendly: 'ידידותי לילדים' };
  const commonAmenities = Object.entries(amenityCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key]) => AMENITY_LABELS[key]);

  // ── Copy: place name + optional category qualifier ────────────────────────
  const placeName = city || (region ? regionLabel(region.value) : null);
  const placeLabel = city ? city : region ? `אזור ${regionLabel(region.value)}` : 'ישראל';
  const categoryLabel = category ? category.label : null;

  const h1 = [
    'צימרים ווילות',
    categoryLabel,
    placeName ? (city ? `ב${city}` : `ב${regionLabel(region.value)}`) : null,
  ].filter(Boolean).join(' ');

  const introParts = [`מצאנו ${count} נכסים ${categoryLabel ? categoryLabel + ' ' : ''}${city ? `ב${city}` : region ? `באזור ${regionLabel(region.value)}` : 'בישראל'}.`];
  if (priceMin) introParts.push(`טווח המחירים נע בין ${Math.round(priceMin)} ל-${Math.round(priceMax)} ₪ ללילה.`);
  if (commonAmenities.length) introParts.push(`המתקנים הנפוצים ביותר: ${commonAmenities.join(', ')}.`);
  const intro = introParts.join(' ');

  const title = `${h1} | Dealim`;
  const description = indexable
    ? `${count} ${h1} — ${intro}`.slice(0, 160)
    : `${h1} — בקרוב יתווספו נכסים נוספים. ${intro}`.slice(0, 160);

  const breadcrumbs = [{ name: 'בית', path: '/' }];
  if (region) breadcrumbs.push({ name: regionLabel(region.value), path: `/אזור/${encodeURIComponent(region.label)}` });
  if (city) breadcrumbs.push({ name: city, path: `/עיר/${encodeURIComponent(city)}` });
  if (category && !region && !city) breadcrumbs.push({ name: category.label, path: `/קטגוריה/${encodeURIComponent(category.slug)}` });
  else if (category) breadcrumbs.push({ name: category.label });

  const faq = buildFaq({ h1, count, placeLabel, categoryLabel, priceMin, priceMax });

  // ── Internal links to nearby pages (same golden rule applies when the visitor lands there —
  // we just don't pre-check every combination's count here, that'd be a query storm) ──────────
  const relatedLinks = [];
  if (region && !category) {
    for (const c of SEO_CATEGORIES.slice(0, 6)) {
      relatedLinks.push({ label: `${c.label} ב${regionLabel(region.value)}`, path: `/${encodeURIComponent(region.label)}/${encodeURIComponent(c.slug)}` });
    }
  }
  if (category && !region && !city) {
    for (const r of REGIONS) {
      relatedLinks.push({ label: `${category.label} ב${r.label}`, path: `/${encodeURIComponent(r.label)}/${encodeURIComponent(category.slug)}` });
    }
  }
  if (!region && !city && !category) { /* homepage-level, not reached here */ }
  if (region && !city) {
    const cities = await listCitiesForRegion(region.value).catch(() => []);
    for (const c of cities.slice(0, 8)) {
      relatedLinks.push({ label: c.city, path: `/עיר/${encodeURIComponent(c.city)}` });
    }
  }

  return {
    region, city, category, properties, count, indexable,
    h1, title, description, intro, breadcrumbs, faq, relatedLinks,
    priceMin, priceMax, commonAmenities,
  };
}

function buildFaq({ h1, count, placeLabel, categoryLabel, priceMin, priceMax }) {
  const items = [
    {
      q: `כמה נכסים ${categoryLabel ? categoryLabel + ' ' : ''}יש ב${placeLabel}?`,
      a: count > 0
        ? `נכון לעכשיו יש ${count} נכסים ${categoryLabel ? categoryLabel + ' ' : ''}ב${placeLabel} באתר, ישירות מבעלי הנכסים.`
        : `עדיין אין נכסים ${categoryLabel ? categoryLabel + ' ' : ''}ב${placeLabel} — בעלי צימרים ווילות מצטרפים כל הזמן, כדאי לבדוק שוב בקרוב.`,
    },
    {
      q: 'האם יש עמלות הזמנה?',
      a: 'לא. Dealim מציג נכסים ישירות מבעלי הצימרים והווילות — ללא עמלת הזמנה, פנייה ישירה לבעלים.',
    },
  ];
  if (priceMin) {
    items.push({ q: `כמה עולה לילה ב${placeLabel}?`, a: `המחירים נעים בין ${Math.round(priceMin)} ל-${Math.round(priceMax)} ₪ ללילה, בהתאם לנכס ולעונה.` });
  }
  items.push({ q: 'איך מזמינים?', a: 'נכנסים לעמוד הנכס הרצוי, ושולחים בקשת הזמנה או פונים ישירות בוואטסאפ לבעל הנכס.' });
  return items;
}
