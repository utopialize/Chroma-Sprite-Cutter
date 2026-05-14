import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { colors } from '../../theme';
import { PalettePanel } from './components/PalettePanel';
import { PixelArtControls } from './components/PixelArtControls';
import { PixelArtExportPanel } from './components/PixelArtExportPanel';
import { PixelArtImportPanel } from './components/PixelArtImportPanel';
import { PixelArtPreview } from './components/PixelArtPreview';
import {
  createPixelArtImage,
  DEFAULT_PIXEL_ART_SETTINGS,
} from './lib/pixelate';
import type { PixelArtSettings } from './lib/pixelate';
import { getPalettePreset } from './lib/palettes';
import type {
  PixelArtPaletteMode,
  PixelArtPalettePresetId,
  PixelArtSourceImage,
  RGB,
} from './types';

const styles: Record<string, CSSProperties> = {
  root: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  workspace: {
    flex: 1,
    minHeight: 0,
    display: 'grid',
    gridTemplateColumns: '360px minmax(0, 1fr) 300px',
  },
  leftPanel: {
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    backgroundColor: colors.bgPanel,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
  },
  center: {
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  rightPanel: {
    minWidth: 0,
    minHeight: 0,
    overflowY: 'auto',
    backgroundColor: colors.bgPanel,
    borderLeft: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
  },
};

export function PixelArtConverterTool() {
  const [sourceImage, setSourceImage] = useState<PixelArtSourceImage | null>(
    null,
  );
  const [settings, setSettings] = useState<PixelArtSettings>(
    DEFAULT_PIXEL_ART_SETTINGS,
  );
  const [eyedropperEnabled, setEyedropperEnabled] = useState(false);

  useEffect(() => {
    if (!sourceImage) setEyedropperEnabled(false);
  }, [sourceImage]);

  const toggleEyedropper = useCallback(() => {
    setEyedropperEnabled((value) => !value);
  }, []);

  const handlePickKeyColor = useCallback((color: RGB) => {
    setSettings((prev) => ({ ...prev, chromaKeyColor: color }));
    setEyedropperEnabled(false);
  }, []);

  const handleColorCountChange = useCallback((colorCount: number) => {
    setSettings((prev) => ({ ...prev, colorCount }));
  }, []);

  const handlePaletteModeChange = useCallback(
    (paletteMode: PixelArtPaletteMode) => {
      setSettings((prev) => ({ ...prev, paletteMode }));
    },
    [],
  );

  const handlePalettePresetChange = useCallback(
    (palettePreset: PixelArtPalettePresetId) => {
      setSettings((prev) => ({ ...prev, palettePreset }));
    },
    [],
  );

  const handlePreviewModeChange = useCallback(
    (previewMode: PixelArtSettings['previewMode']) => {
      setSettings((prev) => ({ ...prev, previewMode }));
    },
    [],
  );

  const handlePreviewBackgroundChange = useCallback(
    (previewBackground: PixelArtSettings['previewBackground']) => {
      setSettings((prev) => ({ ...prev, previewBackground }));
    },
    [],
  );

  const handlePreviewBackgroundColorChange = useCallback(
    (previewBackgroundColor: string) => {
      setSettings((prev) => ({ ...prev, previewBackgroundColor }));
    },
    [],
  );

  const handleExportScaleChange = useCallback((exportScale: number) => {
    setSettings((prev) => ({ ...prev, exportScale }));
  }, []);

  const pixelArt = useMemo(() => {
    if (!sourceImage) return null;
    return createPixelArtImage(sourceImage, settings);
  }, [
    sourceImage,
    settings.targetWidth,
    settings.targetHeight,
    settings.colorCount,
    settings.paletteMode,
    settings.palettePreset,
    settings.dithering,
    settings.edgeEnhancementEnabled,
    settings.edgeEnhancementStrength,
    settings.edgeEnhancementMode,
    settings.protectAlphaEdges,
    settings.chromaKeyEnabled,
    settings.chromaKeyColor.r,
    settings.chromaKeyColor.g,
    settings.chromaKeyColor.b,
    settings.chromaKeyTolerance,
    settings.chromaKeySoftness,
    settings.chromaKeySpillSuppression,
    settings.chromaKeyProtectEdges,
  ]);

  const activePaletteName =
    pixelArt?.paletteName ??
    (settings.paletteMode === 'preset'
      ? getPalettePreset(settings.palettePreset).name
      : `Auto ${settings.colorCount} colors`);

  return (
    <div style={styles.root}>
      <div style={styles.workspace}>
        <aside style={styles.leftPanel}>
          <PixelArtImportPanel image={sourceImage} onImport={setSourceImage} />
          <PixelArtControls
            settings={settings}
            onChange={setSettings}
            sourceImage={sourceImage}
            eyedropperEnabled={eyedropperEnabled}
            onToggleEyedropper={toggleEyedropper}
          />
        </aside>
        <main style={styles.center}>
          <PixelArtPreview
            image={sourceImage}
            pixelArt={pixelArt}
            targetWidth={settings.targetWidth}
            targetHeight={settings.targetHeight}
            exportScale={settings.exportScale}
            previewMode={settings.previewMode}
            previewBackground={settings.previewBackground}
            previewBackgroundColor={settings.previewBackgroundColor}
            onPreviewModeChange={handlePreviewModeChange}
            onPreviewBackgroundChange={handlePreviewBackgroundChange}
            onPreviewBackgroundColorChange={handlePreviewBackgroundColorChange}
            eyedropperEnabled={eyedropperEnabled}
            onPickKeyColor={handlePickKeyColor}
          />
        </main>
        <aside style={styles.rightPanel}>
          <PalettePanel
            palette={pixelArt?.palette ?? []}
            paletteMode={settings.paletteMode}
            palettePreset={settings.palettePreset}
            paletteName={activePaletteName}
            colorCount={settings.colorCount}
            onPaletteModeChange={handlePaletteModeChange}
            onPalettePresetChange={handlePalettePresetChange}
            onColorCountChange={handleColorCountChange}
          />
          <PixelArtExportPanel
            sourceImage={sourceImage}
            pixelArt={pixelArt}
            exportScale={settings.exportScale}
            onExportScaleChange={handleExportScaleChange}
          />
        </aside>
      </div>
    </div>
  );
}
