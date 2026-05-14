export interface LoadedPngImage {
  element: HTMLImageElement;
  name: string;
  width: number;
  height: number;
  size: number;
}

export function isPngFile(file: File): boolean {
  return file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
}

export function loadPngFromFile(file: File): Promise<LoadedPngImage> {
  if (!isPngFile(file)) {
    return Promise.reject(new Error('Only PNG files are supported'));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        element: img,
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode PNG'));
    };
    img.src = url;
  });
}

export function buildPixelArtExportName(
  sourceName: string,
  exportScale: number,
): string {
  const stem = stripExtension(sourceName);
  return exportScale === 1
    ? `${stem}_pixel.png`
    : `${stem}_pixel_${exportScale}x.png`;
}

export async function exportPixelArtPng(
  sourceName: string,
  pixelArtCanvas: HTMLCanvasElement,
  exportScale: number,
): Promise<void> {
  const scale = Math.max(1, Math.round(exportScale));
  const output = document.createElement('canvas');
  output.width = pixelArtCanvas.width * scale;
  output.height = pixelArtCanvas.height * scale;
  const ctx = output.getContext('2d');
  if (!ctx) throw new Error('Cannot obtain 2D context');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, output.width, output.height);
  ctx.drawImage(pixelArtCanvas, 0, 0, output.width, output.height);
  const blob = await canvasToPngBlob(output);
  triggerDownload(blob, buildPixelArtExportName(sourceName, scale));
}

function stripExtension(sourceName: string): string {
  const dot = sourceName.lastIndexOf('.');
  return dot === -1 ? sourceName : sourceName.slice(0, dot);
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to encode PNG'));
    }, 'image/png');
  });
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
