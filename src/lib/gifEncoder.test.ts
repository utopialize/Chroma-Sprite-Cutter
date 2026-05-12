import { beforeAll, describe, expect, it } from 'vitest';
import { GifEncoder, lzwEncode, quantize } from './gifEncoder';

beforeAll(() => {
  if (typeof globalThis.ImageData === 'undefined') {
    class ImageDataPolyfill {
      data: Uint8ClampedArray;
      width: number;
      height: number;
      readonly colorSpace = 'srgb';
      constructor(
        data: Uint8ClampedArray | number,
        width: number,
        height?: number,
      ) {
        if (data instanceof Uint8ClampedArray) {
          this.data = data;
          this.width = width;
          this.height = height ?? data.length / 4 / width;
        } else {
          this.width = data;
          this.height = width;
          this.data = new Uint8ClampedArray(this.width * this.height * 4);
        }
      }
    }
    (globalThis as { ImageData: unknown }).ImageData = ImageDataPolyfill;
  }
});

function pixels(...rgba: number[]) {
  return new Uint8ClampedArray(rgba);
}

describe('quantize', () => {
  it('returns a palette of unique opaque colors with a transparent slot', () => {
    const data = pixels(
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      0, 0, 0, 0,
    );
    const result = quantize(data, 4, 1, 128);

    expect(result.indices.length).toBe(4);
    expect(result.transparentIndex).toBe(3);
    expect(result.palette.length).toBe(4 * 3);
    expect(result.indices[3]).toBe(result.transparentIndex);
    expect(result.indices[0]).not.toBe(result.transparentIndex);
  });

  it('marks pixels below the alpha threshold as transparent', () => {
    const data = pixels(
      255, 255, 255, 200,
      255, 255, 255, 50,
    );
    const result = quantize(data, 2, 1, 128);
    expect(result.indices[0]).not.toBe(result.transparentIndex);
    expect(result.indices[1]).toBe(result.transparentIndex);
  });

  it('caps the palette at 255 opaque colors plus the transparent slot', () => {
    const data = new Uint8ClampedArray(300 * 4);
    for (let i = 0; i < 300; i++) {
      data[i * 4] = i & 0xff;
      data[i * 4 + 1] = (i * 3) & 0xff;
      data[i * 4 + 2] = (i * 7) & 0xff;
      data[i * 4 + 3] = 255;
    }
    const result = quantize(data, 300, 1, 128);
    const opaqueColors = result.palette.length / 3 - 1;
    expect(opaqueColors).toBeLessThanOrEqual(255);
    expect(result.transparentIndex).toBe(opaqueColors);
  });
});

describe('lzwEncode round-trip', () => {
  it('decodes back to the original indices', () => {
    const original = new Uint8Array([
      0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 0, 0, 0, 1, 2, 3,
    ]);
    const encoded = lzwEncode(original, 3);
    const decoded = lzwDecode(encoded, 3);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('handles long repetitive streams that trigger code width growth', () => {
    const original = new Uint8Array(600);
    for (let i = 0; i < original.length; i++) {
      original[i] = i % 7;
    }
    const encoded = lzwEncode(original, 3);
    const decoded = lzwDecode(encoded, 3);
    expect(Array.from(decoded)).toEqual(Array.from(original));
  });

  it('handles an empty input by emitting clear and end only', () => {
    const encoded = lzwEncode(new Uint8Array(0), 2);
    expect(encoded.length).toBeGreaterThan(0);
    const decoded = lzwDecode(encoded, 2);
    expect(decoded.length).toBe(0);
  });
});

describe('GifEncoder', () => {
  it('emits a valid GIF89a header and trailer', () => {
    const encoder = new GifEncoder(2, 2);
    const data = pixels(
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      0, 0, 0, 0,
    );
    encoder.addFrame({
      imageData: new ImageData(data, 2, 2),
      delayCs: 10,
    });
    const bytes = encoder.finalize();
    const header = String.fromCharCode(...bytes.slice(0, 6));
    expect(header).toBe('GIF89a');
    expect(bytes[bytes.length - 1]).toBe(0x3b);

    // Logical screen descriptor: width little-endian at offsets 6/7
    expect(bytes[6]).toBe(2);
    expect(bytes[7]).toBe(0);
    expect(bytes[8]).toBe(2);
    expect(bytes[9]).toBe(0);
  });

  it('includes a Netscape 2.0 loop extension', () => {
    const encoder = new GifEncoder(1, 1);
    encoder.addFrame({
      imageData: new ImageData(pixels(255, 0, 0, 255), 1, 1),
      delayCs: 10,
    });
    const bytes = encoder.finalize();
    const text = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('');
    expect(text.includes('NETSCAPE2.0')).toBe(true);
  });

  it('refuses frames whose dimensions do not match', () => {
    const encoder = new GifEncoder(2, 2);
    expect(() =>
      encoder.addFrame({
        imageData: new ImageData(pixels(0, 0, 0, 255), 1, 1),
        delayCs: 10,
      }),
    ).toThrow(/dimensions/);
  });
});

// Minimal LZW decoder used to verify the encoder round-trips correctly.
function lzwDecode(data: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeBits = minCodeSize + 1;
  let bitBuffer = 0;
  let bitCount = 0;
  let byteIndex = 0;

  const readCode = (): number => {
    while (bitCount < codeBits) {
      if (byteIndex >= data.length) return -1;
      bitBuffer |= data[byteIndex++] << bitCount;
      bitCount += 8;
    }
    const mask = (1 << codeBits) - 1;
    const code = bitBuffer & mask;
    bitBuffer >>>= codeBits;
    bitCount -= codeBits;
    return code;
  };

  let dict: number[][] = [];
  const initDict = () => {
    dict = [];
    for (let i = 0; i < clearCode; i++) dict.push([i]);
    dict.push([]); // clear
    dict.push([]); // end
  };

  initDict();
  const output: number[] = [];
  let previous: number[] | null = null;

  for (;;) {
    const code = readCode();
    if (code === -1 || code === endCode) break;
    if (code === clearCode) {
      initDict();
      codeBits = minCodeSize + 1;
      previous = null;
      continue;
    }
    let entry: number[];
    if (code < dict.length) {
      entry = dict[code];
    } else if (previous) {
      entry = [...previous, previous[0]];
    } else {
      throw new Error('Invalid LZW stream');
    }
    for (const value of entry) output.push(value);
    if (previous) {
      dict.push([...previous, entry[0]]);
      if (dict.length === 1 << codeBits && codeBits < 12) {
        codeBits++;
      }
    }
    previous = entry;
  }

  return new Uint8Array(output);
}
