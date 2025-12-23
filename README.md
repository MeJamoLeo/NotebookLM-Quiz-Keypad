# NotebookLM Quiz Keypad (Chrome Extension)

Keyboard-only controls for NotebookLM quiz UI. Works across nested iframes/blob
contexts by injecting a content script into all frames and matching visible
buttons by text/aria labels.

Japanese version: [README.ja.md](https://github.com/MeJamoLeo/NotebookLM-Quiz-Keypad/blob/main/README.ja.md)

This extension was created to enable an Anki-like, keyboard-only answering flow
inside NotebookLM quizzes.

## Features

- Answer selection: `1` → A, `2` → B, `3` → C, `4` → D
- Navigation: `Space` → Next, `Shift+Space` → Previous
- Hint/Explain: `5` → Hint (fallback to Explain when Hint is missing)
- No auto-advance after answering
- Prevents page scroll on Space while quiz controls are active

## Supported URLs

- `https://notebooklm.google.com/*`
- `https://*.usercontent.goog/*`

## Install (Developer Mode)

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked**.
4. Select this folder.

## Usage

- Open a NotebookLM notebook and launch a quiz.
- Use `1-5` and `Space` shortcuts while the quiz is visible.
- If you open DevTools, the extension logs with `[NBLM-EXT]` prefix.

## How It Works

The content script runs in all frames and:

- Detects visible quiz controls by matching button text/aria labels
- Clicks the matching element when a shortcut is pressed
- Relays key events between frames to reach blob/iframe contexts

## Troubleshooting

- If shortcuts do nothing, open DevTools and confirm `[NBLM-EXT]` logs appear
  in the quiz frame.
- Reload the extension after any code changes.

## Files

- `manifest.json` — MV3 manifest
- `content.js` — content script (keyboard + click logic)

## License

Add a license file if you plan to publish this publicly.
