/**
 * Parse screenplay/script text into structured dialogue entries.
 */

const SCENE_HEADING = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EST\.)/i;
const TRANSITION = /^(FADE IN:|FADE OUT\.|CUT TO:|DISSOLVE TO:)/i;
const SFX_PATTERN = /^\(.*\)$|^\[.*\]$|^SFX:|^MUSIC:|^SOUND:|^AMBIENCE:/i;
const PAGE_NUMBER = /^\d+\.$|^\s*\d+\s*$/;
const ALL_CAPS_SPEAKER = /^([A-Z][A-Z0-9\s.'\-]+):\s*(.*)$/;
const SPEAKER_ONLY = /^([A-Z][A-Z0-9\s.'\-]+)$/;

function titleCaseSpeaker(name) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function isNonDialogueLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (SCENE_HEADING.test(trimmed)) return true;
  if (TRANSITION.test(trimmed)) return true;
  if (SFX_PATTERN.test(trimmed)) return true;
  if (PAGE_NUMBER.test(trimmed)) return true;
  if (/^CONT'D\.?$|^CONTINUED:?$/i.test(trimmed)) return true;
  if (/^\(V\.O\.\)|^\(O\.S\.\)|^\(O\.C\.\)/i.test(trimmed)) return true;
  return false;
}

function isLikelyActionLine(line) {
  const trimmed = line.trim();
  if (ALL_CAPS_SPEAKER.test(trimmed)) return false;
  if (SPEAKER_ONLY.test(trimmed)) return false;
  if (/^[a-z]/.test(trimmed)) return true;
  if (trimmed.endsWith('.') && trimmed === trimmed.toUpperCase() && trimmed.length > 20) {
    return true;
  }
  return false;
}

export function parseScriptText(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const entries = [];
  let currentSpeaker = null;
  let sourceIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || isNonDialogueLine(line)) {
      currentSpeaker = null;
      continue;
    }

    const inlineMatch = line.match(ALL_CAPS_SPEAKER);
    if (inlineMatch) {
      const speaker = titleCaseSpeaker(inlineMatch[1]);
      const dialogue = inlineMatch[2].trim();
      if (dialogue) {
        entries.push({ speaker, dialogue, sourceIndex: sourceIndex++ });
      }
      currentSpeaker = speaker;
      continue;
    }

    const speakerOnlyMatch = line.match(SPEAKER_ONLY);
    if (speakerOnlyMatch && line === line.toUpperCase() && line.length < 40) {
      currentSpeaker = titleCaseSpeaker(speakerOnlyMatch[1]);
      continue;
    }

    if (currentSpeaker && !isLikelyActionLine(line)) {
      entries.push({
        speaker: currentSpeaker,
        dialogue: line,
        sourceIndex: sourceIndex++,
      });
      currentSpeaker = null;
      continue;
    }

    currentSpeaker = null;
  }

  return entries;
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
