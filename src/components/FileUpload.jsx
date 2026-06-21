import { useRef } from 'react';

export default function FileUpload({ label, accept, onFileSelect, fileName }) {
  const inputRef = useRef(null);

  return (
    <div className="upload-section">
      <label className="upload-label">{label}</label>
      <div className="upload-row">
        <button type="button" className="btn btn-secondary" onClick={() => inputRef.current?.click()}>
          Choose File
        </button>
        <span className="file-name">{fileName || 'No file selected'}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelect(file);
        }}
      />
    </div>
  );
}
