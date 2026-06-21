/**
 * Parse transcript/caption files (SRT, VTT, TXT) into caption blocks.
 */

function parseTimestampToMs(timestamp) {
  const normalized = timestamp.trim().replace('.', ',');
  const match = normalized.match(
    /(?:(\d+):)?(\d{1,2}):(\d{2})[,.](\d{3})/
  );
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const ms = parseInt(match[4], 10);

  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

function msToSrtTimestamp(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = ms % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
}

function parseSrt(content) {
  const blocks = [];
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const segments = normalized.split(/\n\n+/);

  for (const segment of segments) {
    const lines = segment.split('\n').filter((l) => l.trim());
    if (lines.length < 2) continue;

    let timeLineIndex = 0;
    if (/^\d+$/.test(lines[0].trim())) {
      timeLineIndex = 1;
    }

    const timeLine = lines[timeLineIndex];
    const timeMatch = timeLine.match(
      /(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timeMatch) continue;

    const text = lines.slice(timeLineIndex + 1).join(' ').trim();
    if (!text) continue;

    blocks.push({
      index: blocks.length + 1,
      startMs: parseTimestampToMs(timeMatch[1]),
      endMs: parseTimestampToMs(timeMatch[2]),
      startTime: msToSrtTimestamp(parseTimestampToMs(timeMatch[1])),
      endTime: msToSrtTimestamp(parseTimestampToMs(timeMatch[2])),
      originalText: text,
    });
  }

  return blocks;
}

function parseVtt(content) {
  const blocks = [];
  const normalized = content.replace(/\r\n/g, '\n').trim();
  const lines = normalized.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (
      line === 'WEBVTT' ||
      line.startsWith('NOTE') ||
      line.startsWith('STYLE') ||
      line.startsWith('REGION') ||
      !line
    ) {
      i++;
      continue;
    }

    if (line.includes('-->')) {
      const timeMatch = line.match(
        /(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})/
      );
      if (timeMatch) {
        const textLines = [];
        i++;
        while (i < lines.length && lines[i].trim() && !lines[i].includes('-->')) {
          textLines.push(lines[i].trim());
          i++;
        }

        const text = textLines.join(' ').trim();
        if (text) {
          blocks.push({
            index: blocks.length + 1,
            startMs: parseTimestampToMs(timeMatch[1]),
            endMs: parseTimestampToMs(timeMatch[2]),
            startTime: msToSrtTimestamp(parseTimestampToMs(timeMatch[1])),
            endTime: msToSrtTimestamp(parseTimestampToMs(timeMatch[2])),
            originalText: text,
          });
        }
        continue;
      }
    }

    i++;
  }

  return blocks;
}

function parseTxt(content) {
  const blocks = [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  let index = 1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    blocks.push({
      index: index++,
      startMs: (index - 1) * 3000,
      endMs: index * 3000,
      startTime: msToSrtTimestamp((index - 1) * 3000),
      endTime: msToSrtTimestamp(index * 3000),
      originalText: trimmed,
    });
  }

  return blocks;
}

export function parseTranscript(content, filename = '') {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'vtt' || content.trim().startsWith('WEBVTT')) {
    return parseVtt(content);
  }
  if (ext === 'srt' || content.match(/\d{1,2}:\d{2}:\d{2}[,.]\d{3}\s*-->/)) {
    return parseSrt(content);
  }
  return parseTxt(content);
}

export { msToSrtTimestamp, parseTimestampToMs };
