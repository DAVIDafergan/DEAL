import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getPool } from '../core/db/index.js';
import dealsRouter from './routes/deals.js';
import personalRadarRouter from './routes/personalRadar.js';
import statsRouter from './routes/stats.js';
import imagesRouter from './routes/images.js';
import configRouter from './routes/config.js';
import packagesRouter from './routes/packages.js';
import propertiesRouter from './routes/properties.js';
import removeRouter from './routes/remove.js';
import whatsappRouter from './routes/whatsapp.js';
import agentsRouter from './routes/agents.js';
import adminRouter from './routes/admin.js';
import billingRouter from './routes/billing.js';
import musicRouter from './routes/music.js';
import usersRouter from './routes/users.js';
import contactRouter from './routes/contact.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST_DIR = path.join(__dirname, '..', 'web', 'dist');
const WEB_INDEX_HTML = path.join(WEB_DIST_DIR, 'index.html');
const SITE_URL = process.env.SITE_URL || 'https://dealim.org';

// ── CORS origin list ──────────────────────────────────────────────────────────
// Set ALLOWED_ORIGINS as a comma-separated list in production (e.g. "https://dealim.org,https://www.dealim.org").
// Falls back to SITE_URL + localhost in development.
function buildCorsOrigins() {
  if (process.env.ALLOWED_ORIGINS) {
    return process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
  }
  const origins = [SITE_URL];
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3001', 'http://localhost:5173', 'http://127.0.0.1:5173');
  }
  return origins;
}

