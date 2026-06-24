import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PAGE_NUMBER_LINE = /^\d+\.(?:\s+\d+\.)?$/;

function normalizePdfText(text) {
  return text.replace(/[\u2018\u2019\u201A\u201B]/g, "'");
}

function groupItemsIntoRows(items, lineTolerance = 3) {
  const rows = new Map();

  for (const item of items) {
    if (!item.str?.trim()) continue;

    const y = item.transform[5];
    const x = item.transform[4];
    let rowKey = null;

    for (const existingY of rows.keys()) {
      if (Math.abs(existingY - y) <= lineTolerance) {
        rowKey = existingY;
        break;
      }
    }

    if (rowKey == null) {
      rowKey = y;
      rows.set(rowKey, []);
    }

    rows.get(rowKey).push({ x, str: item.str });
  }

  return [...rows.keys()]
    .sort((a, b) => b - a)
    .map((y) => {
      const parts = rows
        .get(y)
        .sort((a, b) => a.x - b.x);

      return {
        minX: Math.min(...parts.map((part) => part.x)),
        text: parts
          .map((part) => part.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim(),
      };
    })
    .filter((row) => row.text);
}

function cleanScreenplayLine(text, type) {
  let cleaned = normalizePdfText(text).replace(/\s+/g, ' ').trim();

  if (type === 'speaker') {
    const contMatch = cleaned.match(/\(CONT'?D\)/i);
    const nameMatch = cleaned.match(/^([A-Z][A-Z0-9\s.'-]+)/);
    if (nameMatch) {
      return contMatch ? `${nameMatch[1].trim()} ${contMatch[0]}` : nameMatch[1].trim();
    }
  }

  return cleaned;
}

function classifyScreenplayRow(row) {
  const text = normalizePdfText(row.text);
  if (PAGE_NUMBER_LINE.test(text)) return 'page-number';
  if (/^(\(MORE\)|\(CONT'D\)|\(CONTINUED\))$/i.test(text)) return 'page-number';
  if (/^FIN\.?$/i.test(text)) return 'page-number';
  if (/^[A-Z][A-Z0-9\s.'-]*(?:\s*\(CONT'?D\))?$/i.test(text) && row.minX >= 230) return 'speaker';
  if (row.minX >= 190 || (/^\(/.test(text) && text.endsWith(')'))) return 'parenthetical';
  if (row.minX >= 150) return 'dialogue';
  return 'action';
}

function formatScreenplayRows(rows) {
  const output = [];
  let dialogueBlock = [];

  function flushDialogue() {
    if (!dialogueBlock.length) return;
    output.push(dialogueBlock.join(' '));
    dialogueBlock = [];
  }

  for (const row of rows) {
    const text = normalizePdfText(row.text);
    const type = classifyScreenplayRow({ ...row, text });

    if (type === 'page-number') continue;

    if (type === 'speaker') {
      flushDialogue();
      output.push(cleanScreenplayLine(text, 'speaker'));
      continue;
    }

    if (type === 'dialogue' || type === 'parenthetical') {
      dialogueBlock.push(cleanScreenplayLine(text, type));
      continue;
    }

    flushDialogue();
    output.push(cleanScreenplayLine(text, type));
  }

  flushDialogue();
  return output.join('\n');
}

function extractPageText(content) {
  const rows = groupItemsIntoRows(content.items);
  return formatScreenplayRows(rows);
}

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pageTexts.push(extractPageText(content));
  }

  const fullText = pageTexts.join('\n\n').trim();

  if (!fullText || fullText.replace(/\s/g, '').length < 20) {
    throw new Error(
      'Could not extract readable text from this PDF. It may be image-based or scanned. Try exporting a text-based PDF or using OCR, then upload again.'
    );
  }

  return fullText;
}
