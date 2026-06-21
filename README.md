# Caption Script Matcher

A local tool that compares a Premiere Pro transcript/caption export against an original written script, corrects dialogue using matched script lines, adds speaker tags, and exports a corrected `.srt` file for re-import into Adobe Premiere Pro.

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

To build for production:

```bash
npm run build
npm run preview
```

## Supported file formats

### Transcript / caption input

- `.srt`
- `.vtt`
- `.txt` (one caption per line; placeholder timing is assigned)

### Original script input

- `.pdf` (text-based PDFs)
- `.docx`
- `.txt`
- pasted text

## How it works

1. Upload your Premiere transcript/caption file — timing is preserved from this file.
2. Upload or paste your original script — dialogue and speaker names come from here.
3. Click **Generate Corrected SRT** to fuzzy-match transcript lines to script dialogue in order.
4. Review the preview table, edit speaker names or final caption text as needed, and filter by changed or needs-review lines.
5. Click **Export SRT** to download a Premiere-compatible file.

Exported captions use this format:

```
[Speaker Name]: Dialogue text
```

## Known limitations

- **Scanned/image PDFs**: The app extracts text from text-based PDFs only. If a PDF is image-based or scanned, extraction may fail. You will see an error suggesting OCR or a text-based export.
- **Script parsing**: Scene headings, action lines, SFX, music cues, and ambience notes are ignored. Only dialogue in standard screenplay formats is parsed (e.g. `SPEAKER: line` or speaker name on its own line followed by dialogue).
- **No fill-in**: Script lines missing from the transcript are only shown in "Unmatched Script Lines" when they fall between the first and last matched script lines (gaps within the transcript span). Lines before or after that span are ignored. Unmatched lines are never added to the exported SRT.
- **Timing**: All original transcript timestamps and caption order are preserved. No new captions are created.

## Sample files

See the `/samples` folder:

- `sample.srt` — example transcript
- `sample-script.txt` — example screenplay dialogue
- `sample-script.pdf` — example screenplay dialogue as PDF

Try uploading both to test the workflow.

## Import exported SRT into Premiere Pro

1. In Premiere Pro, open your sequence.
2. Go to **File → Import** and select the exported `.srt` file.
3. Alternatively, use the **Captions** panel: import the SRT as a caption track.
4. Verify timing and speaker tags in the timeline.
5. Adjust styling in the Captions workspace if needed.

Premiere expects standard SRT timestamps in the format `00:00:01,000 --> 00:00:04,000`.

## Project structure

```
src/
  components/     React UI (upload, preview table, unmatched panel)
  lib/            Parsers, matchers, PDF/DOCX extractors, SRT exporter
samples/          Sample transcript and script files
```
