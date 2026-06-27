import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// תיקיית ה-build הסטטי של ה-frontend (נוצרת על ידי `npm run build` בתיקיית web)
const WEB_DIST_DIR = path.join(__dirname, '..', 'web', 'dist');
const WEB_INDEX_HTML = path.join(WEB_DIST_DIR, 'index.html');

export function createApp() {
  const app = express();

  app.use(cors());
  // Stripe webhooks need raw body — mount before express.json()
  app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

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

  // נתיב /api/* שלא תאם שום router — תמיד JSON, לעולם לא index.html
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // הגשת ה-frontend הבנוי (web/dist) — רק אם ה-build קיים, כדי לא לקרוס בסביבת dev
  // לפני שהורצה `npm run build`. ב-production (Railway) ה-build script דואג שזה יקרה.
  if (fs.existsSync(WEB_INDEX_HTML)) {
    app.use(express.static(WEB_DIST_DIR));

    // SPA fallback: כל נתיב GET שלא תאם קובץ סטטי (למשל ניווט פנימי בריאקט) מקבל index.html
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
