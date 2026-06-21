export default function ScriptCuesPanel({ cues }) {
  if (!cues.length) {
    return null;
  }

  return (
    <section className="review-panel sfx-panel">
      <h2>Script SFX (Action Lines)</h2>
      <p className="panel-description">
        Capitalized sound effects found in script action lines within the transcript span, with suggested placement relative to matched captions. These are for editorial review only and are not added to the exported SRT.
      </p>
      <div className="table-wrapper">
        <table className="preview-table sfx-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Cue</th>
              <th>Script Line</th>
              <th>Suggested Placement</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {cues.map((cue) => (
              <tr key={cue.cueIndex}>
                <td>{cue.cueIndex + 1}</td>
                <td>{cue.type}</td>
                <td className="text-cell">{cue.text}</td>
                <td>{cue.scriptLineNumber}</td>
                <td className="text-cell placement-cell">{cue.placement}</td>
                <td>{cue.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
