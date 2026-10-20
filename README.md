# Premium Books Quiz Studio — Browser UI + MP4 Renderer

## Browser UI (recommended)

This package includes a local browser-based control panel. It uses the same React/Remotion composition for the live preview and provides question editing, a ratio switch, validation, Hindi voice generation, and MP4 rendering.

### Start on Windows

1. Extract the ZIP to a normal writable folder (for example `C:\PremiumBooksQuizStudio`).
2. Install **Node.js LTS** and **Python 3.10+** if they are not already installed.
3. Double-click `START-QUIZ-STUDIO.bat`. The first run installs Node dependencies and may install `edge-tts`; internet is needed for setup and online Hindi voice generation.
4. When the terminal reports that the Studio is ready, open `http://127.0.0.1:3001` in Chrome or Edge. Keep the terminal open while using the Studio.
5. Edit a question and its four options, select the correct option, then click **Save Changes**.
6. Choose **16:9 Landscape** or **9:16 Portrait**. Use **Validate Questions**, **Generate Voice-over**, or **Render MP4** from the preview panel.
7. A successful render appears in the `output` folder and is also linked from the UI.

### Run manually

```powershell
npm install
py -m pip install edge-tts
npm run ui
```

Then open `http://127.0.0.1:3001`.

### Browser UI notes

- The preview is interactive and uses the project's Remotion composition; use the Player controls to play or scrub.
- The preview intentionally omits narration audio, so you can scrub without repeatedly hearing the generated clips. The rendered MP4 includes the generated Hindi voice-over.
- Editing/saving questions invalidates old timing measurements. Generate Voice-over or Render MP4 after editing so narration and dynamic timings are regenerated.
- The UI server binds to `127.0.0.1` (this computer only), not the public network.
- A 10-minute 1080p render can take time on a CPU-only PC. Keep the terminal open until the task finishes.

---

# Premium Books Long Quiz Generator (10-minute MVP)

## What it does
- React + Remotion video composition (1920×1080 landscape or 1080×1920 portrait, 30 FPS).
- Scene-based Hindi quiz video with question/options, a thinking pause, then answer + explanation. Scene timing is measured from generated speech audio.
- Includes 30 sample Hindi questions; final duration depends on generated narration lengths.
- Divine Mind mascot is code-drawn as SVG; the supplied neural-energy animation is included as a local MP4 asset.
- JSON question bank; batch import by editing `data/questions.json`.
- Optional Hindi neural voice-over generation using Edge TTS.
- MP4 rendering via Remotion + FFmpeg.
- Post-render `ffprobe` validation of duration, resolution, FPS and audio stream.

## Requirements
- Windows 10/11, Node.js LTS (18+ recommended), Python 3.10+.
- Internet connection for npm packages, Edge TTS and Google Fonts (font fallback exists).
- FFmpeg is used by Remotion rendering. Install FFmpeg and ensure `ffmpeg -version` works if Remotion does not find its bundled binary.
- Rendering is CPU-capable but a 10-minute 1080p video may take a long time without a GPU.

## Setup (PowerShell)
```powershell
cd premium_books_long_quiz
npm install
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install edge-tts
npm run validate
```

## Generate Hindi voice-over clips
```powershell
python scripts\generate_tts.py
```
Voice default: `hi-IN-SwaraNeural`. To choose a supported voice:
```powershell
edge-tts --list-voices
$env:EDGE_TTS_VOICE="hi-IN-MadhurNeural"
$env:EDGE_TTS_RATE="+10%"
python scripts\generate_tts.py
```
TTS uses an online service; it is not offline and may be subject to service availability/terms.

## Preview in Remotion Studio
```powershell
npm run studio
```
Choose `PremiumBooksQuiz`. The default composition is 30 questions × 20 seconds = 600 seconds.

## Render MP4
```powershell
npm run render
```
Output: `output\premium-books-quiz.mp4`. After rendering, `validate-output.mjs` checks duration (600 seconds ± 0.15s), resolution, 30 FPS and audio stream. Ensure `ffprobe` is on PATH.

