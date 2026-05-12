# Chroma Sprite Cutter

Local browser tool for preparing 2D game spritesheets from chroma-keyed PNGs.

The project is evolving from a simple background remover into a full local
pipeline: import a PNG, clean the chroma background, rebuild a regular
spritesheet, inspect the result, then export game-ready files.

Everything runs in the browser: no upload, no backend, no telemetry.

## Current Workflow

The app is organized as a guided 4-step workflow.

### 1. Import

- Drag and drop a PNG or choose one from disk.
- Preview the untouched source image.
- Inspect file name, dimensions, size, format, and detected key color.
- Continue is disabled until a valid image is loaded.

### 2. Clean Background

- Auto-detect the chroma key color from image corners.
- Pick a key color with the eyedropper.
- Tune tolerance, softness, spill suppression, edge cleanup, and detail
  preservation.
- Preview with checker, white, black, gray, red, or blue backgrounds.
- Use view modes: Original, Processed, Split, and Alpha mask.
- Zoom, pan, fit, and reset the preview.
- Save/load mask-only presets.

### 3. Build Sprite Sheet

- Enable the Sprite Sheet Builder.
- Extract frames from a source grid.
- Configure source columns, rows, margins, gaps, and alpha threshold.
- Configure output columns, rows, frame width, frame height, padding, fit mode,
  and anchor.
- Apply common templates such as `5 x 2 / 128`, `8 x 1 / 64`, `4 x 4 / 256`,
  and `RPG walk`.
- Select which source frames are included in the rebuilt sheet, with excluded
  frames removed and the remaining frames compacted in order.
- Preview the result as Source overlay, Extracted frames, or Final sheet.
- Display source grid, detected bounds, output grid, and frame numbering.
- Show basic warnings for invalid grids, frame count mismatch, empty frames,
  clipping risk, and padding issues.

### 4. Export

- Export the processed transparent PNG.
- Export the rebuilt spritesheet PNG when sheet building is enabled.
- Export JSON metadata for the final image or spritesheet.
- Export individual frames from the rebuilt sheet.
- Save/load a project preset containing both chroma key and spritesheet
  settings.

## Available Features

- PNG-only local import.
- YCbCr chroma-key algorithm designed to preserve shadows/highlights better than
  raw RGB distance.
- Web Worker processing for responsive real-time chroma preview.
- Canvas-based preview with pan and cursor-anchored zoom.
- Alpha mask inspection mode for mask debugging.
- Deterministic source-grid spritesheet reconstruction.
- Source frame inclusion/exclusion before sheet reconstruction.
- Fit modes: contain, cover, original size.
- Anchors: center, bottom-center, top-center.
- PNG export with strict output dimensions.
- JSON metadata export.
- Individual frame export.
- Mask-only presets and full project presets.
- Unit tests for chroma key, image export helpers, presets, spritesheet
  extraction, templates, and validation.

## Roadmap

The broader roadmap is tracked in
`memory-bank/CDC_ROADMAP_Chroma_Sprite_Cutter.md`.

Short-term priorities:

- Improve overlays and warnings.
- Add richer export formats, including ZIP packaging.
- Add an animation preview player.
- Add frame names, ranges, and animation metadata.
- Improve project presets and templates.

Medium-term priorities:

- Manual frame corrections: move, crop, resize, duplicate, delete, reorder.
- Auto-detection by visible connected components.
- Custom pivots and ground-line inspection.
- Batch processing and reusable templates.

Long-term priorities:

- Engine-oriented metadata exports.
- Texture bleeding prevention and edge extrusion.
- Animation organization for complex sheets.
- Production-grade project files.

## Stack

- Vite 8 + React 18 + TypeScript 5.
- Web Workers through Vite `?worker` imports.
- Vitest + happy-dom for unit tests.
- Inline styles backed by shared theme tokens in [src/theme.ts](src/theme.ts).
- No backend and no CSS framework.

## Getting Started

```sh
npm install
npm run dev
```

Other scripts:

| Script | Action |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck and production bundle |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Strict type check only |
| `npm run test` | Vitest watch mode |
| `npm run test:run` | Vitest one-shot |

