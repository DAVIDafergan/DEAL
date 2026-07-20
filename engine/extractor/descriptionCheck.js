/**
 * Step 3.3 compliance rule: a generated description must never copy 8+ consecutive words from
 * the source page. Checked automatically — if it fails, the caller must re-generate (or, after
 * one retry, drop the description entirely rather than risk publishing copied marketing copy).
 */
export function hasCopiedPhrase(description, sourceText, windowSize = 8) {
  if (!description || !sourceText) return false;

  const normalize = (s) => s.toLowerCase().replace(/[.,!?;:"'()]/g, '').split(/\s+/).filter(Boolean);
  const descWords = normalize(description);
  const sourceWords = normalize(sourceText);

  if (descWords.length < windowSize) return false;

  const sourceWindows = new Set();
  for (let i = 0; i <= sourceWords.length - windowSize; i++) {
    sourceWindows.add(sourceWords.slice(i, i + windowSize).join(' '));
  }

  for (let i = 0; i <= descWords.length - windowSize; i++) {
    if (sourceWindows.has(descWords.slice(i, i + windowSize).join(' '))) return true;
  }
  return false;
}
