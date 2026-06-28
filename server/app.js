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
    const [rows] = await getPool().query(
      `SELECT slug, business_name, about, logo_url, cover_url
       FROM agents WHERE slug = ? AND status = 'approved'`,
      [slug]
    );
    return rows[0] || null;
  } catch { return null; }
}

function dealToOgMeta(deal) {
  const dest = deal.destination_name || deal.destination || '';
  const price = deal.price ? `${Math.round(deal.price)} ${deal.currency || ''}`.trim() : '';
  const title = `${dest}${price ? ` — ${price}` : ''} | Dealim`;
  const parts = [];
  if (deal.airline) parts.push(`✈️ ${deal.airline}`);
  if (deal.hotel_name) parts.push(`🏨 ${deal.hotel_name}`);
  if (deal.business_name) parts.push(`דרך ${deal.business_name}`);
  if (deal.description) parts.push(deal.description.slice(0, 80));
  const description = parts.join(' · ') || `דיל נסיעות ל${dest}`;
  const pageUrl = `${SITE_URL}/deal/${deal.id}`;
  const imageUrl = deal.photo_url || null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
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
      seller: deal.business_name ? { '@type': 'Organization', name: deal.business_name } : undefined,
    },
  };
  return { title, description, imageUrl, pageUrl, jsonLd };
}

function agentToOgMeta(agent) {
  const name = agent.business_name || '';
  const title = `${name} — סוכן נסיעות | Dealim`;
  const description = agent.about ? agent.about.slice(0, 160) : `דילי נסיעות בלעדיים מ${name} — דרך Dealim`;
  const pageUrl = `${SITE_URL}/agent/${agent.slug}`;
  const imageUrl = agent.cover_url || agent.logo_url || null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name,
    url: pageUrl,
    image: imageUrl || `${SITE_URL}/og-image.svg`,
    description,
  };
  return { title, description, imageUrl, pageUrl, jsonLd };
}

// ── App factory ───────────────────────────────────────────────────────────────

export function createApp() {
  const app = express();

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  app.use(helmet({
    // Keep HSTS from the original manual config
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    // Content Security Policy is left to defaults — enabling it for the SPA
    // would require careful nonce/hash configuration and is out of scope here.
    contentSecurityPolicy: false,
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
      `Disallow: /agent/dashboard\n` +
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
      const [deals] = await pool.query(
        `SELECT ad.id, ad.updated_at FROM agent_deals ad
         JOIN agents a ON a.id = ad.agent_id
         WHERE ad.status='approved' AND a.status='approved'
         ORDER BY ad.updated_at DESC LIMIT 1000`
      );
      const [agents] = await pool.query(
        `SELECT slug, updated_at FROM agents WHERE status='approved' ORDER BY updated_at DESC LIMIT 500`
      );

      const staticPages = [
        { loc: `${SITE_URL}/`, freq: 'hourly', priority: '1.0' },
        { loc: `${SITE_URL}/reels`, freq: 'hourly', priority: '0.9' },
        { loc: `${SITE_URL}/terms`, freq: 'yearly', priority: '0.3' },
        { loc: `${SITE_URL}/privacy`, freq: 'yearly', priority: '0.3' },
        { loc: `${SITE_URL}/accessibility`, freq: 'yearly', priority: '0.3' },
        { loc: `${SITE_URL}/register`, freq: 'monthly', priority: '0.4' },
      ];

      const urls = [
        ...staticPages.map(p =>
          `  <url><loc>${p.loc}</loc><changefreq>${p.freq}</changefreq><priority>${p.priority}</priority></url>`
        ),
        ...deals.map(d => {
          const lastmod = d.updated_at ? new Date(d.updated_at).toISOString().slice(0, 10) : '';
          return `  <url><loc>${SITE_URL}/deal/${d.id}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>daily</changefreq><priority>0.7</priority></url>`;
        }),
        ...agents.map(a => {
          const lastmod = a.updated_at ? new Date(a.updated_at).toISOString().slice(0, 10) : '';
          return `  <url><loc>${SITE_URL}/agent/${a.slug}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.6</priority></url>`;
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

    // /deal/:id — agent deal share page
    app.get('/deal/:id(\\d+)', async (req, res, next) => {
      try {
        const deal = await fetchDealForOg(req.params.id);
        if (!deal) return next(); // fall through to SPA
        const meta = dealToOgMeta(deal);
        const html = buildOgHtml(indexHtml, meta);
        res.type('text/html').send(html);
      } catch { next(); }
    });

    // /agent/:slug — agent profile share page
    app.get('/agent/:slug([a-z0-9-]+)', async (req, res, next) => {
      try {
        const agent = await fetchAgentForOg(req.params.slug);
        if (!agent) return next();
        const meta = agentToOgMeta(agent);
        const html = buildOgHtml(indexHtml, meta);
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
