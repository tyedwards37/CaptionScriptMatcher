/**
 * Parse screenplay/script text into structured dialogue entries.
 */

const SCENE_HEADING = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i;
const TRANSITION = /^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:)/i;
const PAGE_NUMBER = /^\d+\.$|^\s*\d+\s*$/;
const ALL_CAPS_SPEAKER = /^([A-Z][A-Z0-9\s.'\-]+):\s*(.*)$/;
const SPEAKER_ONLY = /^([A-Z][A-Z0-9\s.'\-]+)$/;
const CAPS_SFX_RUN = /\b([A-Z][A-Z0-9]*(?:[\s\-']+[A-Z][A-Z0-9]*)+)\b/g;
const CAPS_SFX_WORD = /\b([A-Z]{3,})\b/g;
const SFX_STOP_WORDS = new Set(['INT', 'EXT', 'CONT', 'CONTINUED', 'CUT', 'FADE', 'DISSOLVE']);

function titleCaseSpeaker(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function isSceneOrTransition(line) {
  const trimmed = line.trim();
  return SCENE_HEADING.test(trimmed) || TRANSITION.test(trimmed);
}

function isSpeakerOnlyLine(line) {
  const trimmed = line.trim();
  const match = trimmed.match(SPEAKER_ONLY);
  return Boolean(match && trimmed === trimmed.toUpperCase() && trimmed.length < 40);
}

function isNonDialogueLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (isSceneOrTransition(trimmed)) return true;
  if (PAGE_NUMBER.test(trimmed)) return true;
  if (/^CONT'D\.?$|^CONTINUED:?$/i.test(trimmed)) return true;
  if (/^\(V\.O\.\)|^\(O\.S\.\)|^\(O\.C\.\)/i.test(trimmed)) return true;
  return false;
}

function isLikelyActionLine(line) {
  const trimmed = line.trim();
  if (ALL_CAPS_SPEAKER.test(trimmed)) return false;
  if (isSpeakerOnlyLine(trimmed)) return false;
  if (/^[a-z]/.test(trimmed)) return true;
  if (trimmed.endsWith('.') && trimmed === trimmed.toUpperCase() && trimmed.length > 20) {
    return true;
  }
  return false;
}

function isActionLine(line, currentSpeaker) {
  const trimmed = line.trim();
  if (!trimmed || isNonDialogueLine(trimmed)) return false;
  if (ALL_CAPS_SPEAKER.test(trimmed)) return false;
  if (isSpeakerOnlyLine(trimmed)) return false;

  if (currentSpeaker) {
    return isLikelyActionLine(trimmed);
  }

  return isLikelyActionLine(trimmed) || /[a-z]/.test(trimmed);
}

function isProbablyCharacterName(text) {
  const words = text.split(/\s+/);
  if (words.length > 3) return false;

  const sfxKeyword =
    /THUNDER|CRASH|SLAM|SWELL|BANG|ECHO|SCREAM|ROAR|RUMBLE|WIND|RAIN|SIREN|BEEP|KNOCK|FOOTSTEPS|GUNSHOT|EXPLOSION|APPLAUSE|LAUGHTER|DOOR|PHONE|CAR|ENGINE|HORN|STRINGS|MUSIC|AMBIENCE|SOUND|SFX/i;
  if (sfxKeyword.test(text)) return false;

  return (
    words.length <= 2 &&
    text.length <= 24 &&
    words.every((word) => /^[A-Z][A-Z'.-]*$/.test(word))
  );
}

function isValidSfxText(text) {
  const cleaned = text.replace(/[.,!;:]+$/, '').trim();
  if (cleaned.length < 3) return false;
  if (SCENE_HEADING.test(cleaned)) return false;
  if (isProbablyCharacterName(cleaned)) return false;

  const words = cleaned.split(/\s+/);
  if (words.every((word) => SFX_STOP_WORDS.has(word.replace(/[^A-Z]/g, '')))) {
    return false;
  }

  return cleaned === cleaned.toUpperCase() && /[A-Z]/.test(cleaned);
}

/**
 * Extract capitalized SFX phrases embedded in a screenplay action line.
 */
export function extractSfxFromActionLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const found = new Set();

  if (trimmed === trimmed.toUpperCase() && isValidSfxText(trimmed)) {
    found.add(trimmed.replace(/[.,!;:]+$/, '').trim());
    return [...found];
  }

  for (const match of trimmed.matchAll(CAPS_SFX_RUN)) {
    const text = match[1].replace(/[.,!;:]+$/, '').trim();
    if (isValidSfxText(text)) {
      found.add(text);
    }
  }

  if (found.size === 0) {
    for (const match of trimmed.matchAll(CAPS_SFX_WORD)) {
      const text = match[1].trim();
      if (isValidSfxText(text)) {
        found.add(text);
      }
    }
  }

  return [...found];
}

function walkScriptLines(text, handlers) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let dialogueIndex = 0;
  let currentSpeaker = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    if (!line) {
      currentSpeaker = null;
      handlers.onBlank?.();
      continue;
    }

    if (isNonDialogueLine(line)) {
      currentSpeaker = null;
      handlers.onNonDialogue?.(line, lineNumber);
      continue;
    }

    const inlineMatch = line.match(ALL_CAPS_SPEAKER);
    if (inlineMatch) {
      const speaker = titleCaseSpeaker(inlineMatch[1]);
      const dialogue = inlineMatch[2].trim();
      if (dialogue) {
        handlers.onDialogue?.({
          speaker,
          dialogue,
          dialogueIndex,
          lineNumber,
          line,
        });
        dialogueIndex++;
      }
      currentSpeaker = speaker;
      continue;
    }

    if (isSpeakerOnlyLine(line)) {
      currentSpeaker = titleCaseSpeaker(line);
      continue;
    }

    if (currentSpeaker && !isLikelyActionLine(line)) {
      handlers.onDialogue?.({
        speaker: currentSpeaker,
        dialogue: line,
        dialogueIndex,
        lineNumber,
        line,
      });
      dialogueIndex++;
      currentSpeaker = null;
      continue;
    }

    if (isActionLine(line, currentSpeaker)) {
      handlers.onAction?.({
        line,
        lineNumber,
        afterDialogueIndex: dialogueIndex > 0 ? dialogueIndex - 1 : null,
        beforeDialogueIndex: dialogueIndex,
      });
    }

    currentSpeaker = null;
  }

  return dialogueIndex;
}

export function parseScriptText(text) {
  const entries = [];
  let sourceIndex = 0;

  walkScriptLines(text, {
    onDialogue: ({ speaker, dialogue }) => {
      entries.push({ speaker, dialogue, sourceIndex: sourceIndex++ });
    },
  });

  return entries;
}

/**
 * Parse capitalized SFX embedded in script action lines.
 * Tracks position relative to dialogue entries for placement hints.
 */
export function parseScriptCues(text) {
  const cues = [];
  let cueIndex = 0;
  let totalDialogues = 0;

  totalDialogues = walkScriptLines(text, {
    onAction: ({ line, lineNumber, afterDialogueIndex, beforeDialogueIndex }) => {
      const sfxPhrases = extractSfxFromActionLine(line);
      for (const phrase of sfxPhrases) {
        cues.push({
          cueIndex: cueIndex++,
          type: 'SFX',
          text: phrase,
          rawLine: line,
          scriptLineNumber: lineNumber,
          afterDialogueIndex,
          beforeDialogueIndex,
        });
      }
    },
  });

  for (const cue of cues) {
    if (cue.beforeDialogueIndex >= totalDialogues) {
      cue.beforeDialogueIndex = null;
    }
  }

  return cues;
}

export function cleanScriptText(text) {
  let cleaned = text.replace(/\r\n/g, '\n');

  cleaned = cleaned.replace(/\f/g, '\n');
  cleaned = cleaned.replace(/(\w)-\n(\w)/g, '$1$2');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  cleaned = cleaned.replace(/\n[ \t]+/g, '\n');

  const lines = cleaned.split('\n');
  const lineCounts = {};
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 3 && t.length < 80) {
      lineCounts[t] = (lineCounts[t] || 0) + 1;
    }
  }

  const repeatedHeaders = new Set(
    Object.entries(lineCounts)
      .filter(([, count]) => count >= 3)
      .map(([line]) => line)
  );

  const filtered = lines.filter((line) => {
    const t = line.trim();
    if (PAGE_NUMBER.test(t)) return false;
    if (repeatedHeaders.has(t)) return false;
    return true;
  });

  return filtered.join('\n').trim();
}
