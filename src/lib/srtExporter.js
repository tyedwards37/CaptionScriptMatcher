export function exportSrt(captions) {
  const blocks = captions.map((caption, i) => {
    const index = caption.index ?? i + 1;
    const startTime = caption.startTime;
    const endTime = caption.endTime;
    const text = caption.finalText || caption.originalText;

    return `${index}\n${startTime} --> ${endTime}\n${text}`;
  });

  return blocks.join('\n\n') + '\n';
}

export function downloadSrt(content, filename = 'corrected-captions.srt') {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