// ── OG meta-tag helpers ───────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildOgHtml(baseHtml, { title, description, imageUrl, pageUrl, jsonLd }) {
  const img = imageUrl || `${SITE_URL}/og-image.svg`;
  // Encode </script> sequences inside JSON-LD to prevent early script close
  const jsonLdStr = jsonLd
    ? JSON.stringify(jsonLd, null, 0).replace(/<\//g, '<\\/')
    : null;
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="Dealim" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:image" content="${esc(img)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    `<meta name="twitter:image" content="${esc(img)}" />`,
    `<link rel="canonical" href="${esc(pageUrl)}" />`,
    jsonLdStr ? `<script type="application/ld+json">${jsonLdStr}</script>` : '',
  ].filter(Boolean).join('\n    ');

  // Strip existing title + meta description + og/twitter tags + JSON-LD, inject before </head>
  return baseHtml
    .replace(/<title>[^<]*<\/title>/gi, '')
    .replace(/<meta[^>]*name="description"[^>]*>/gi, '')
    .replace(/<meta[^>]*property="og:[^"]*"[^>]*>/gi, '')
    .replace(/<meta[^>]*name="twitter:[^"]*"[^>]*>/gi, '')
    .replace(/<link[^>]*rel="canonical"[^>]*>/gi, '')
    .replace(/<script\s+type="application\/ld\+json">[\s\S]*?<\/script>/gi, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

async function fetchDealForOg(id) {
  try {
    const [rows] = await getPool().query(
      `SELECT ad.id, ad.destination, ad.destination_name, ad.country, ad.photo_url,
              ad.price, ad.currency, ad.description, ad.airline,
              ad.departure_date, ad.return_date, ad.hotel_name,
              a.business_name, a.slug AS agent_slug
       FROM agent_deals ad JOIN agents a ON a.id = ad.agent_id
       WHERE ad.id = ? AND ad.status = 'approved' AND a.status = 'approved'`,
      [id]
    );
    return rows[0] || null;
  } catch { return null; }
}

async function fetchAgentForOg(slug) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, slug, business_name, about, logo_url, cover_url
       FROM agents WHERE slug = ? AND status = 'approved'`,
      [slug]
    );
    const agent = rows[0];
    if (!agent) return null;
    const now = new Date().toISOString().slice(0, 10);
    const [dealRows] = await pool.query(
      `SELECT id, destination_name, destination, price, currency
       FROM agent_deals
       WHERE agent_id = ? AND status = 'approved'
         AND departure_date >= ? AND (expires_at IS NULL OR expires_at >= ?)
       ORDER BY click_count DESC LIMIT 12`,
      [agent.id, now, now]
    );
    return { ...agent, deals: dealRows };
  } catch { return null; }
}

function fmtDate(d) {
  if (!d) return null;
  try { return new Date(d + 'T00:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

function buildDealSeoBody(deal) {
  const dest = esc(deal.destination_name || deal.destination || '');
  const isHotel = !deal.airline && deal.hotel_name;
  const dealType = isHotel ? 'דיל מלון' : 'דיל טיסה';
  const price = deal.price ? `${Math.round(deal.price).toLocaleString('he-IL')} ${deal.currency || ''}`.trim() : '';

  const facts = [
    deal.airline    && `<span>✈️ <strong>${esc(deal.airline)}</strong></span>`,
    deal.hotel_name && `<span>🏨 <strong>${esc(deal.hotel_name)}</strong>${deal.hotel_stars ? ` ${'⭐'.repeat(Math.min(5,Number(deal.hotel_stars)))}` : ''}</span>`,
    deal.departure_date && `<span>📅 יציאה: <strong>${fmtDate(deal.departure_date)}</strong></span>`,
    deal.return_date    && `<span>🔁 חזרה: <strong>${fmtDate(deal.return_date)}</strong></span>`,
    price               && `<span>💰 מחיר: <strong>${price}</strong></span>`,
    deal.country        && `<span>🌍 ${esc(deal.country)}</span>`,
    deal.business_name  && `<span>👤 ${esc(deal.business_name)}</span>`,
  ].filter(Boolean).join('');

  const desc = deal.description
    ? esc(deal.description.slice(0, 160))
    : `${dealType} בלעדי ל${dest}${deal.airline ? ` עם ${esc(deal.airline)}` : ''} דרך סוכן נסיעות מאומת.`;

  return `<div id="ssr" style="font-family:system-ui,sans-serif;direction:rtl;padding:1.25rem 1.5rem;max-width:740px;margin:0 auto;color:#1e293b">
<nav style="font-size:.82rem;color:#64748b;margin-bottom:.75rem">
  <a href="${SITE_URL}" style="color:#2563eb">Dealim</a> ›
  <a href="${SITE_URL}/" style="color:#2563eb">דילי טיסות ומלונות</a> ›
  <span>${dest}</span>
</nav>
<h1 style="font-size:1.55rem;line-height:1.3;margin:0 0 .4rem">${dealType} ל${dest}${price ? ` — ${price}` : ''}</h1>
<p style="font-size:.93rem;color:#475569;margin:0 0 .75rem">${desc}</p>
<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem;font-size:.87rem">${facts.split('</span>').filter(Boolean).map(f => `${f}</span>`).join('')}</div>
<p style="font-size:.78rem;color:#94a3b8">
  מחפש עוד דילים? <a href="${SITE_URL}" style="color:#2563eb">דילי טיסות זולות</a> ·
  <a href="${SITE_URL}" style="color:#2563eb">דילי מלונות בחו"ל</a> ·
  <a href="${SITE_URL}" style="color:#2563eb">חבילות נופש</a> — Dealim
</p>
</div>`;
}

function buildAgentSeoBody(agent) {
  const name = esc(agent.business_name || '');
  const deals = agent.deals || [];
  const dealList = deals.map(d => {
    const dest = esc(d.destination_name || d.destination || '');
    const price = d.price ? ` (${Math.round(d.price)} ${d.currency || ''})` : '';
    return `<li><a href="${SITE_URL}/deal/${d.id}" style="color:#2563eb">${dest}${price}</a></li>`;
  }).join('');

  const about = agent.about ? esc(agent.about.slice(0, 220)) :
    `דילי טיסות ומלונות בלעדיים מ${name} — סוכן נסיעות מאומת ב-Dealim. מחירים מיוחדים שלא תמצאו בשום מקום אחר.`;

  return `<div id="ssr" style="font-family:system-ui,sans-serif;direction:rtl;padding:1.25rem 1.5rem;max-width:740px;margin:0 auto;color:#1e293b">
<nav style="font-size:.82rem;color:#64748b;margin-bottom:.75rem">
  <a href="${SITE_URL}" style="color:#2563eb">Dealim</a> ›
  <a href="${SITE_URL}/" style="color:#2563eb">סוכני נסיעות</a> ›
  <span>${name}</span>
</nav>
<h1 style="font-size:1.55rem;line-height:1.3;margin:0 0 .4rem">${name} — סוכן נסיעות</h1>
<p style="font-size:.93rem;color:#475569;margin:0 0 .75rem">${about}</p>
${dealList ? `<h2 style="font-size:1rem;margin:.5rem 0 .3rem">דילים פעילים</h2><ul style="padding-right:1.2rem;margin:.3rem 0 .75rem;font-size:.9rem">${dealList}</ul>` : ''}
<p style="font-size:.78rem;color:#94a3b8">
  <a href="${SITE_URL}" style="color:#2563eb">כל הדילים</a> ·
  <a href="${SITE_URL}/register" style="color:#2563eb">הצטרף כסוכן</a>
</p>
</div>`;
}

function dealToOgMeta(deal) {
  const dest = deal.destination_name || deal.destination || '';
  const price = deal.price ? `${Math.round(deal.price)} ${deal.currency || ''}`.trim() : '';
  const isHotelDeal = !deal.airline && deal.hotel_name;
  const dealType = isHotelDeal ? 'דיל מלון' : 'דיל טיסה';
  const title = `${dealType} ל${dest}${price ? ` — ${price}` : ''} | Dealim`;
  const parts = [];
  if (deal.airline) parts.push(`✈️ ${deal.airline}`);
  if (deal.hotel_name) parts.push(`🏨 ${deal.hotel_name}`);
  if (deal.business_name) parts.push(`דרך ${deal.business_name}`);
  if (deal.description) parts.push(deal.description.slice(0, 80));
  const description = parts.join(' · ') || `${dealType} ל${dest}${price ? ` במחיר ${price}` : ''} מסוכן נסיעות מאומת — Dealim`;
  const pageUrl = `${SITE_URL}/deal/${deal.id}`;
  const imageUrl = deal.photo_url || null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Product',
        '@id': `${pageUrl}#product`,
        name: title,
        image: imageUrl || `${SITE_URL}/og-image.svg`,
        description,
        url: pageUrl,
        offers: {
          '@type': 'Offer',
          price: deal.price ? String(Math.round(deal.price)) : undefined,
          priceCurrency: deal.currency || 'USD',
          url: pageUrl,
          availability: 'https://schema.org/InStock',
          seller: deal.business_name ? { '@type': 'TravelAgency', name: deal.business_name } : undefined,
          ...(deal.departure_date ? { validFrom: deal.departure_date } : {}),
        },
        ...(deal.airline ? { brand: { '@type': 'Brand', name: deal.airline } } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Dealim', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'דילים', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 3, name: dest, item: pageUrl },
        ],
      },
    ],
  };
  return { title, description, imageUrl, pageUrl, jsonLd };
}

