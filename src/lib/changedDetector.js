/**
 * Detect whether corrected dialogue differs from original transcript
 * beyond simply adding a speaker tag.
 */

export function normalizeForComparison(text) {
  return text
    .replace(/\[[^\]]*\]:\s*/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function isChanged(originalText, finalText) {
  const normalizedOriginal = normalizeForComparison(originalText);
  const normalizedFinal = normalizeForComparison(finalText);
  return normalizedOriginal !== normalizedFinal;
}

export function formatCaptionText(speaker, dialogue) {
  if (!speaker) return dialogue;
  return `[${speaker}]: ${dialogue}`;
}
