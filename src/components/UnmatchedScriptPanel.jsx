export default function UnmatchedScriptPanel({ lines }) {
  if (!lines.length) {
    return null;
  }

  return (
    <section className="unmatched-panel">
      <h2>Unmatched Script Lines</h2>
      <p className="panel-description">
        Script dialogue lines between the first and last matched script lines that were not matched to any transcript caption. Lines before the transcript span or after it in the script are not listed. They are shown for review only and will not be added to the exported SRT.
      </p>
      <div className="table-wrapper">
        <table className="preview-table unmatched-table">
          <thead>
            <tr>
              <th>Index</th>
              <th>Speaker</th>
              <th>Script Dialogue</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.sourceIndex}>
                <td>{line.sourceIndex}</td>
                <td>{line.speaker}</td>
                <td className="text-cell">{line.dialogue}</td>
                <td>{line.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
