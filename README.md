# Chroma Sprite Cutter

Local browser tool to convert chroma-keyed PNG sprites into clean transparent
PNGs. Built for game asset workflows where AI-generated sprites come on a flat
green / blue / magenta background and need a clean alpha channel.

Everything runs in the browser — no upload, no backend, no telemetry.

## Features

- **Drag & drop** PNG import with auto-detected key color (samples the 4 corners
  on load).
- **Eyedropper** to pick the key color directly from the image.
- **Chroma key on YCbCr distance** — discriminates hue without confusing
  shadows or highlights on the screen.
- **Real-time preview** via a Web Worker; the main thread stays responsive on
  large sprites while dragging sliders.
- **Preview backgrounds** — checker / white / black / gray / red / blue — drawn
  into the canvas so you can spot leftover edge pixels at a glance.
- **View modes** — `Original` / `Processed` / `Split` (original on the left,
  processed on the right, with a center divider).
- **Zoom** to 0.25× – 16×, with `Ctrl + wheel` anchored on the cursor, click /
  middle-drag to pan, `Fit` to recenter.
- **Save / load presets** as JSON files (`{ version, settings, createdAt }`).
- **Export** the processed image as a true transparent PNG at native
  resolution, named `<source>_transparent.png`.

## Stack

- Vite 8 + React 18 + TypeScript 5 (strict, `verbatimModuleSyntax`).
- Web Workers via Vite's `?worker` import.
- Vitest + happy-dom for unit tests.
- No CSS framework — inline styles fed by a small theme module
  ([src/theme.ts](src/theme.ts)).

## Getting started

```sh
npm install
npm run dev
```

Other scripts:

| Script               | Action                                        |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Vite dev server                               |
| `npm run build`      | `tsc -b` typecheck + production bundle        |
| `npm run preview`    | Serve the production build locally            |
| `npm run typecheck`  | Strict type check only                        |
| `npm run test`       | Vitest in watch mode                          |
| `npm run test:run`   | Vitest one-shot                               |

## Keyboard shortcuts

| Key              | Action                          |
| ---------------- | ------------------------------- |
| `O` / `P` / `S`  | Original / Processed / Split    |
| `I`              | Toggle eyedropper               |
| `Esc`            | Cancel eyedropper               |
| `+` / `-`        | Zoom in / out                   |
| `0`              | Fit                             |
| `1`              | 100%                            |
| `Ctrl` + wheel   | Zoom centered on cursor         |
| `⌘` + wheel      | Same on macOS                   |

Shortcuts are ignored while focus is on an input / textarea / select.

## Algorithm (short version)

For each pixel:

1. Convert RGB → CbCr (BT.601). Compute squared chroma distance to the key
   color's CbCr.
2. If distance ≤ `tolerance` → alpha = 0.
3. If distance ∈ `(tolerance, tolerance + softness × 128 / 100)` → alpha is a
   linear ramp raised to a gamma derived from `preserveDetails` (0 = softer
   transitions, 100 = sharper edges).
4. **Spill suppression** on semi-transparent pixels — the dominant channel of
   the key color is clamped to `max(other two)` + reduced delta. Auto-targets
   green, blue, or red based on the key color.
5. **Edge cleanup** zeroes alpha values below a threshold and applies a 3×3
   morphological erosion proportional to the setting.

Full implementation in [src/lib/chromaKey.ts](src/lib/chromaKey.ts), running
inside [src/lib/chromaKey.worker.ts](src/lib/chromaKey.worker.ts).

## Project layout

```
src/
  components/
    BackgroundPreviewSelector.tsx   Preview background pills
    ControlsPanel.tsx               Key color, sliders, preset save/load
    ExportPanel.tsx                 Transparent PNG export
    ImportPanel.tsx                 Drag & drop + file picker
    PreviewCanvas.tsx               Canvas, worker, pan / zoom / eyedropper
  lib/
    chromaKey.ts                    YCbCr-based applyChromaKey + samplePixel
    chromaKey.worker.ts             Worker wrapper around applyChromaKey
    colorUtils.ts                   hex ⇄ RGB, autoDetectKeyColor
    imageIO.ts                      Export transparent PNG + filename helper
    presets.ts                      Serialize / parse / download mask presets
    zoom.ts                         Zoom levels + step helpers
  types/image.ts                    Shared types (RGB, LoadedImage, etc.)
  App.tsx                           Layout, state, keyboard shortcuts
  main.tsx                          React entry
  theme.ts                          Color / spacing / radii tokens
```

## Preset file format

```json
{
  "version": 1,
  "settings": {
    "keyColor": { "r": 0, "g": 255, "b": 0 },
    "tolerance": 30,
    "softness": 25,
    "spillSuppression": 50,
    "edgeCleanup": 0,
    "preserveDetails": 50
  },
  "createdAt": "2026-05-11T12:34:56.000Z"
}
```

`parsePreset` validates every field's type before applying — malformed files
raise a visible error instead of corrupting state.

## License

No license set yet — treat as personal-use code unless you add one.
