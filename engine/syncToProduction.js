import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });

import mysql from 'mysql2/promise';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AMENITY_FIELDS } from '../server/store/propertyStore.js';

// One-way LOCAL -> PRODUCTION sync for auto-collected properties only. Never reads/writes
// manually-created (source='manual') rows, never deletes anything, and only ever INSERTs a brand
// new property (as unclaimed/pending — same as a fresh engine find) or refreshes the content
// fields of a row it created on an earlier sync run that no human in production has acted on yet.
// The moment a production admin approves/rejects/claims a synced property, this script never
// touches that row again — see the `existing` branch below.

// scripts/seedDemoProperties.js seeds `source_url: https://example-N.co.il`, and the admin
// dry-run route (server/routes/admin.js /engine/run) crawls engine/fixtures/ on localhost ports —
// neither is a real listing. Excluded by hostname so local dev/test data can never leak into
// production regardless of which local DB this script is pointed at.
const FIXTURE_HOSTNAME_PATTERNS = [/^localhost$/i, /^example-/i];

function isFixtureUrl(sourceUrl) {
  try {
    return FIXTURE_HOSTNAME_PATTERNS.some((p) => p.test(new URL(sourceUrl).hostname));
  } catch {
    return true; // unparsable source_url can't be trusted as a real listing either
  }
}

// Everything here is scraped/extracted content — safe to refresh on an untouched production row.
// Deliberately excludes owner_id/status/source/auto_review_status/opted_out/do_not_contact (only
// ever set explicitly below, never copied from local) and source_url (the dedup key itself).
const PROPERTY_CONTENT_FIELDS = [
  'name', 'description', 'property_type', 'region', 'city', 'address', 'latitude', 'longitude',
  'guest_capacity', 'bedrooms', 'beds', 'bathrooms',
  ...AMENITY_FIELDS,
  'kosher_level', 'base_price_night', 'weekend_price', 'holiday_price', 'cleaning_fee', 'min_nights', 'currency',
  'source_image_urls', 'extraction_confidence', 'phone', 'whatsapp', 'email', 'website',
  'confidence', 'collected_at', 'view_type', 'nearby_attractions',
];

