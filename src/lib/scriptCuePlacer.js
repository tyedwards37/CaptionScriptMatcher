function truncate(text, max = 40) {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function isCueInTranscriptSpan(cue, firstMatchedIndex, lastMatchedIndex) {
  const afterIdx = cue.afterDialogueIndex;

  if (afterIdx == null) {
    return cue.beforeDialogueIndex != null && cue.beforeDialogueIndex <= lastMatchedIndex;
  }

  return afterIdx >= firstMatchedIndex && afterIdx <= lastMatchedIndex;
}

function formatPlacement(cue, scriptEntries, sourceIndexToCaption) {
  const afterEntry =
    cue.afterDialogueIndex != null ? scriptEntries[cue.afterDialogueIndex] : null;
  const beforeEntry =
    cue.beforeDialogueIndex != null ? scriptEntries[cue.beforeDialogueIndex] : null;

  const afterCaption =
    afterEntry && sourceIndexToCaption.get(afterEntry.sourceIndex);
  const beforeCaption =
    beforeEntry && sourceIndexToCaption.get(beforeEntry.sourceIndex);

  if (afterCaption && beforeCaption) {
    return `Between caption #${afterCaption.index} (${afterCaption.startTime}) and caption #${beforeCaption.index} (${beforeCaption.startTime})`;
  }

  if (afterCaption) {
    const dialogue = truncate(afterCaption.matchedScriptDialogue || afterCaption.originalText);
    return `After caption #${afterCaption.index} at ${afterCaption.endTime} — following [${afterCaption.speaker}]: "${dialogue}"`;
  }

  if (beforeCaption) {
    const dialogue = truncate(beforeCaption.matchedScriptDialogue || beforeCaption.originalText);
    return `Before caption #${beforeCaption.index} at ${beforeCaption.startTime} — preceding [${beforeCaption.speaker}]: "${dialogue}"`;
  }

  if (afterEntry && beforeEntry) {
    return `Between ${afterEntry.speaker} ("${truncate(afterEntry.dialogue)}") and ${beforeEntry.speaker} ("${truncate(beforeEntry.dialogue)}") in script`;
  }

  if (afterEntry) {
    return `After ${afterEntry.speaker}: "${truncate(afterEntry.dialogue)}" in script (no matching caption timing)`;
  }

  if (beforeEntry) {
    return `Before ${beforeEntry.speaker}: "${truncate(beforeEntry.dialogue)}" in script (no matching caption timing)`;
  }

  return `Script line ${cue.scriptLineNumber}`;
}

/**
 * Map parsed script cues to transcript placement hints.
 * Only includes cues within the matched transcript span in the script.
 */
export function getScriptCuePlacements(cues, scriptEntries, matchResults, matchedScriptIndices) {
  if (!cues.length || matchedScriptIndices.size === 0) {
    return [];
  }

  const firstMatchedIndex = Math.min(...matchedScriptIndices);
  const lastMatchedIndex = Math.max(...matchedScriptIndices);

  const sourceIndexToCaption = new Map();
  for (const caption of matchResults) {
    if (caption.scriptSourceIndex != null) {
      sourceIndexToCaption.set(caption.scriptSourceIndex, caption);
    }
  }

  return cues
    .filter((cue) => isCueInTranscriptSpan(cue, firstMatchedIndex, lastMatchedIndex))
    .map((cue) => ({
      cueIndex: cue.cueIndex,
      type: cue.type,
      text: cue.text,
      rawLine: cue.rawLine,
      scriptLineNumber: cue.scriptLineNumber,
      placement: formatPlacement(cue, scriptEntries, sourceIndexToCaption),
      status: 'Review only — not exported to SRT',
    }));
}
