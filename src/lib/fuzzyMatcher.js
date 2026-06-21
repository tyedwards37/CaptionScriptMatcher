import { token_set_ratio, partial_ratio } from 'fuzzball';

export function normalizeForMatch(text) {
  return text
    .toLowerCase()
    .replace(/\[[^\]]*\]:\s*/g, '')
    .replace(/[^\w\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeMatchScore(transcriptText, scriptDialogue) {
  const a = normalizeForMatch(transcriptText);
  const b = normalizeForMatch(scriptDialogue);

  if (!a || !b) return 0;
  if (a === b) return 100;

  const setScore = token_set_ratio(a, b);
  const partialScore = partial_ratio(a, b);

  return Math.round(Math.max(setScore, partialScore * 0.95));
}
