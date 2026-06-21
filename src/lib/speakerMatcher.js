import { computeMatchScore } from './fuzzyMatcher.js';
import { formatCaptionText } from './changedDetector.js';

const DEFAULT_WINDOW = 15;
const DEFAULT_THRESHOLD = 60;

export function matchCaptionsToScript(captions, scriptEntries, options = {}) {
  const windowSize = options.windowSize ?? DEFAULT_WINDOW;
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;

  const matchedScriptIndices = new Set();
  let scriptPointer = 0;

  const results = captions.map((caption) => {
    const searchStart = scriptPointer;
    const searchEnd = Math.min(scriptEntries.length, scriptPointer + windowSize);

    let bestMatch = null;
    let bestScore = 0;
    let bestIndex = -1;

    for (let i = searchStart; i < searchEnd; i++) {
      const entry = scriptEntries[i];
      const score = computeMatchScore(caption.originalText, entry.dialogue);

      const alreadyUsed = matchedScriptIndices.has(i);
      const penalty = alreadyUsed ? 15 : 0;
      const adjustedScore = Math.max(0, score - penalty);

      if (adjustedScore > bestScore) {
        bestScore = adjustedScore;
        bestMatch = entry;
        bestIndex = i;
      }
    }

    if (bestMatch && bestScore >= threshold) {
      matchedScriptIndices.add(bestIndex);
      if (bestIndex >= scriptPointer) {
        scriptPointer = bestIndex + 1;
      }

      const finalText = formatCaptionText(bestMatch.speaker, bestMatch.dialogue);

      return {
        ...caption,
        matchedScriptDialogue: bestMatch.dialogue,
        speaker: bestMatch.speaker,
        scriptSourceIndex: bestMatch.sourceIndex,
        finalText,
        confidence: bestScore,
        needsReview: false,
        matched: true,
      };
    }

    return {
      ...caption,
      matchedScriptDialogue: '',
      speaker: '',
      scriptSourceIndex: null,
      finalText: caption.originalText,
      confidence: bestScore,
      needsReview: true,
      matched: false,
    };
  });

  let unmatchedScriptLines = [];

  if (matchedScriptIndices.size > 0) {
    const firstMatchedIndex = Math.min(...matchedScriptIndices);
    const lastMatchedIndex = Math.max(...matchedScriptIndices);

    unmatchedScriptLines = scriptEntries
      .filter(
        (_, index) =>
          !matchedScriptIndices.has(index) &&
          index > firstMatchedIndex &&
          index < lastMatchedIndex
      )
      .map((entry) => ({
        speaker: entry.speaker,
        dialogue: entry.dialogue,
        sourceIndex: entry.sourceIndex,
        status: 'Not present in transcript',
      }));
  }

  return { results, unmatchedScriptLines, matchedScriptIndices };
}
