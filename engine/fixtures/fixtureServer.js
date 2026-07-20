import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Each fixture "site" gets its own localhost port — robots.txt and rate-limiting are both
// host-scoped, so distinct ports are the only way to simulate genuinely distinct sites without
// touching real DNS/hosts files. `robotsDisallow: true` reuses galilee-zimmer's content but
// serves a blocking robots.txt, to prove the Fetcher actually honors it end-to-end.
export const FIXTURE_SITES = {
  'galilee-zimmer': { port: 4101, contentDir: 'galilee-zimmer', robotsDisallow: false },
  'carmel-villa': { port: 4102, contentDir: 'carmel-villa', robotsDisallow: false },
  'jerusalem-suite': { port: 4103, contentDir: 'jerusalem-suite', robotsDisallow: false },
  'south-cottage': { port: 4104, contentDir: 'south-cottage', robotsDisallow: false },
  'golan-zimmer-update': { port: 4105, contentDir: 'golan-zimmer-update', robotsDisallow: false },
  'sparse-page': { port: 4106, contentDir: 'sparse-page', robotsDisallow: false },
  'robots-blocked-site': { port: 4107, contentDir: 'galilee-zimmer', robotsDisallow: true },
};

export async function startFixtureServers() {
  const servers = [];
  for (const [siteName, config] of Object.entries(FIXTURE_SITES)) {
    const app = express();
    app.get('/robots.txt', (_req, res) => {
      res.type('text/plain').send(config.robotsDisallow ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n');
    });
    app.use(express.static(path.join(__dirname, 'sites', config.contentDir)));
    // eslint-disable-next-line no-await-in-loop
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(config.port, '127.0.0.1', () => resolve(s));
      s.on('error', reject);
    });
    servers.push({ siteName, port: config.port, server, url: `http://localhost:${config.port}/` });
  }
  return servers;
}

export async function stopFixtureServers(servers) {
  await Promise.all(servers.map(({ server }) => new Promise((resolve) => server.close(() => resolve()))));
}
