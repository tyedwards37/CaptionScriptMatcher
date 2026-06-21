import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    pageTexts.push(pageText);
  }

  const fullText = pageTexts.join('\n\n').trim();

  if (!fullText || fullText.replace(/\s/g, '').length < 20) {
    throw new Error(
      'Could not extract readable text from this PDF. It may be image-based or scanned. Try exporting a text-based PDF or using OCR, then upload again.'
    );
  }

  return fullText;
}
