import express from 'express';
import cors from 'cors';
import dealsRouter from './routes/deals.js';
import personalRadarRouter from './routes/personalRadar.js';
import statsRouter from './routes/stats.js';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/deals', dealsRouter);
  app.use('/api/personal-radar', personalRadarRouter);
  app.use('/api/stats', statsRouter);

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