## Keyboard Shortcuts

| Key | Action |
| --- | --- |
| `O` | Original view in Clean Background |
| `P` | Processed view in Clean Background |
| `S` | Split view in Clean Background |
| `A` | Alpha mask view in Clean Background |
| `I` | Toggle eyedropper in Clean Background |
| `Esc` | Cancel eyedropper |
| `+` / `-` | Zoom in / out |
| `0` | Fit |
| `1` | 100% |
| `Ctrl` + wheel | Zoom centered on cursor |
| `Cmd` + wheel | Same on macOS |

Shortcuts are ignored while focus is inside an input, textarea, or select.

## Chroma Key Algorithm

For each pixel:

1. Convert RGB to CbCr using BT.601 coefficients.
2. Compute chroma distance to the selected key color.
3. Clear pixels inside the tolerance radius.
4. Apply a softened alpha ramp according to softness and preserve-details.
5. Suppress color spill on semi-transparent pixels.
6. Optionally apply edge cleanup with thresholding and local erosion.

Implementation:

- [src/lib/chromaKey.ts](src/lib/chromaKey.ts)
- [src/lib/chromaKey.worker.ts](src/lib/chromaKey.worker.ts)

## Sprite Sheet Builder

The current MVP uses source-grid extraction:

1. Divide the processed transparent image into source grid cells.
2. Detect visible content bounds in each cell from alpha.
3. Apply the source frame inclusion/exclusion selection.
4. Recompose kept sprites into strict output frames, compacted in order.
5. Apply fit mode, anchor, and padding.
6. Produce a final transparent PNG and metadata.

Implementation:

- [src/lib/spriteSheet.ts](src/lib/spriteSheet.ts)
- [src/lib/spriteSheetValidation.ts](src/lib/spriteSheetValidation.ts)
- [src/lib/spriteSheetTemplates.ts](src/lib/spriteSheetTemplates.ts)
- [src/components/SpriteSheetPanel.tsx](src/components/SpriteSheetPanel.tsx)

## Export Metadata

Spritesheet metadata currently includes:

- source filename;
- final PNG dimensions;
- output grid columns/rows;
- frame width and height;
- fit mode and anchor;
- one entry per frame with index, generated name, destination rectangle, source
  cell, detected content bounds, draw rectangle, empty flag, and pivot.

This is a generic JSON format intended as a base for later Aseprite, Phaser,
Godot, Unity, or atlas-specific exports.

## Presets

Two preset formats exist:

- **Mask preset**, version 1: chroma key settings only.
- **Project preset**, version 2: chroma key settings plus spritesheet settings.

Mask-only presets remain supported from the Clean Background step. Full project
presets are available from the Export step.

## Project Layout

```text
src/
  components/
    BackgroundPreviewSelector.tsx
    ControlsPanel.tsx
    ExportPanel.tsx
    ImportPanel.tsx
    PreviewCanvas.tsx
    ProjectPresetPanel.tsx
    SpriteSheetPanel.tsx
  lib/
    chromaKey.ts
    chromaKey.worker.ts
    colorUtils.ts
    imageIO.ts
    presets.ts
    spriteSheet.ts
    spriteSheetTemplates.ts
    spriteSheetValidation.ts
    zoom.ts
  types/
    image.ts
    spriteSheet.ts
  App.tsx
  main.tsx
  theme.ts
```

## Current Limitations

- Auto-detection of irregular sprites is not implemented yet.
- Manual frame correction is not implemented yet.
- Individual frame export currently downloads separate PNGs rather than a ZIP.
- Animation preview and animation ranges are planned but not implemented yet.
- Advanced engine-specific metadata formats are planned but not implemented yet.

## License

Released under the [PolyForm Noncommercial License 1.0.0](LICENSE).

You may use, copy, modify, and share the software for any noncommercial
purpose: personal projects, learning, research, hobby work, and use by
charitable, educational, public research, public safety, environmental, or
governmental organizations.

Commercial use is not permitted. If you want to use Chroma Sprite Cutter in a
commercial context, open an issue on the repository to discuss a separate
arrangement.
