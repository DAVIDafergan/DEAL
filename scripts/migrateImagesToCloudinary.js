import 'dotenv/config';
import { connectWithRetry, getPool } from '../core/db/index.js';
import { isCloudinaryConfigured, uploadImageToCloudinary } from '../media/cloudinaryUpload.js';

// 11.18 — one-off migration: properties/units created while IMAGE_STORAGE was (implicitly or
// explicitly) "db" have their photos as bytes in property_images, referenced elsewhere as
// "/api/images/<id>" URLs inside properties.owner_images / property_units.images JSON arrays.
// This uploads each still-referenced row's bytes to Cloudinary and rewrites every reference to
// the new secure_url — it never deletes the property_images row itself (kept as a fallback/
// audit trail; also matches the "don't delete data" constraint this migration was run under).
// Idempotent: a re-run only touches rows still referenced by a "/api/images/" URL somewhere, so
// already-migrated rows (and rows that were never referenced by any listing) are skipped.

function oldUrlFor(id) {
  return `/api/images/${id}`;
}

async function main() {
  if (!isCloudinaryConfigured()) {
    console.error('[migrateImagesToCloudinary] Cloudinary is not configured (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) — aborting.');
    process.exit(1);
  }

  await connectWithRetry();
  const pool = getPool();

  const [imageRows] = await pool.query(
    `SELECT id, property_id, unit_id, mime_type, bytes FROM property_images ORDER BY id ASC`
  );
  console.log(`[migrateImagesToCloudinary] ${imageRows.length} row(s) in property_images.`);

  const [properties] = await pool.query(`SELECT id, owner_images FROM properties WHERE owner_images IS NOT NULL`);
  const [units] = await pool.query(`SELECT id, images FROM property_units WHERE images IS NOT NULL`);

  let migrated = 0;
  let skippedNotReferenced = 0;
  let failed = 0;

  for (const row of imageRows) {
    const oldUrl = oldUrlFor(row.id);

    const referencingProperties = properties.filter((p) => {
      const arr = typeof p.owner_images === 'string' ? JSON.parse(p.owner_images) : p.owner_images;
      return Array.isArray(arr) && arr.includes(oldUrl);
    });
    const referencingUnits = units.filter((u) => {
      const arr = typeof u.images === 'string' ? JSON.parse(u.images) : u.images;
      return Array.isArray(arr) && arr.includes(oldUrl);
    });

    if (referencingProperties.length === 0 && referencingUnits.length === 0) {
      skippedNotReferenced += 1;
      continue;
    }

    try {
      const folder = `dealim/properties/${row.property_id || 'misc'}${row.unit_id ? `/units/${row.unit_id}` : ''}`;
      const newUrl = await uploadImageToCloudinary(row.bytes, { folder });

      for (const p of referencingProperties) {
        const arr = typeof p.owner_images === 'string' ? JSON.parse(p.owner_images) : p.owner_images;
        const next = arr.map((u) => (u === oldUrl ? newUrl : u));
        await pool.query('UPDATE properties SET owner_images = ? WHERE id = ?', [JSON.stringify(next), p.id]);
        p.owner_images = next; // keep in-memory copy consistent in case a later row also references this property
      }
      for (const u of referencingUnits) {
        const arr = typeof u.images === 'string' ? JSON.parse(u.images) : u.images;
        const next = arr.map((url) => (url === oldUrl ? newUrl : url));
        await pool.query('UPDATE property_units SET images = ? WHERE id = ?', [JSON.stringify(next), u.id]);
        u.images = next;
      }

      migrated += 1;
      console.log(`[migrateImagesToCloudinary] #${row.id} -> ${newUrl} (${referencingProperties.length} propert(y/ies), ${referencingUnits.length} unit(s) updated)`);
    } catch (err) {
      failed += 1;
      console.error(`[migrateImagesToCloudinary] #${row.id} FAILED: ${err.message}`);
    }
  }

  console.log(`\n[migrateImagesToCloudinary] Done. Migrated: ${migrated}. Already-migrated/unreferenced (skipped): ${skippedNotReferenced}. Failed: ${failed}. Total rows: ${imageRows.length}.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('[migrateImagesToCloudinary] FATAL:', err);
  process.exit(1);
});
