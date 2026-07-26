import 'dotenv/config';
import { connectWithRetry } from '../core/db/index.js';
import { listPropertiesPendingReview, rejectAutoProperty } from '../server/store/propertyStore.js';

// 11.15 — one-off cleanup: the review queue's admission gate just got stricter (see
// engine/loader/loader.js), but that only guards *new* finds going forward — this retroactively
// re-checks everything already sitting in the queue (auto_review_status='pending') against the
// same rule and rejects (never hard-deletes — rejectAutoProperty sets status='hidden', keeping
// the row for audit) whatever wouldn't have been admitted today.

const MIN_DESCRIPTION_LENGTH = 20;

function hasRealDescription(description) {
  return Boolean(description && description.trim().length >= MIN_DESCRIPTION_LENGTH);
}

function failsGate(p) {
  const hasContact = Boolean(p.phone || p.whatsapp);
  const hasLocation = Boolean(p.city || p.region);
  const hasSubstance = Boolean(p.base_price_night) || Boolean(p.bedrooms) || hasRealDescription(p.description);
  if (!hasContact) return 'no_phone_or_whatsapp';
  if (!hasLocation) return 'no_identified_location';
  if (!hasSubstance) return 'no_price_bedrooms_or_description';
  return null;
}

async function main() {
  await connectWithRetry();
  const queue = await listPropertiesPendingReview();
  console.log(`[cleanReviewQueue] ${queue.length} propert(y/ies) currently in the review queue.`);

  const reasonCounts = {};
  let removed = 0;
  for (const p of queue) {
    const reason = failsGate(p);
    if (!reason) continue;
    await rejectAutoProperty(p.id);
    removed += 1;
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
    console.log(`[cleanReviewQueue] Rejected #${p.id} "${p.name}" — ${reason}`);
  }

  console.log(`\n[cleanReviewQueue] Removed ${removed} of ${queue.length} from the queue.`);
  console.log('[cleanReviewQueue] By reason:', reasonCounts);
  process.exit(0);
}

main().catch((err) => {
  console.error('[cleanReviewQueue] FAILED:', err);
  process.exit(1);
});
