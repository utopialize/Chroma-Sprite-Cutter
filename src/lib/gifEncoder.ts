const MAX_DICT = 4096;
const MAX_PALETTE_COLORS = 255; // 256 minus one slot reserved for the transparent index.

export interface GifFrameInput {
  imageData: ImageData;
  delayCs: number;
  alphaThreshold?: number;
}

export interface QuantizeResult {
  palette: Uint8Array;
  indices: Uint8Array;
  transparentIndex: number;
}

export class GifEncoder {
  private chunks: number[] = [];
  private readonly width: number;
  private readonly height: number;

  constructor(width: number, height: number, loops = 0) {
    if (width <= 0 || height <= 0) {
      throw new Error('GIF dimensions must be positive');
    }
    this.width = width;
    this.height = height;
    this.writeHeader();
    this.writeLogicalScreenDescriptor();
    this.writeNetscapeLoop(loops);
  }

  addFrame(frame: GifFrameInput): void {
    if (frame.imageData.width !== this.width || frame.imageData.height !== this.height) {
      throw new Error('Frame dimensions do not match the GIF dimensions');
    }
    const alphaThreshold = clamp(frame.alphaThreshold ?? 128, 0, 255);
    const quantized = quantize(
      frame.imageData.data,
      this.width,
      this.height,
      alphaThreshold,
    );

    const paddedSize = ensurePowerOfTwoSize(quantized.palette.length / 3);
    const colorTableSizeCode = Math.log2(paddedSize) - 1;
    const lzwMinCodeSize = Math.max(2, Math.log2(paddedSize));

    this.writeGraphicControlExtension(
      frame.delayCs,
      quantized.transparentIndex,
    );
    this.writeImageDescriptor(colorTableSizeCode);
    this.writePaddedColorTable(quantized.palette, paddedSize);
    this.writeImageData(quantized.indices, lzwMinCodeSize);
  }

  finalize(): Uint8Array {
    this.writeByte(0x3b);
    return new Uint8Array(this.chunks);
  }

  private writeHeader(): void {
    this.writeString('GIF89a');
  }

  private writeLogicalScreenDescriptor(): void {
    this.writeShort(this.width);
    this.writeShort(this.height);
    this.writeByte(0); // No global color table.
    this.writeByte(0); // Background color index.
    this.writeByte(0); // Pixel aspect ratio.
  }

  private writeNetscapeLoop(loops: number): void {
    this.writeByte(0x21); // Extension introducer.
    this.writeByte(0xff); // Application extension label.
    this.writeByte(11);
    this.writeString('NETSCAPE2.0');
    this.writeByte(3); // Sub-block size.
    this.writeByte(1); // Sub-block id.
    this.writeShort(loops); // 0 = infinite.
    this.writeByte(0); // Block terminator.
  }

  private writeGraphicControlExtension(
    delayCs: number,
    transparentIndex: number,
  ): void {
    this.writeByte(0x21);
    this.writeByte(0xf9);
    this.writeByte(4);
    // Disposal method 2 = restore to background. Transparency flag = 1.
    this.writeByte((2 << 2) | 1);
    this.writeShort(Math.max(0, Math.round(delayCs)));
    this.writeByte(transparentIndex);
    this.writeByte(0);
  }

  private writeImageDescriptor(colorTableSizeCode: number): void {
    this.writeByte(0x2c);
    this.writeShort(0); // Left.
    this.writeShort(0); // Top.
    this.writeShort(this.width);
    this.writeShort(this.height);
    // Local color table flag (bit 7) + interlace 0 + sort 0 + size code.
    this.writeByte(0x80 | (colorTableSizeCode & 0x07));
  }

  private writePaddedColorTable(palette: Uint8Array, paddedSize: number): void {
    const usedEntries = palette.length / 3;
    for (let i = 0; i < paddedSize; i++) {
      if (i < usedEntries) {
        this.writeByte(palette[i * 3]);
        this.writeByte(palette[i * 3 + 1]);
        this.writeByte(palette[i * 3 + 2]);
      } else {
        this.writeByte(0);
        this.writeByte(0);
        this.writeByte(0);
      }
    }
  }

  private writeImageData(indices: Uint8Array, lzwMinCodeSize: number): void {
    this.writeByte(lzwMinCodeSize);
    const encoded = lzwEncode(indices, lzwMinCodeSize);
    this.writeSubBlocks(encoded);
    this.writeByte(0);
  }

  private writeSubBlocks(data: Uint8Array): void {
    for (let i = 0; i < data.length; i += 255) {
      const len = Math.min(255, data.length - i);
      this.writeByte(len);
      for (let j = 0; j < len; j++) this.writeByte(data[i + j]);
    }
  }

  private writeByte(b: number): void {
    this.chunks.push(b & 0xff);
  }

  private writeShort(value: number): void {
    this.chunks.push(value & 0xff);
    this.chunks.push((value >> 8) & 0xff);
  }

  private writeString(str: string): void {
    for (let i = 0; i < str.length; i++) {
      this.chunks.push(str.charCodeAt(i) & 0xff);
    }
  }
}

