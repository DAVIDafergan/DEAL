import { countPropertiesGroupedBy } from '../store/propertyStore.js';
import { REGIONS, regionLabel } from './regions.js';
import { SEO_CATEGORIES, categoryToSearchFilters } from './categories.js';

const MIN_LISTINGS_TO_INDEX = 3;

function xmlUrl({ loc, lastmod, freq, priority }) {
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>${freq}</changefreq><priority>${priority}</priority></url>`;
}

function toDateStr(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : '';
}

/** 9.7: every /אזור/*, /עיר/*, /קטגוריה/*, and two-dimension combo page that currently has
 * >=3 real listings — the exact same threshold buildSeoLandingData uses to decide noindex, so
 * a page can never be *in the sitemap* while also being noindex on the page itself. Regions and
 * bare categories are cheap (grouped queries already give per-region/per-city counts); the
 * region×category and city×category combos reuse one grouped query per category (28 queries
 * total for 14 categories × {region,city} grouping) rather than one query per combination. */
export async function buildRegionAndCategoryUrls(siteUrl) {
  const urls = [];

  // Bare regions: one grouped query covers all 9 at once.
  const byRegion = await countPropertiesGroupedBy('region', {});
  for (const r of byRegion) {
    if (r.count < MIN_LISTINGS_TO_INDEX) continue;
    urls.push(xmlUrl({ loc: `${siteUrl}/אזור/${encodeURIComponent(regionLabel(r.key))}`, lastmod: toDateStr(r.lastmod), freq: 'daily', priority: '0.7' }));
  }

  // Bare cities: one grouped query covers every city at once.
  const byCity = await countPropertiesGroupedBy('city', {});
  for (const c of byCity) {
    if (c.count < MIN_LISTINGS_TO_INDEX) continue;
    urls.push(xmlUrl({ loc: `${siteUrl}/עיר/${encodeURIComponent(c.key)}`, lastmod: toDateStr(c.lastmod), freq: 'daily', priority: '0.65' }));
  }

  // Bare categories + region-combo + city-combo, all from 2 grouped queries per category.
  for (const cat of SEO_CATEGORIES) {
    const filters = categoryToSearchFilters(cat);
    const [regionGrouped, cityGrouped] = await Promise.all([
      countPropertiesGroupedBy('region', filters),
      countPropertiesGroupedBy('city', filters),
    ]);

    const totalForCategory = regionGrouped.reduce((sum, r) => sum + r.count, 0);
    if (totalForCategory >= MIN_LISTINGS_TO_INDEX) {
      const lastmod = regionGrouped.reduce((max, r) => (r.lastmod && (!max || r.lastmod > max) ? r.lastmod : max), null);
      urls.push(xmlUrl({ loc: `${siteUrl}/קטגוריה/${encodeURIComponent(cat.slug)}`, lastmod: toDateStr(lastmod), freq: 'weekly', priority: '0.6' }));
    }

    for (const r of regionGrouped) {
      if (r.count < MIN_LISTINGS_TO_INDEX) continue;
      urls.push(xmlUrl({ loc: `${siteUrl}/${encodeURIComponent(regionLabel(r.key))}/${encodeURIComponent(cat.slug)}`, lastmod: toDateStr(r.lastmod), freq: 'weekly', priority: '0.55' }));
    }
    for (const c of cityGrouped) {
      if (c.count < MIN_LISTINGS_TO_INDEX) continue;
      urls.push(xmlUrl({ loc: `${siteUrl}/${encodeURIComponent(c.key)}/${encodeURIComponent(cat.slug)}`, lastmod: toDateStr(c.lastmod), freq: 'weekly', priority: '0.5' }));
    }
  }

  return urls;
}
