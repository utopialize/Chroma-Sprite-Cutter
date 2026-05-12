import type { LoadedImage } from '../types/image';
import type {
  SpriteSheetBuildResult,
  SpriteSheetDiagnostic,
  SpriteSheetSettings,
} from '../types/spriteSheet';

export function validateSpriteSheetSettings(
  image: LoadedImage | null,
  settings: SpriteSheetSettings,
  result?: SpriteSheetBuildResult | null,
): SpriteSheetDiagnostic[] {
  if (!settings.enabled) return [];

  const diagnostics: SpriteSheetDiagnostic[] = [];
  const sourceCount = settings.sourceColumns * settings.sourceRows;
  const excludedCount = settings.excludedSourceFrameIndices.filter(
    (index) => index >= 0 && index < sourceCount,
  ).length;
  const includedCount = sourceCount - excludedCount;
  const outputCount = settings.outputColumns * settings.outputRows;

  if (!image) {
    diagnostics.push({
      severity: 'error',
      code: 'missing-source',
      message: 'No source image is loaded.',
    });
    return diagnostics;
  }

  if (includedCount !== outputCount) {
    diagnostics.push({
      severity: 'warning',
      code: 'frame-count-mismatch',
      message: `Selection has ${includedCount} included frame(s) but output grid has ${outputCount} slots.`,
    });
  }

  if (includedCount === 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'no-included-frames',
      message: 'No source frames are included in the output sheet.',
    });
  }

  if (settings.animationStartFrame > includedCount && includedCount > 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'animation-range-outside-selection',
      message: 'Animation start frame is outside the included frame selection.',
    });
  }

  if (settings.animationEndFrame > includedCount && includedCount > 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'animation-range-clamped',
      message: 'Animation end frame is past the included frames and will be clamped.',
    });
  }

  const usableWidth =
    image.width -
    settings.sourceMarginX * 2 -
    settings.sourceGapX * (settings.sourceColumns - 1);
  const usableHeight =
    image.height -
    settings.sourceMarginY * 2 -
    settings.sourceGapY * (settings.sourceRows - 1);

  if (usableWidth <= 0 || usableHeight <= 0) {
    diagnostics.push({
      severity: 'error',
      code: 'invalid-source-grid',
      message: 'Source margins and gaps leave no usable image area.',
    });
  }

  if (settings.padding === 0) {
    diagnostics.push({
      severity: 'warning',
      code: 'no-padding',
      message: 'No output padding is set; this can increase texture bleeding risk.',
    });
  }

  if (settings.frameWidth <= settings.padding * 2 || settings.frameHeight <= settings.padding * 2) {
    diagnostics.push({
      severity: 'error',
      code: 'invalid-padding',
      message: 'Padding is too large for the output frame size.',
    });
  }

  if (result) {
    const emptyFrames = result.frames.filter((frame) => frame.empty);
    if (emptyFrames.length > 0) {
      diagnostics.push({
        severity: 'warning',
        code: 'empty-frames',
        message: `${emptyFrames.length} output frame(s) have no detected visible pixels.`,
      });
    }

    const clippedFrames = result.frames.filter((frame) => {
      if (!frame.drawRect) return false;
      const drawRight = frame.drawRect.x + frame.drawRect.width;
      const drawBottom = frame.drawRect.y + frame.drawRect.height;
      const cellRight = frame.destinationCell.x + frame.destinationCell.width;
      const cellBottom = frame.destinationCell.y + frame.destinationCell.height;
      return (
        frame.drawRect.x < frame.destinationCell.x ||
        frame.drawRect.y < frame.destinationCell.y ||
        drawRight > cellRight ||
        drawBottom > cellBottom
      );
    });

    if (clippedFrames.length > 0) {
      diagnostics.push({
        severity: 'warning',
        code: 'clipped-frames',
        message: `${clippedFrames.length} frame(s) are clipped by their output cell.`,
      });
    }
  }

  return diagnostics;
}
