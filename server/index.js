import 'dotenv/config';
import { createApp } from './app.js';
import { initializeSources } from '../sources/index.js';
import { initializeDistribution } from '../distribution/index.js';
import { DealPipeline } from './services/dealPipeline.js';

const PORT = process.env.PORT || 3001;

/** מפענח את משתנה הסביבה WATCHED_ROUTES (פורמט: "TLV-BCN,TLV-FCO") לרשימת מסלולים לסריקה */
function parseWatchedRoutes(env = process.env) {
  const raw = env.WATCHED_ROUTES || '';
  const daysAhead = Number(env.SCAN_DATE_OFFSET_DAYS || 30);
  const date = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return raw
    .split(',')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [origin, destination] = pair.split('-');
      return { origin, destination, date };
    })
    .filter((r) => r.origin && r.destination);
}

async function main() {
  const app = createApp();

  const sourceRegistry = initializeSources();
  const distributionManager = initializeDistribution();
  const whatsappRecipients = (process.env.WHATSAPP_RECIPIENTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const pipeline = new DealPipeline({ sourceRegistry, distributionManager, whatsappRecipients });
  const watchedRoutes = parseWatchedRoutes();

  if (sourceRegistry.listSources().length === 0) {
    console.warn('[deal-radar-pro] No flight sources configured (missing AMADEUS_API_KEY/SECRET) — scanning is disabled.');
  } else if (watchedRoutes.length === 0) {
    console.warn('[deal-radar-pro] No WATCHED_ROUTES configured — scanning is disabled.');
  } else {
    const intervalMinutes = Number(process.env.SCAN_INTERVAL_MINUTES || 60);
    const runScan = () => {
      pipeline.runScan(watchedRoutes).catch((err) => console.error('[deal-radar-pro] Scan failed:', err.message));
    };
    runScan();
    setInterval(runScan, intervalMinutes * 60 * 1000);
  }

  app.listen(PORT, () => {
    console.log(`[deal-radar-pro] Server listening on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('[deal-radar-pro] Fatal startup error:', err);
  process.exit(1);
});
