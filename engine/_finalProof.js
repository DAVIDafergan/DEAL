import 'dotenv/config';
import { chromium } from 'playwright';
import { fetchPage } from './fetcher/pageFetcher.js';
import { extractProperty } from './extractor/extractProperty.js';
import { loadProperty } from './loader/loader.js';
import { connectWithRetry, getPool } from '../core/db/index.js';

// One real, verified individual zimmer listing, found via the fixed SeedSourceProvider chain:
// engine/discovery/seedSources.json's arava.co.il seed -> goarava.co.il (Arava tourism cluster,
// linked from the council's own site) -> "צימרים ואירוח בוטיק" (zimmer/boutique lodging) business
// directory -> this listing. Not guessed — every hop was fetched for real and inspected.
const TARGET_URL = 'http://goarava.co.il/business/%D7%A6%D7%99%D7%9E%D7%A8-%D7%90%D7%AA%D7%99%D7%98%D7%99%D7%95%D7%93-%D7%91%D7%A2%D7%A8%D7%91%D7%94/';

async function main() {
  await connectWithRetry();
  const browser = await chromium.launch({ args: ['--no-sandbox'] });

  console.log(`\n=== URL ===\n${TARGET_URL}`);

  console.log('\n--- 1. Fetcher ---');
  const fetched = await fetchPage(TARGET_URL, { browser });
  console.log('From cache:', fetched.fromCache);
  console.log('Visible text (first 1200 chars):\n', fetched.text.slice(0, 1200));
  console.log('\nMeta tags:', JSON.stringify(fetched.metaTags, null, 2));
  console.log('JSON-LD blocks:', fetched.jsonLd.length, JSON.stringify(fetched.jsonLd, null, 2));
  console.log('Phone matches:', fetched.phoneMatches);
  console.log('WhatsApp links:', fetched.whatsappLinks);
  console.log('Image URLs found (not downloaded):', fetched.imageUrls.length);

  console.log('\n--- 2. Extractor ---');
  const extraction = await extractProperty({
    pageText: fetched.text, sourceUrl: TARGET_URL,
    metaTags: fetched.metaTags, jsonLd: fetched.jsonLd,
    phoneMatches: fetched.phoneMatches, whatsappLinks: fetched.whatsappLinks,
  });
  console.log('Used RuleBasedExtractor:', extraction.usedRuleBasedExtractor);
  if (!extraction.ok) {
    console.error(`REJECTED — reason=${extraction.reason}, errors=${JSON.stringify(extraction.errors)}`);
    await browser.close();
    process.exit(1);
  }
  console.log('Per-field extraction result:');
  for (const [field, value] of Object.entries(extraction.data)) {
    console.log(`  ${field}:`, JSON.stringify(value));
  }
  console.log('Description rejected for copying source text:', extraction.descriptionRejectedForCopying);

  console.log('\n--- 3. Loader ---');
  const loadResult = await loadProperty(extraction.data, { sourceUrl: TARGET_URL, imageUrls: fetched.imageUrls }, []);
  console.log('Loader result:', JSON.stringify(loadResult, null, 2));

  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [loadResult.id]);
  console.log('\n--- Row saved in `properties` (local DB) ---');
  console.log(JSON.stringify(rows[0], null, 2));

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('UNCAUGHT FAILURE');
  console.error('name:', err.name, '| message:', err.message);
  console.error(err.stack);
  process.exit(1);
});
