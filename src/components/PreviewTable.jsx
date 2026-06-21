export default function PreviewTable({ captions, onUpdateCaption }) {
  if (!captions.length) {
    return <p className="empty-state">No captions to preview. Upload a transcript and generate corrected SRT.</p>;
  }

  return (
    <div className="table-wrapper">
      <table className="preview-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Start</th>
            <th>End</th>
            <th>Original Transcript</th>
            <th>Matched Script</th>
            <th>Speaker</th>
            <th>Final Caption</th>
            <th>Confidence</th>
            <th>Changed</th>
            <th>Review</th>
          </tr>
        </thead>
        <tbody>
          {captions.map((caption) => (
            <tr key={caption.index} className={caption.needsReview ? 'needs-review' : ''}>
              <td>{caption.index}</td>
              <td className="mono">{caption.startTime}</td>
              <td className="mono">{caption.endTime}</td>
              <td className="text-cell">{caption.originalText}</td>
              <td className="text-cell">{caption.matchedScriptDialogue || '—'}</td>
              <td>
                <input
                  type="text"
                  className="cell-input"
                  value={caption.speaker}
                  onChange={(e) => {
                    const dialogue =
                      caption.finalText.replace(/^\[[^\]]*\]:\s*/, '') ||
                      caption.matchedScriptDialogue ||
                      caption.originalText;
                    onUpdateCaption(caption.index, {
                      speaker: e.target.value,
                      finalText: e.target.value ? `[${e.target.value}]: ${dialogue}` : dialogue,
                    });
                  }}
                />
              </td>
              <td>
                <textarea
                  className="cell-textarea"
                  value={caption.finalText}
                  rows={2}
                  onChange={(e) => onUpdateCaption(caption.index, { finalText: e.target.value })}
                />
              </td>
              <td>
                <span className={`confidence ${caption.confidence >= 60 ? 'high' : 'low'}`}>
                  {caption.confidence}%
                </span>
              </td>
              <td>{caption.changed ? 'Yes' : 'No'}</td>
              <td className="center">
                <input
                  type="checkbox"
                  checked={caption.needsReview}
                  onChange={(e) => onUpdateCaption(caption.index, { needsReview: e.target.checked })}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