function agentToOgMeta(agent) {
  const name = agent.business_name || '';
  const title = `${name} — סוכן נסיעות | Dealim`;
  const description = agent.about ? agent.about.slice(0, 160) : `דילי טיסות ומלונות בלעדיים מ${name} — סוכן נסיעות מאומת ב-Dealim`;
  const pageUrl = `${SITE_URL}/agent/${agent.slug}`;
  const imageUrl = agent.cover_url || agent.logo_url || null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TravelAgency',
        '@id': `${pageUrl}#agency`,
        name,
        url: pageUrl,
        image: imageUrl || `${SITE_URL}/og-image.svg`,
        description,
        parentOrganization: { '@type': 'Organization', name: 'Dealim', url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Dealim', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'סוכנים', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 3, name, item: pageUrl },
        ],
      },
    ],
  };
  return { title, description, imageUrl, pageUrl, jsonLd };
}

async function fetchPropertyForOg(id) {
  try {
    const [rows] = await getPool().query(
      `SELECT p.*, a.business_name AS owner_business_name, a.slug AS owner_slug
       FROM properties p LEFT JOIN agents a ON a.id = p.owner_id
       WHERE p.id = ? AND p.status != 'hidden' AND p.opted_out = 0`,
      [id]
    );
    if (!rows[0]) return null;
    const property = rows[0];
    if (typeof property.owner_images === 'string') {
      try { property.owner_images = JSON.parse(property.owner_images); } catch { property.owner_images = null; }
    }
    return property;
  } catch { return null; }
}