## Editing questions
Edit `data/questions.json` (UTF-8). For exactly 10 minutes, keep 30 questions because each question is allotted 20 seconds. The TTS/render commands refresh `data/render-props.json` from this file. Each item must contain:
```json
{
  "question": "प्रश्न?",
  "options": ["विकल्प A", "विकल्प B", "विकल्प C", "विकल्प D"],
  "answer": 0,
  "explanation": "संक्षिप्त व्याख्या",
  "category": "सामान्य ज्ञान"
}
```
`answer` is zero-based: 0=A, 1=B, 2=C, 3=D. Then run `npm run validate`.

## Important MVP limitations
- `npm run studio` and `npm run render` first generate two Hindi TTS clips per question (question/options and answer/explanation) and sync `render-props.json` with the latest question bank. The clips are placed at the corresponding 0s and 10s scene positions.
- Voice-over clips should fit within their 10-second segments. If narration is cut off, shorten text or increase the TTS rate; verify the final MP4 by listening.
- TTS uses an online service; the app does not generate voice offline.
- The current Remotion composition is scene-based and CPU-capable, but full 10-minute render time depends on CPU/RAM.
- Questions are illustrative sample content. Fact-check them before publishing.
- `render` CLI command expects Remotion to load `src/index.jsx`; if your installed Remotion version changes CLI syntax, consult its local `npx remotion render --help`.


## Dynamic timing update (no fixed 20 seconds per question)

The render workflow now measures each generated MP3 using `ffprobe` and creates `data/timings.json`.
Each question gets:
- the actual question/options audio duration + a 0.45-second safety buffer (minimum 5 seconds)
- a 3-second think pause (change with `QUIZ_THINK_SECONDS`)
- the actual answer/explanation audio duration + a 0.65-second safety buffer (minimum 4 seconds)
- a 1-second tail between scenes (change with `QUIZ_TAIL_SECONDS`)

Total duration is now variable. Long explanations extend their scene; short explanations do not force every scene to be 20 seconds. Audio is sequenced within each scene using measured frame lengths.

### Run
```powershell
npm run render
```
The command regenerates audio, writes `data/timings.json`, validates question data, renders the MP4, and verifies that the final MP4 has both video and audio streams. Ensure `ffprobe -version` works in the same terminal.

### Tuning pauses and narration
```powershell
$env:QUIZ_THINK_SECONDS="3"
$env:QUIZ_TAIL_SECONDS="1"
$env:EDGE_TTS_RATE="+0%"
npm run render
```
If any spoken clip is still cut, increase the safety buffer in `scripts/generate_tts.py` (`q_audio+0.45` or `a_audio+0.65`) to 0.8–1.0 seconds. Do not speed up the voice to fit a fixed scene; dynamic scenes are intended to preserve the narration.

### Validation
```powershell
npm run validate
npm run render
```
The render command also runs `scripts/validate-output.mjs`, which checks 1920×1080 and the presence of both audio and video streams. Review `data/timings.json` to see measured audio duration and per-question scene duration.

## Divine Mind + Neural Energy Background (production update)

This build includes the uploaded Dribbble neural-energy GIF converted to `public/blue-neural-energy.mp4` so Remotion can render the animated background deterministically. The code-drawn Golden Mind is stored in `public/divine-mind.svg` and layered above the energy video.

### Render landscape (YouTube)
```bash
npm run validate
npm run render
```

### Render portrait (Shorts / Reels)
```bash
python scripts/generate_tts.py
node scripts/validate.mjs
remotion render src/index.jsx PremiumBooksQuizPortrait output/premium-books-quiz-portrait.mp4 --props=./data/render-props.json
```

The project defines two compositions: `PremiumBooksQuiz` (1920x1080) and `PremiumBooksQuizPortrait` (1080x1920). Check the rendered output on your Windows PC before publishing, especially portrait spacing and the animated GIF blending. The current renderer's spoken audio remains generated by the project's existing TTS pipeline; exact phoneme-level mouth synchronization is not yet implemented.
