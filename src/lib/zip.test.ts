import { describe, expect, it } from 'vitest';
import { crc32, createZip } from './zip';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

describe('zip utilities', () => {
  it('computes a known crc32', () => {
    expect(crc32(encoder.encode('hello'))).toBe(0x3610a686);
  });

  it('creates an uncompressed zip with central directory entries', () => {
    const zip = createZip([
      { path: 'a.txt', data: encoder.encode('alpha') },
      { path: 'nested/b.txt', data: encoder.encode('beta') },
    ]);
    const text = decoder.decode(zip);

    expect(zip[0]).toBe(0x50);
    expect(zip[1]).toBe(0x4b);
    expect(text).toContain('a.txt');
    expect(text).toContain('nested/b.txt');
    expect(zip[zip.length - 22]).toBe(0x50);
    expect(zip[zip.length - 21]).toBe(0x4b);
  });
});
