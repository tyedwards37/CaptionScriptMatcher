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
  const cleaned = name.replace(/\s*\(CONT'?D\)$/i, '').trim();
  return cleaned
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
  const contMatch = trimmed.match(/^([A-Z][A-Z0-9\s.'\-]+)\s*\(CONT'?D\)$/i);
  if (contMatch && isProbablyCharacterName(contMatch[1].trim())) {
    return true;
  }

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
  if (tryParseSpeakerDialogueLine(trimmed)) return false;
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
  if (tryParseSpeakerDialogueLine(trimmed)) return false;
  if (isSpeakerOnlyLine(trimmed)) return false;

  if (currentSpeaker) {
    return isLikelyActionLine(trimmed);
  }

  return isLikelyActionLine(trimmed) || /[a-z]/.test(trimmed);
}

const ACTION_CAPS_WORDS = new Set([
  'KICKED', 'DOWN', 'GRUNTS', 'FOUND', 'BROUGHT', 'WALKS', 'SIGHS', 'SLAMS',
  'ENTERS', 'EXITS', 'LOOKS', 'TURNS', 'RUNS', 'SITS', 'STANDS', 'PAUSES',
  'BEAT', 'MORE', 'CONT', 'FIN', 'YES', 'MEETING', 'ESCAPE', 'DIPLO',
  'POSSIBLE', 'EITHER', 'CAME', 'GOING', 'UNHARMED', 'GOODBYE', 'SILENCE',
  'DAY', 'NIGHT', 'MORNING', 'EVENING', 'ROOM', 'LATER', 'SAME', 'CONTINUOUS',
  'OR', 'AND', 'THE', 'NOT', 'FROM', 'WITH', 'INTO', 'OUT', 'OFF', 'FOR',
  'INT', 'EXT', 'EST',
]);

function isProbablyCharacterName(text) {
  const words = text.split(/\s+/);
  if (words.length > 2 || words.length === 0) return false;
  if (text.endsWith('.')) return false;
  if (words.some((word) => word.length < 2)) return false;

  const sfxKeyword =
    /THUNDER|CRASH|SLAM|SWELL|BANG|ECHO|SCREAM|ROAR|RUMBLE|WIND|RAIN|SIREN|BEEP|KNOCK|FOOTSTEPS|GUNSHOT|EXPLOSION|APPLAUSE|LAUGHTER|DOOR|PHONE|CAR|ENGINE|HORN|STRINGS|MUSIC|AMBIENCE|SOUND|SFX/i;
  if (sfxKeyword.test(text)) return false;
  if (words.some((word) => ACTION_CAPS_WORDS.has(word))) return false;
  if (words.some((word) => /'/.test(word))) return false;

  return (
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

function tryParseSpeakerDialogueLine(line) {
  const colonMatch = line.match(ALL_CAPS_SPEAKER);
  if (colonMatch) {
    const speaker = titleCaseSpeaker(colonMatch[1]);
    const dialogue = colonMatch[2].trim();
    return dialogue ? { speaker, dialogue } : { speaker, dialogue: null };
  }

  const spacedMatch = line.match(/^([A-Z][A-Z0-9\s.'\-]+?)\s{2,}(.+)$/);
  if (spacedMatch) {
    const speakerName = spacedMatch[1].trim();
    if (isProbablyCharacterName(speakerName)) {
      return {
        speaker: titleCaseSpeaker(speakerName),
        dialogue: spacedMatch[2].trim(),
      };
    }
  }

  const words = line.split(/\s+/);
  for (let wordCount = Math.min(2, words.length - 1); wordCount >= 1; wordCount--) {
    const speakerName = words.slice(0, wordCount).join(' ');
    if (!isProbablyCharacterName(speakerName)) continue;

    const dialogue = words.slice(wordCount).join(' ');
    if (dialogue && /[a-z]/.test(dialogue)) {
      return {
        speaker: titleCaseSpeaker(speakerName),
        dialogue,
      };
    }
  }

  return null;
}

function isFlattenedScreenplayText(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim());
  if (lines.length <= 1) return true;

  const speakerLines = lines.filter((line) => isSpeakerOnlyLine(line.trim())).length;
  if (speakerLines >= 3) return false;

  const longLines = lines.filter((line) => line.trim().length > 180).length;
  return longLines / lines.length >= 0.4;
}

function isolateSceneHeadings(text) {
  return text.replace(
    /((?:INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)[^\n]*?\s-\s(?:DAY|NIGHT|MORNING|EVENING|AFTERNOON|CONTINUOUS|LATER|SAME|MOMENTS LATER))\s+(?=[A-Z][a-z])/gi,
    '$1\n'
  );
}

function hasDialogueAhead(text, offset) {
  let rest = text.slice(offset).replace(/^[ \t]+/, '');
  if (!rest) return false;

  if (rest.startsWith('(')) {
    const close = rest.indexOf(')');
    if (close === -1) return false;
    rest = rest.slice(close + 1).replace(/^[ \t]+/, '');
    if (!rest) return false;
  }

  const word = rest.match(/^[A-Za-z\"']+/);
  if (!word) return false;

  const value = word[0];
  if (value === 'I') return true;
  if (/^[a-z]/.test(value)) return true;
  if (/^[A-Z][a-z]/.test(value)) return true;
  return /^[\"']/.test(value);
}

function peelTrailingSpeaker(line) {
  const match = line.match(/^(.*?)(?:[ \t])([A-Z][A-Z0-9'.-]*(?:[ \t]+[A-Z][A-Z0-9'.-]*)?)\s*$/);
  if (!match || !isProbablyCharacterName(match[2].trim())) {
    return { body: line, speaker: null };
  }

  return { body: match[1].trimEnd(), speaker: match[2].trim() };
}

function splitSpeakerCueBreaksInLine(line) {
  const { body, speaker: trailingSpeaker } = peelTrailingSpeaker(line);
  let result = '';
  let i = 0;

  while (i < body.length) {
    const atBoundary =
      i === 0 || /[ \t]/.test(body[i - 1]) || (i >= 2 && /[.!?][ \t]/.test(body.slice(i - 2, i)));

    if (atBoundary) {
      let matched = null;
      for (const wordCount of [2, 1]) {
        const pattern =
          wordCount === 2
            ? /^([A-Z][A-Z0-9'.-]*[ \t]+[A-Z][A-Z0-9'.-]*)/
            : /^([A-Z][A-Z0-9'.-]+)/;

        const match = body.slice(i).match(pattern);
        if (
          match &&
          isProbablyCharacterName(match[1].trim()) &&
          hasDialogueAhead(body, i + match[1].length)
        ) {
          matched = match[1].trim();
          break;
        }
      }

      if (matched) {
        result += `\n${matched}\n`;
        i += matched.length;
        continue;
      }
    }

    result += body[i];
    i++;
  }

  if (trailingSpeaker) {
    result += `\n${trailingSpeaker}`;
  }

  return result;
}

function splitSpeakerCueBreaks(text) {
  return text
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || SCENE_HEADING.test(trimmed)) return line;
      return splitSpeakerCueBreaksInLine(line);
    })
    .join('\n');
}

function restoreScreenplayLineBreaks(text) {
  if (!isFlattenedScreenplayText(text)) return text;

  let restored = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
  const firstScene = restored.search(/\b(?:INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i);

  if (firstScene > 0) {
    const prefix = restored.slice(0, firstScene).trim();
    const body = isolateSceneHeadings(restored.slice(firstScene));
    restored = `${prefix}\n${splitSpeakerCueBreaks(body)}`;
  } else {
    restored = splitSpeakerCueBreaks(isolateSceneHeadings(restored));
  }

  restored = restored.replace(/\s+(\d+)\.(?=\s|$)/g, '\n$1.\n');

  return restored.replace(/\n{3,}/g, '\n\n').trim();
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

function isParentheticalLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('(') && trimmed.endsWith(')');
}

function isActionBeatLine(line) {
  const trimmed = line.trim();
  if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+[A-Z]{2,}/.test(trimmed)) return true;
  return /\b(?:GRUNTS?|SIGHS?|WALKS?|ENTERS?|EXITS?|KICKED|BROUGHT|LEAVES?|SLEEPS?|RIOTS?|BREATHES?)\b/i.test(
    trimmed
  );
}

function isNarrativeActionLine(line) {
  const trimmed = line.trim();
  if (/[?!]/.test(trimmed)) return false;
  if (/^Silence\.?$/i.test(trimmed)) return true;
  if (/^(?:The|A|An|He|She|They)\s+[a-z]/.test(trimmed)) return true;
  return /^(?:Prince\s+[A-Z][a-z]+|[A-Z][a-z]+)\s+(?:is|are|was|were|walks|walked|leaves|left|brought|sighs|sighed|breathes|breathed|holds|held|voice|voices)\b/i.test(
    trimmed
  );
}

function isDialogueContinuationLine(line) {
  const trimmed = line.trim();
  if (!trimmed || isNonDialogueLine(trimmed)) return false;
  if (isSpeakerOnlyLine(trimmed)) return false;
  if (tryParseSpeakerDialogueLine(trimmed)) return false;
  if (isActionBeatLine(trimmed)) return false;
  if (isParentheticalLine(trimmed)) return true;
  if (/^[a-z]/.test(trimmed)) return true;
  if (isLikelyActionLine(trimmed)) return false;
  return true;
}

function walkScriptLines(text, handlers) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  let dialogueIndex = 0;
  let currentSpeaker = null;
  let dialogueBuffer = [];

  function flushDialogue(lineNumber, line) {
    if (!currentSpeaker || dialogueBuffer.length === 0) return;

    const dialogue = dialogueBuffer.join(' ');
    handlers.onDialogue?.({
      speaker: currentSpeaker,
      dialogue,
      dialogueIndex,
      lineNumber,
      line: dialogue,
    });
    dialogueIndex++;
    dialogueBuffer = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNumber = i + 1;

    if (!line) {
      flushDialogue(lineNumber, line);
      currentSpeaker = null;
      handlers.onBlank?.();
      continue;
    }

    if (isNonDialogueLine(line)) {
      flushDialogue(lineNumber, line);
      currentSpeaker = null;
      handlers.onNonDialogue?.(line, lineNumber);
      continue;
    }

    const speakerDialogue = tryParseSpeakerDialogueLine(line);
    if (speakerDialogue) {
      flushDialogue(lineNumber, line);
      if (speakerDialogue.dialogue) {
        handlers.onDialogue?.({
          speaker: speakerDialogue.speaker,
          dialogue: speakerDialogue.dialogue,
          dialogueIndex,
          lineNumber,
          line,
        });
        dialogueIndex++;
        currentSpeaker = null;
      } else {
        currentSpeaker = speakerDialogue.speaker;
      }
      continue;
    }

    if (isSpeakerOnlyLine(line)) {
      flushDialogue(lineNumber, line);
      currentSpeaker = titleCaseSpeaker(line);
      continue;
    }

    if (currentSpeaker && isDialogueContinuationLine(line)) {
      dialogueBuffer.push(line);
      continue;
    }

    flushDialogue(lineNumber, line);

    if (isActionLine(line, null) || isActionBeatLine(line) || isNarrativeActionLine(line)) {
      handlers.onAction?.({
        line,
        lineNumber,
        afterDialogueIndex: dialogueIndex > 0 ? dialogueIndex - 1 : null,
        beforeDialogueIndex: dialogueIndex,
      });
    }

    currentSpeaker = null;
  }

  flushDialogue(lines.length, lines[lines.length - 1] ?? '');

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
  cleaned = cleaned.replace(/[\u2018\u2019\u201A\u201B]/g, "'");

  cleaned = restoreScreenplayLineBreaks(cleaned);

  cleaned = cleaned.replace(/\f/g, '\n');
  cleaned = cleaned.replace(/\s*\(MORE\)\s*/gi, '\n');
  cleaned = cleaned.replace(/(\w)-\n(\w)/g, '$1$2');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/[ \t]+\n/g, '\n');
  cleaned = cleaned.replace(/\n[ \t]+/g, '\n');

  const lines = cleaned.split('\n');
  const lineCounts = {};
  for (const line of lines) {
    const t = line.trim();
    if (t.length > 3 && t.length < 80 && !isSpeakerOnlyLine(t)) {
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
    if (repeatedHeaders.has(t) && !isSpeakerOnlyLine(t)) return false;
    return true;
  });

  return filtered.join('\n').trim();
}