async function fetchOwnerForOg(slug) {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT id, slug, business_name, about, logo_url, cover_url FROM agents WHERE slug = ? AND status = 'approved'`,
      [slug]
    );
    const owner = rows[0];
    if (!owner) return null;
    const [propertyRows] = await pool.query(
      `SELECT id, name, region, city, base_price_night, currency FROM properties
       WHERE owner_id = ? AND status IN ('claimed','active') AND opted_out = 0
       ORDER BY updated_at DESC LIMIT 12`,
      [owner.id]
    );
    return { ...owner, properties: propertyRows };
  } catch { return null; }
}

function buildPropertySeoBody(property) {
  const name = esc(property.name || '');
  const price = property.base_price_night ? `${Math.round(property.base_price_night).toLocaleString('he-IL')} ${property.currency || 'ILS'}` : '';
  const facts = [
    property.region        && `<span>📍 ${esc(regionLabelHe(property.region))}${property.city ? `, ${esc(property.city)}` : ''}</span>`,
    property.guest_capacity && `<span>👥 עד ${property.guest_capacity} אורחים</span>`,
    property.bedrooms      && `<span>🛏️ ${property.bedrooms} חדרי שינה</span>`,
    price                   && `<span>💰 ${price} ללילה</span>`,
  ].filter(Boolean).join('');

  const desc = property.description
    ? esc(property.description.slice(0, 160))
    : `${esc(propertyTypeLabelHe(property.property_type))} ב${esc(regionLabelHe(property.region))}, ישירות מבעל הנכס.`;

  return `<div id="ssr" style="font-family:system-ui,sans-serif;direction:rtl;padding:1.25rem 1.5rem;max-width:740px;margin:0 auto;color:#1e293b">
<nav style="font-size:.82rem;color:#64748b;margin-bottom:.75rem">
  <a href="${SITE_URL}" style="color:#2563eb">Dealim</a> ›
  <a href="${SITE_URL}/" style="color:#2563eb">צימרים ווילות</a> ›
  <span>${name}</span>
</nav>
<h1 style="font-size:1.55rem;line-height:1.3;margin:0 0 .4rem">${name}${price ? ` — ${price} ללילה` : ''}</h1>
<p style="font-size:.93rem;color:#475569;margin:0 0 .75rem">${desc}</p>
<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem;font-size:.87rem">${facts.split('</span>').filter(Boolean).map(f => `${f}</span>`).join('')}</div>
${property.status === 'unclaimed' ? `<p style="font-size:.78rem;color:#94a3b8">המידע בעמוד זה נאסף ממקורות פומביים ועשוי להיות לא מעודכן.${property.source_url ? ` <a href="${esc(property.source_url)}" style="color:#2563eb">לעמוד הרשמי</a>` : ''}</p>` : ''}
</div>`;
}

function buildOwnerSeoBody(owner) {
  const name = esc(owner.business_name || '');
  const properties = owner.properties || [];
  const propertyList = properties.map(p => {
    const price = p.base_price_night ? ` (${Math.round(p.base_price_night)} ${p.currency || 'ILS'})` : '';
    return `<li><a href="${SITE_URL}/property/${p.id}" style="color:#2563eb">${esc(p.name)}${price}</a></li>`;
  }).join('');

  const about = owner.about ? esc(owner.about.slice(0, 220)) : `נכסים ישירות מ${name} — בעל צימר/וילה מאומת ב-Dealim.`;

  return `<div id="ssr" style="font-family:system-ui,sans-serif;direction:rtl;padding:1.25rem 1.5rem;max-width:740px;margin:0 auto;color:#1e293b">
<nav style="font-size:.82rem;color:#64748b;margin-bottom:.75rem">
  <a href="${SITE_URL}" style="color:#2563eb">Dealim</a> ›
  <a href="${SITE_URL}/" style="color:#2563eb">בעלי נכסים</a> ›
  <span>${name}</span>
</nav>
<h1 style="font-size:1.55rem;line-height:1.3;margin:0 0 .4rem">${name}</h1>
<p style="font-size:.93rem;color:#475569;margin:0 0 .75rem">${about}</p>
${propertyList ? `<h2 style="font-size:1rem;margin:.5rem 0 .3rem">נכסים</h2><ul style="padding-right:1.2rem;margin:.3rem 0 .75rem;font-size:.9rem">${propertyList}</ul>` : ''}
</div>`;
}

function regionLabelHe(value) {
  const labels = {
    north: 'הצפון', galilee: 'הגליל', golan: 'הגולן', carmel: 'הכרמל', center: 'המרכז',
    jerusalem: 'ירושלים', south: 'הדרום', dead_sea: 'ים המלח', eilat: 'אילת',
  };
  return labels[value] || value || '';
}

function propertyTypeLabelHe(value) {
  const labels = { zimmer: 'צימר', villa: 'וילה', cottage: 'בקתה', suite: 'סוויטה' };
  return labels[value] || value || 'נכס';
}

function propertyToOgMeta(property) {
  const name = property.name || '';
  const price = property.base_price_night ? `${Math.round(property.base_price_night)} ${property.currency || 'ILS'}` : '';
  const title = `${name}${price ? ` — ${price}/לילה` : ''} | Dealim`;
  const parts = [];
  parts.push(`📍 ${regionLabelHe(property.region)}${property.city ? `, ${property.city}` : ''}`);
  if (property.guest_capacity) parts.push(`עד ${property.guest_capacity} אורחים`);
  if (property.description) parts.push(property.description.slice(0, 80));
  const description = parts.join(' · ') || `${propertyTypeLabelHe(property.property_type)} ב${regionLabelHe(property.region)} — Dealim`;
  const pageUrl = `${SITE_URL}/property/${property.id}`;
  const imageUrl = (property.owner_images && property.owner_images[0]) || null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': property.status === 'unclaimed' ? 'LodgingBusiness' : 'Product',
        '@id': `${pageUrl}#listing`,
        name: title,
        image: imageUrl || `${SITE_URL}/og-image.svg`,
        description,
        url: pageUrl,
        ...(property.base_price_night ? {
          offers: {
            '@type': 'Offer',
            price: String(Math.round(property.base_price_night)),
            priceCurrency: property.currency || 'ILS',
            url: pageUrl,
            availability: 'https://schema.org/InStock',
          },
        } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Dealim', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'צימרים ווילות', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 3, name, item: pageUrl },
        ],
      },
    ],
  };
  return { title, description, imageUrl, pageUrl, jsonLd };
}

