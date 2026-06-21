import { useCallback, useMemo, useState } from 'react';
import FileUpload from './components/FileUpload';
import ScriptInput from './components/ScriptInput';
import PreviewTable from './components/PreviewTable';
import UnmatchedScriptPanel from './components/UnmatchedScriptPanel';
import { parseTranscript } from './lib/transcriptParser';
import { parseScriptText, cleanScriptText } from './lib/scriptParser';
import { extractPdfText } from './lib/pdfExtractor';
import { extractDocxText } from './lib/docxExtractor';
import { matchCaptionsToScript } from './lib/speakerMatcher';
import { isChanged } from './lib/changedDetector';
import { exportSrt, downloadSrt } from './lib/srtExporter';
import './App.css';

const FILTERS = {
  ALL: 'all',
  CHANGED: 'changed',
  REVIEW: 'review',
};

function applyChangedFlags(captions) {
  return captions.map((caption) => ({
    ...caption,
    changed: isChanged(caption.originalText, caption.finalText),
  }));
}

export default function App() {
  const [transcriptFileName, setTranscriptFileName] = useState('');
  const [transcriptContent, setTranscriptContent] = useState('');
  const [scriptText, setScriptText] = useState('');
  const [scriptFileName, setScriptFileName] = useState('');
  const [captions, setCaptions] = useState([]);
  const [unmatchedScriptLines, setUnmatchedScriptLines] = useState([]);
  const [filter, setFilter] = useState(FILTERS.ALL);
  const [threshold, setThreshold] = useState(60);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState(false);

  const handleTranscriptFile = useCallback(async (file) => {
    setError('');
    setTranscriptFileName(file.name);
    const content = await file.text();
    setTranscriptContent(content);
    setGenerated(false);
  }, []);

  const handleScriptFile = useCallback(async (file) => {
    setError('');
    setScriptFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      let text;
      if (ext === 'pdf') {
        text = await extractPdfText(file);
        text = cleanScriptText(text);
      } else if (ext === 'docx') {
        text = await extractDocxText(file);
        text = cleanScriptText(text);
      } else {
        text = cleanScriptText(await file.text());
      }
      setScriptText(text);
      setGenerated(false);
    } catch (err) {
      setError(err.message || 'Failed to read script file.');
    }
  }, []);

  const handleGenerate = useCallback(() => {
    setError('');

    if (!transcriptContent.trim()) {
      setError('Please upload a transcript/caption file first.');
      return;
    }
    if (!scriptText.trim()) {
      setError('Please upload or paste the original script.');
      return;
    }

    try {
      const parsedCaptions = parseTranscript(transcriptContent, transcriptFileName);
      const scriptEntries = parseScriptText(cleanScriptText(scriptText));

      if (!parsedCaptions.length) {
        setError('No captions found in the transcript file.');
        return;
      }
      if (!scriptEntries.length) {
        setError('No dialogue lines found in the script. Check formatting (e.g. SPEAKER: dialogue).');
        return;
      }

      const { results, unmatchedScriptLines: unmatched } = matchCaptionsToScript(
        parsedCaptions,
        scriptEntries,
        { threshold }
      );

      setCaptions(applyChangedFlags(results));
      setUnmatchedScriptLines(unmatched);
      setGenerated(true);
    } catch (err) {
      setError(err.message || 'Failed to generate corrected captions.');
    }
  }, [transcriptContent, transcriptFileName, scriptText, threshold]);

  const handleUpdateCaption = useCallback((index, updates) => {
    setCaptions((prev) =>
      applyChangedFlags(
        prev.map((caption) => (caption.index === index ? { ...caption, ...updates } : caption))
      )
    );
  }, []);

  const filteredCaptions = useMemo(() => {
    if (filter === FILTERS.CHANGED) {
      return captions.filter((c) => c.changed);
    }
    if (filter === FILTERS.REVIEW) {
      return captions.filter((c) => c.needsReview);
    }
    return captions;
  }, [captions, filter]);

  const summary = useMemo(
    () => ({
      total: captions.length,
      changed: captions.filter((c) => c.changed).length,
      needsReview: captions.filter((c) => c.needsReview).length,
      unmatched: unmatchedScriptLines.length,
    }),
    [captions, unmatchedScriptLines]
  );

  const handleExport = useCallback(() => {
    if (!captions.length) {
      setError('Generate corrected captions before exporting.');
      return;
    }
    const srt = exportSrt(captions);
    downloadSrt(srt, 'corrected-captions.srt');
  }, [captions]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Caption Script Matcher</h1>
        <p>
          Match Premiere Pro transcript timing against your original script, correct dialogue, add speaker tags, and export a corrected SRT.
        </p>
      </header>

      <main className="app-main">
        <section className="input-panel">
          <FileUpload
            label="Transcript / Caption File"
            accept=".srt,.vtt,.txt"
            onFileSelect={handleTranscriptFile}
            fileName={transcriptFileName}
          />

          <ScriptInput
            scriptText={scriptText}
            onScriptTextChange={(text) => {
              setScriptText(text);
              setGenerated(false);
            }}
            onScriptFileSelect={handleScriptFile}
            scriptFileName={scriptFileName}
          />

          <div className="controls-row">
            <label className="threshold-label">
              Match threshold:
              <input
                type="number"
                min={0}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </label>
            <button type="button" className="btn btn-primary" onClick={handleGenerate}>
              Generate Corrected SRT
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}
        </section>

        {generated && (
          <>
            <section className="summary-panel">
              <div className="summary-grid">
                <div className="summary-card">
                  <span className="summary-value">{summary.total}</span>
                  <span className="summary-label">Total Captions</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">{summary.changed}</span>
                  <span className="summary-label">Changed</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">{summary.needsReview}</span>
                  <span className="summary-label">Needs Review</span>
                </div>
                <div className="summary-card">
                  <span className="summary-value">{summary.unmatched}</span>
                  <span className="summary-label">Unmatched Script Lines</span>
                </div>
              </div>

              <div className="filter-row">
                <span>Filter:</span>
                <button
                  type="button"
                  className={`filter-btn ${filter === FILTERS.ALL ? 'active' : ''}`}
                  onClick={() => setFilter(FILTERS.ALL)}
                >
                  All Captions
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filter === FILTERS.CHANGED ? 'active' : ''}`}
                  onClick={() => setFilter(FILTERS.CHANGED)}
                >
                  Changed Only
                </button>
                <button
                  type="button"
                  className={`filter-btn ${filter === FILTERS.REVIEW ? 'active' : ''}`}
                  onClick={() => setFilter(FILTERS.REVIEW)}
                >
                  Needs Review Only
                </button>
                <button type="button" className="btn btn-primary export-btn" onClick={handleExport}>
                  Export SRT
                </button>
              </div>
            </section>

            <PreviewTable captions={filteredCaptions} onUpdateCaption={handleUpdateCaption} />
            <UnmatchedScriptPanel lines={unmatchedScriptLines} />
          </>
        )}
      </main>
    </div>
  );
}
