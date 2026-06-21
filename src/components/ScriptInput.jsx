import FileUpload from './FileUpload';

export default function ScriptInput({ scriptText, onScriptTextChange, onScriptFileSelect, scriptFileName }) {
  return (
    <div className="script-input">
      <FileUpload
        label="Original Script"
        accept=".pdf,.docx,.txt,.text"
        onFileSelect={onScriptFileSelect}
        fileName={scriptFileName}
      />
      <label className="upload-label" htmlFor="script-paste">
        Or paste script text
      </label>
      <textarea
        id="script-paste"
        className="script-textarea"
        placeholder="Paste screenplay dialogue here..."
        value={scriptText}
        onChange={(e) => onScriptTextChange(e.target.value)}
        rows={8}
      />
    </div>
  );
}