function ownerToOgMeta(owner) {
  const name = owner.business_name || '';
  const title = `${name} — בעל נכס | Dealim`;
  const description = owner.about ? owner.about.slice(0, 160) : `נכסים ישירות מ${name} — בעל צימר/וילה מאומת ב-Dealim`;
  const pageUrl = `${SITE_URL}/owner/${owner.slug}`;
  const imageUrl = owner.cover_url || owner.logo_url || null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${pageUrl}#owner`,
        name,
        url: pageUrl,
        image: imageUrl || `${SITE_URL}/og-image.svg`,
        description,
        parentOrganization: { '@type': 'Organization', name: 'Dealim', url: SITE_URL },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Dealim', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'בעלי נכסים', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 3, name, item: pageUrl },
        ],
      },
    ],
  };
  return { title, description, imageUrl, pageUrl, jsonLd };
}

// ── App factory ───────────────────────────────────────────────────────────────

export function createApp() {
  const app = express();

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  app.use(helmet({
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    // CSP managed separately — would need per-request nonces for this SPA.
    contentSecurityPolicy: false,

    // Google Sign-In (GIS) embeds an iframe from accounts.google.com/gsi/transform.
    // Helmet 7+ enables COEP: require-corp by default, which causes the browser to
    // block that iframe because Google does not send Cross-Origin-Resource-Policy.
    // Result: blank white iframe. Disable COEP so the iframe loads.
    crossOriginEmbedderPolicy: false,

    // Helmet 7+ also sets COOP: same-origin by default, which severs the link
    // between the opener window and the Google OAuth popup, breaking the auth flow.
    // same-origin-allow-popups is the OAuth-safe policy: it still isolates us from
    // unexpected openers while allowing popups we open (the Google consent screen)
    // to communicate back via window.opener.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  }));
  // Additional header not covered by Helmet
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  // ── CORS ───────────────────────────────────────────────────────────────────
  const allowedOrigins = buildCorsOrigins();
  app.use(cors({
    origin: (origin, cb) => {
      // Allow same-origin requests (e.g. SSR, health checks) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }));

  // ── Request logging ────────────────────────────────────────────────────────
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
  app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // ── robots.txt ─────────────────────────────────────────────────────────────
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(
      `User-agent: *\n` +
      `Allow: /\n` +
      `Disallow: /admin\n` +
      `Disallow: /owner/dashboard\n` +
      `Disallow: /account\n` +
      `Disallow: /api/\n` +
      `\n` +
      `Sitemap: ${SITE_URL}/sitemap.xml\n`
    );
  });

  // ── Sitemap ────────────────────────────────────────────────────────────────
  app.get('/sitemap.xml', async (_req, res) => {
    try {
      const pool = getPool();
      // Flight deals/agents are retired (see README) — no longer promoted for crawling.
      // Properties: unclaimed listings are still real, useful content (factual info + source
      // link), so they're included same as claimed/active — only hidden/opted-out are excluded.
      const [properties] = await pool.query(
        `SELECT id, updated_at, status FROM properties
         WHERE status != 'hidden' AND opted_out = 0
         ORDER BY updated_at DESC LIMIT 1000`
      );
      const [owners] = await pool.query(
        `SELECT DISTINCT a.slug, a.updated_at FROM agents a
         JOIN properties p ON p.owner_id = a.id
         WHERE a.status='approved' AND a.account_type='property_owner'
         ORDER BY a.updated_at DESC LIMIT 500`
      );

      const staticPages = [
        { loc: `${SITE_URL}/`, freq: 'hourly', priority: '1.0' },
        { loc: `${SITE_URL}/register`, freq: 'monthly', priority: '0.5' },
        { loc: `${SITE_URL}/terms`, freq: 'yearly', priority: '0.2' },
        { loc: `${SITE_URL}/privacy`, freq: 'yearly', priority: '0.2' },
        { loc: `${SITE_URL}/accessibility`, freq: 'yearly', priority: '0.2' },
      ];

      const urls = [
        ...staticPages.map(p =>
          `  <url><loc>${p.loc}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
        ),
        ...properties.map(p => {
          const lastmod = p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : '';
          const priority = p.status === 'active' || p.status === 'claimed' ? '0.8' : '0.5';
          return `  <url><loc>${SITE_URL}/property/${p.id}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>daily</changefreq><priority>${priority}</priority></url>`;
        }),
        ...owners.map(o => {
          const lastmod = o.updated_at ? new Date(o.updated_at).toISOString().slice(0, 10) : '';
          return `  <url><loc>${SITE_URL}/owner/${o.slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.65</priority></url>`;
        }),
      ];

      res.type('application/xml').send(
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.join('\n') + '\n' +
        `</urlset>\n`
      );
    } catch (err) {
      console.error('[sitemap] error:', err.message);
      res.status(500).type('text/plain').send('Sitemap temporarily unavailable');
    }
  });

  // ── API routes ─────────────────────────────────────────────────────────────
  app.use('/api/deals', dealsRouter);
  app.use('/api/personal-radar', personalRadarRouter);
  app.use('/api/stats', statsRouter);
  app.use('/api/images', imagesRouter);
  app.use('/api/config', configRouter);
  app.use('/api/packages', packagesRouter);
  app.use('/api/properties', propertiesRouter);
  app.use('/api/remove', removeRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/agents', agentsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/music', musicRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/contact', contactRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── Dynamic OG meta-tag pages (before static file serving) ────────────────
  if (fs.existsSync(WEB_INDEX_HTML)) {
    const indexHtml = fs.readFileSync(WEB_INDEX_HTML, 'utf8');

    // Homepage: inject ItemList + FAQ schema + crawlable deal links for Googlebot
    app.get('/', async (req, res) => {
      try {
        const [properties] = await getPool().query(
          `SELECT id, name, region, city, base_price_night, currency, owner_images
           FROM properties WHERE status != 'hidden' AND opted_out = 0
           ORDER BY updated_at DESC LIMIT 40`
        );
        for (const p of properties) {
          if (typeof p.owner_images === 'string') {
            try { p.owner_images = JSON.parse(p.owner_images); } catch { p.owner_images = null; }
          }
        }

        const itemList = {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          name: 'צימרים ווילות בישראל — Dealim',
          description: 'צימרים ווילות ישירות מבעלי הנכס בישראל',
          numberOfItems: properties.length,
          itemListElement: properties.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              '@id': `${SITE_URL}/property/${p.id}`,
              name: esc(p.name || ''),
              url: `${SITE_URL}/property/${p.id}`,
              image: p.owner_images?.[0] || `${SITE_URL}/og-image.svg`,
              ...(p.base_price_night ? {
                offers: {
                  '@type': 'Offer',
                  price: String(Math.round(p.base_price_night)),
                  priceCurrency: p.currency || 'ILS',
                  availability: 'https://schema.org/InStock',
                  url: `${SITE_URL}/property/${p.id}`,
                }
              } : {}),
            },
          })),
        };

        const faqSchema = {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: 'איך מוצאים צימר או וילה בישראל?',
              acceptedAnswer: { '@type': 'Answer', text: 'ב-Dealim תמצאו צימרים ווילות ישירות מבעלי הנכס בישראל — ללא עמלות סוכנות, ללא מתווכים. חלק מהנכסים מאומתים ע"י הבעלים, וחלקם עדיין ממתינים לאימות.' },
            },
            {
              '@type': 'Question',
              name: 'מה ההבדל בין נכס מאומת ללא מאומת?',
              acceptedAnswer: { '@type': 'Answer', text: 'נכס מאומת פירושו שבעל הנכס אישר את הפרטים ומנהל אותו בעצמו באתר. נכס שטרם אומת מוצג עם מידע עובדתי בלבד וקישור לאתר הרשמי של הצימר.' },
            },
            {
              '@type': 'Question',
              name: 'אילו אזורים קיימים ב-Dealim?',
              acceptedAnswer: { '@type': 'Answer', text: 'Dealim מציג נכסים בכל אזורי ישראל — הצפון, הגליל, הגולן, הכרמל, המרכז, ירושלים, הדרום, ים המלח ואילת.' },
            },
            {
              '@type': 'Question',
              name: 'איך מזמינים צימר דרך Dealim?',
              acceptedAnswer: { '@type': 'Answer', text: 'נכנסים לעמוד הנכס, ממלאים טופס בקשת הזמנה או פונים ישירות ב-WhatsApp לבעל הנכס.' },
            },
          ],
        };

        const injectedSchemas = [itemList, faqSchema]
          .map(s => `<script type="application/ld+json">${JSON.stringify(s).replace(/<\//g, '<\\/')}</script>`)
          .join('\n    ');

        // Crawlable property links — readable by Googlebot to discover property pages immediately
        const propertyListHtml = properties.map(p => {
          const name = esc(p.name || 'נכס');
          const price = p.base_price_night ? ` — ${Math.round(p.base_price_night)} ${p.currency || 'ILS'}` : '';
          return `<li><a href="/property/${p.id}">${name}${price}</a></li>`;
        }).join('');

        const homeSsrBody = `<div id="ssr" style="font-family:system-ui,sans-serif;direction:rtl;padding:1rem 1.5rem;max-width:900px;margin:0 auto">
<h1 style="font-size:1.6rem;margin:0 0 .4rem">צימרים ווילות בישראל — Dealim</h1>
<p style="color:#475569;margin:0 0 1rem">נכסים ישירות מבעלי הצימרים והווילות בישראל. ללא עמלות, ללא מתווכים.</p>
<h2 style="font-size:1rem;margin:0 0 .4rem">נכסים עדכניים</h2>
<ul style="list-style:disc;padding-right:1.2rem;column-count:2;font-size:.9rem">${propertyListHtml}</ul>
<p style="font-size:.82rem;color:#94a3b8;margin-top:.75rem">
  קטגוריות: צימרים בצפון · צימרים עם ג'קוזי · וילות עם בריכה · צימרים בגליל · נכסים כשרים · צימרים ידידותיים לילדים
</p>
</div>`;

        const html = indexHtml
          .replace('</head>', `    ${injectedSchemas}\n  </head>`)
          .replace('<div id="root"></div>', `<div id="root">${homeSsrBody}</div>`);

        res.type('text/html').send(html);
      } catch {
        res.sendFile(WEB_INDEX_HTML);
      }
    });

    // /deal/:id — agent deal share page
    app.get('/deal/:id(\\d+)', async (req, res, next) => {
      try {
        const deal = await fetchDealForOg(req.params.id);
        if (!deal) return next();
        const meta = dealToOgMeta(deal);
        // Inject rich SSR body so Googlebot reads deal content without waiting for JS
        const html = buildOgHtml(indexHtml, meta)
          .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="product" />')
          .replace('<div id="root"></div>', `<div id="root">${buildDealSeoBody(deal)}</div>`);
        res.type('text/html').send(html);
      } catch { next(); }
    });

    // /agent/:slug — agent profile share page
    app.get('/agent/:slug([a-z0-9-]+)', async (req, res, next) => {
      try {
        const agent = await fetchAgentForOg(req.params.slug);
        if (!agent) return next();
        const meta = agentToOgMeta(agent);
        const html = buildOgHtml(indexHtml, meta)
          .replace('<div id="root"></div>', `<div id="root">${buildAgentSeoBody(agent)}</div>`);
        res.type('text/html').send(html);
      } catch { next(); }
    });

    // /property/:id — property share page (claimed + unclaimed both render; only hidden/opted-out 404)
    app.get('/property/:id(\\d+)', async (req, res, next) => {
      try {
        const property = await fetchPropertyForOg(req.params.id);
        if (!property) return next();
        const meta = propertyToOgMeta(property);
        const html = buildOgHtml(indexHtml, meta)
          .replace('<meta property="og:type" content="website" />', '<meta property="og:type" content="product" />')
          .replace('<div id="root"></div>', `<div id="root">${buildPropertySeoBody(property)}</div>`);
        res.type('text/html').send(html);
      } catch { next(); }
    });

    // /owner/:slug — owner profile share page
    app.get('/owner/:slug([a-z0-9-]+)', async (req, res, next) => {
      try {
        const owner = await fetchOwnerForOg(req.params.slug);
        if (!owner) return next();
        const meta = ownerToOgMeta(owner);
        const html = buildOgHtml(indexHtml, meta)
          .replace('<div id="root"></div>', `<div id="root">${buildOwnerSeoBody(owner)}</div>`);
        res.type('text/html').send(html);
      } catch { next(); }
    });

    // Static assets (JS, CSS, images)
    app.use(express.static(WEB_DIST_DIR));

    // SPA fallback for all other routes
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(WEB_INDEX_HTML);
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