export function quantize(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  alphaThreshold: number,
): QuantizeResult {
  const histogram = new Map<number, number>();
  const totalPixels = width * height;
  const indices = new Uint8Array(totalPixels);

  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    if (pixels[i + 3] < alphaThreshold) continue;
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    histogram.set(key, (histogram.get(key) ?? 0) + 1);
  }

  const colors = [...histogram.entries()].map(([key, count]) => ({
    r: (key >> 16) & 0xff,
    g: (key >> 8) & 0xff,
    b: key & 0xff,
    count,
  }));

  const paletteRgb =
    colors.length <= MAX_PALETTE_COLORS
      ? colors.map((c) => [c.r, c.g, c.b] as [number, number, number])
      : medianCut(colors, MAX_PALETTE_COLORS);

  // Reserve the last index for transparency.
  const transparentIndex = paletteRgb.length;
  const palette = new Uint8Array((paletteRgb.length + 1) * 3);
  for (let i = 0; i < paletteRgb.length; i++) {
    palette[i * 3] = paletteRgb[i][0];
    palette[i * 3 + 1] = paletteRgb[i][1];
    palette[i * 3 + 2] = paletteRgb[i][2];
  }
  // Transparent slot value is unused, leave it black.

  const cache = new Map<number, number>();
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    if (pixels[i + 3] < alphaThreshold) {
      indices[p] = transparentIndex;
      continue;
    }
    const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
    let nearest = cache.get(key);
    if (nearest === undefined) {
      nearest = nearestPaletteIndex(
        pixels[i],
        pixels[i + 1],
        pixels[i + 2],
        paletteRgb,
      );
      cache.set(key, nearest);
    }
    indices[p] = nearest;
  }

  return { palette, indices, transparentIndex };
}

function medianCut(
  colors: { r: number; g: number; b: number; count: number }[],
  maxColors: number,
): [number, number, number][] {
  const boxes: { colors: typeof colors }[] = [{ colors: colors.slice() }];
  while (boxes.length < maxColors) {
    let bestIndex = -1;
    let bestRange = -1;
    let bestAxis: 'r' | 'g' | 'b' = 'r';
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.colors.length < 2) continue;
      const range = computeRange(box.colors);
      const max = Math.max(range.r, range.g, range.b);
      if (max > bestRange) {
        bestRange = max;
        bestIndex = i;
        bestAxis = range.r === max ? 'r' : range.g === max ? 'g' : 'b';
      }
    }
    if (bestIndex === -1) break;
    const box = boxes[bestIndex];
    box.colors.sort((a, b) => a[bestAxis] - b[bestAxis]);
    const mid = Math.floor(box.colors.length / 2);
    const right = { colors: box.colors.slice(mid) };
    box.colors = box.colors.slice(0, mid);
    boxes.splice(bestIndex + 1, 0, right);
  }

  return boxes.map((box) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let total = 0;
    for (const c of box.colors) {
      r += c.r * c.count;
      g += c.g * c.count;
      b += c.b * c.count;
      total += c.count;
    }
    if (total === 0) return [0, 0, 0];
    return [
      Math.round(r / total),
      Math.round(g / total),
      Math.round(b / total),
    ];
  });
}

function computeRange(
  colors: { r: number; g: number; b: number }[],
): { r: number; g: number; b: number } {
  let rmin = 255;
  let rmax = 0;
  let gmin = 255;
  let gmax = 0;
  let bmin = 255;
  let bmax = 0;
  for (const c of colors) {
    if (c.r < rmin) rmin = c.r;
    if (c.r > rmax) rmax = c.r;
    if (c.g < gmin) gmin = c.g;
    if (c.g > gmax) gmax = c.g;
    if (c.b < bmin) bmin = c.b;
    if (c.b > bmax) bmax = c.b;
  }
  return { r: rmax - rmin, g: gmax - gmin, b: bmax - bmin };
}

function nearestPaletteIndex(
  r: number,
  g: number,
  b: number,
  palette: [number, number, number][],
): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = p[0] - r;
    const dg = p[1] - g;
    const db = p[2] - b;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
      if (dist === 0) return i;
    }
  }
  return best;
}

export function lzwEncode(
  indices: Uint8Array,
  minCodeSize: number,
): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  const output: number[] = [];
  let bitBuffer = 0;
  let bitCount = 0;
  let codeBits = minCodeSize + 1;

  const emit = (code: number): void => {
    bitBuffer |= code << bitCount;
    bitCount += codeBits;
    while (bitCount >= 8) {
      output.push(bitBuffer & 0xff);
      bitBuffer >>>= 8;
      bitCount -= 8;
    }
  };

  let dict = new Map<number, number>();
  let nextCode = endCode + 1;

  emit(clearCode);

  if (indices.length === 0) {
    emit(endCode);
  } else {
    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      const existing = dict.get(key);
      if (existing !== undefined) {
        prefix = existing;
        continue;
      }
      emit(prefix);
      if (nextCode < MAX_DICT) {
        dict.set(key, nextCode);
        nextCode++;
        // Encoder grows one step later than the decoder: decoders move to the
        // wider width once dict.length reaches 2^codeBits, while encoders only
        // emit the wider code after inserting one slot past that boundary.
        if (nextCode === (1 << codeBits) + 1 && codeBits < 12) {
          codeBits++;
        }
      } else {
        emit(clearCode);
        dict = new Map();
        nextCode = endCode + 1;
        codeBits = minCodeSize + 1;
      }
      prefix = k;
    }
    emit(prefix);
    emit(endCode);
  }

  if (bitCount > 0) {
    output.push(bitBuffer & 0xff);
  }

  return new Uint8Array(output);
}

function ensurePowerOfTwoSize(value: number): number {
  let size = 4;
  while (size < value) size *= 2;
  return Math.min(256, size);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