const UNIT_CONTENT_FIELDS = [
  'name', 'description', 'max_guests', 'bedrooms', 'beds', 'bathrooms',
  'base_price_night', 'weekend_price', 'holiday_price', 'min_nights',
  'unit_amenities', 'images', 'sort_order', 'is_active', 'bed_config',
];

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function backupProduction(prodUrl) {
  const url = new URL(prodUrl);
  const dir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '_');
  const file = path.join(dir, `prod_backup_${stamp}.sql`);
  const fd = fs.openSync(file, 'w');
  try {
    execFileSync(
      'mysqldump',
      [
        '--single-transaction', '--routines', '--triggers',
        '-h', url.hostname,
        '-P', url.port || '3306',
        '-u', decodeURIComponent(url.username),
        decodeURIComponent(url.pathname.replace(/^\//, '')),
      ],
      {
        // MYSQL_PWD instead of -p<password> so the password never shows up in `ps` output.
        env: { ...process.env, MYSQL_PWD: decodeURIComponent(url.password) },
        stdio: ['ignore', fd, 'pipe'],
        maxBuffer: 1024 * 1024 * 1024,
      }
    );
  } finally {
    fs.closeSync(fd);
  }
  const size = fs.statSync(file).size;
  if (size < 1024) {
    throw new Error(`Backup file suspiciously small (${size} bytes) at ${file} — aborting without touching production.`);
  }
  return { file, size };
}

async function main() {
  const prodUrl = process.env.PROD_MYSQL_URL;
  if (!prodUrl) {
    console.error('[sync] PROD_MYSQL_URL is not set. See "הרצה" in ENGINE-RUNBOOK.md — it needs to point at the production MySQL PUBLIC proxy URL (railway variables --service MySQL --kv | grep MYSQL_PUBLIC_URL), stored in .env.production.local (gitignored).');
    process.exit(1);
  }

  console.log('[sync] Backing up production database (mysqldump, full DB, before touching anything)...');
  const backup = backupProduction(prodUrl);
  console.log(`[sync] Backup created: ${backup.file} (${(backup.size / 1024 / 1024).toFixed(2)} MB)`);

  const poolOpts = { waitForConnections: true, connectionLimit: 5, queueLimit: 0, timezone: 'Z', decimalNumbers: true };
  const localPool = mysql.createPool({
    host: process.env.MYSQLHOST || 'localhost',
    port: Number(process.env.MYSQLPORT || 3306),
    user: process.env.MYSQLUSER || 'root',
    password: process.env.MYSQLPASSWORD || '',
    database: process.env.MYSQLDATABASE || 'railway',
    ...poolOpts,
  });
  const prodPool = mysql.createPool({ uri: prodUrl, ...poolOpts });

  const report = { created: 0, updated: 0, skippedExisting: 0, skippedFixture: 0, failed: [] };

  try {
    const [localRows] = await localPool.query(
      `SELECT * FROM properties
       WHERE source = 'auto' AND source_url IS NOT NULL AND opted_out = 0 AND do_not_contact = 0
         AND deleted_at IS NULL AND status != 'hidden'`
    );
    console.log(`[sync] ${localRows.length} auto-collected candidate(s) in local DB.`);

    for (const local of localRows) {
      if (isFixtureUrl(local.source_url)) {
        report.skippedFixture += 1;
        continue;
      }

      try {
        const [[existing]] = await prodPool.query(
          'SELECT id, status, auto_review_status, owner_id, opted_out FROM properties WHERE source_url = ? LIMIT 1',
          [local.source_url]
        );

        if (!existing) {
          const cols = [...PROPERTY_CONTENT_FIELDS, 'source_url', 'owner_id', 'status', 'source', 'auto_review_status', 'opted_out', 'do_not_contact', 'created_at', 'updated_at'];
          const values = [
            ...PROPERTY_CONTENT_FIELDS.map((f) => local[f] ?? null),
            local.source_url, null, 'unclaimed', 'auto', 'pending', 0, 0, local.created_at, nowStr(),
          ];
          const [ins] = await prodPool.query(
            `INSERT INTO properties (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
            values
          );
          const newId = ins.insertId;

          const [localUnits] = await localPool.query('SELECT * FROM property_units WHERE property_id = ? ORDER BY sort_order', [local.id]);
          for (const unit of localUnits) {
            const ucols = [...UNIT_CONTENT_FIELDS, 'property_id', 'created_at', 'updated_at'];
            const uvalues = [...UNIT_CONTENT_FIELDS.map((f) => unit[f] ?? null), newId, unit.created_at, nowStr()];
            await prodPool.query(`INSERT INTO property_units (${ucols.join(', ')}) VALUES (${ucols.map(() => '?').join(', ')})`, uvalues);
          }
          report.created += 1;
        } else if (existing.status === 'unclaimed' && existing.auto_review_status === 'pending' && existing.owner_id === null && existing.opted_out === 0) {
          // Untouched since it was synced in — refresh scraped content only, never units/status/review.
          const setSql = PROPERTY_CONTENT_FIELDS.map((f) => `${f} = ?`).join(', ');
          await prodPool.query(
            `UPDATE properties SET ${setSql}, updated_at = ? WHERE id = ?`,
            [...PROPERTY_CONTENT_FIELDS.map((f) => local[f] ?? null), nowStr(), existing.id]
          );
          report.updated += 1;
        } else {
          report.skippedExisting += 1;
        }
      } catch (err) {
        report.failed.push({ name: local.name, source_url: local.source_url, error: err.message });
      }
    }
  } finally {
    await localPool.end();
    await prodPool.end();
  }

  console.log('\n[sync] ===== Report =====');
  console.log(`  Created (new, unclaimed, pending review in production): ${report.created}`);
  console.log(`  Updated (content refreshed — still untouched in production): ${report.updated}`);
  console.log(`  Skipped — already reviewed/claimed in production, left alone: ${report.skippedExisting}`);
  console.log(`  Skipped — local fixture/demo-seed data, never real: ${report.skippedFixture}`);
  console.log(`  Failed: ${report.failed.length}`);
  if (report.failed.length > 0) {
    for (const f of report.failed) console.log(`    - ${f.name} (${f.source_url}): ${f.error}`);
  }
  console.log(`[sync] Backup: ${backup.file}`);
}

main().catch((err) => {
  console.error('[sync] FATAL:', err);
  process.exit(1);
});
