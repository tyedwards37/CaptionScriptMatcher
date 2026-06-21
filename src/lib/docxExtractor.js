import mammoth from 'mammoth';

export async function extractDocxText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  const text = result.value?.trim();
  if (!text) {
    throw new Error('Could not extract text from this DOCX file.');
  }

  return text;
}
