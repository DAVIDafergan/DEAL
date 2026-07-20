import { findAutoPropertyByPhoneOrDomain } from '../../server/store/propertyStore.js';
import { normalizePhone, normalizeDomain } from '../../core/compliance/blocklist.js';

function tokenize(name) {
  return new Set((name || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean));
}

/** Simple token-overlap ratio — good enough for "is this plausibly the same listing" without a
 * full string-distance dependency. Step 3.4: "קרבה גיאוגרפית + דמיון שם" — geo isn't reliably
 * available from extraction in this build (no lat/long extraction yet, see SESSION-REPORT.md),
 * so this stage matches on city + name-similarity as the practical fallback. */
function nameSimilarity(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let shared = 0;
  for (const t of setA) if (setB.has(t)) shared += 1;
  return shared / Math.max(setA.size, setB.size);
}

const NAME_SIMILARITY_THRESHOLD = 0.5;

/**
 * Step 3.4 Deduplicator: phone -> domain -> city+name-similarity, in that priority order.
 * Returns the existing property row to merge into, or null for "this is a new property".
 */
export async function findDuplicate({ phone, whatsapp, sourceUrl, city, name }) {
  const normalizedPhone = normalizePhone(phone) || normalizePhone(whatsapp);
  if (normalizedPhone) {
    const byPhone = await findAutoPropertyByPhoneOrDomain({ phone: normalizedPhone });
    if (byPhone) return byPhone;
  }

  const domain = sourceUrl ? normalizeDomain(sourceUrl) : null;
  if (domain) {
    const byDomain = await findAutoPropertyByPhoneOrDomain({ domain });
    if (byDomain) return byDomain;
  }

  if (city && name) {
    // Practical fallback only — checks against properties already loaded in this same run via
    // the caller-supplied candidate list, since there's no cheap "search by city" DB index for
    // free-text name similarity. See engine/pipeline.js for how candidates are passed in.
    return null; // resolved by matchAgainstCandidates below when the caller has a candidate set
  }

  return null;
}

/** In-memory fallback matcher for the city+name-similarity tier, run against properties loaded
 * earlier in the *same* pipeline run (cheap; avoids a full-table scan for fuzzy name matching). */
export function matchAgainstCandidates(candidate, loadedThisRun) {
  for (const existing of loadedThisRun) {
    if (existing.city && candidate.city && existing.city === candidate.city) {
      if (nameSimilarity(existing.name, candidate.name) >= NAME_SIMILARITY_THRESHOLD) {
        return existing;
      }
    }
  }
  return null;
}
