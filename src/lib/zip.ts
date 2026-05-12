export interface ZipEntryInput {
  path: string;
  data: Uint8Array;
  modifiedAt?: Date;
}

interface CentralDirectoryEntry {
  pathBytes: Uint8Array;
  crc: number;
  size: number;
  offset: number;
  time: number;
  date: number;
}

const encoder = new TextEncoder();
const CRC_TABLE = buildCrcTable();

export function createZip(entries: ZipEntryInput[]): Uint8Array {
  const bytes: number[] = [];
  const central: CentralDirectoryEntry[] = [];

  for (const entry of entries) {
    const normalizedPath = normalizePath(entry.path);
    if (!normalizedPath) continue;
    const pathBytes = encoder.encode(normalizedPath);
    const offset = bytes.length;
    const crc = crc32(entry.data);
    const { time, date } = toDosDateTime(entry.modifiedAt ?? new Date());

    writeLocalFileHeader(bytes, pathBytes, crc, entry.data.length, time, date);
    pushBytes(bytes, entry.data);

    central.push({
      pathBytes,
      crc,
      size: entry.data.length,
      offset,
      time,
      date,
    });
  }

  const centralOffset = bytes.length;
  for (const entry of central) {
    writeCentralDirectoryHeader(bytes, entry);
  }
  const centralSize = bytes.length - centralOffset;
  writeEndOfCentralDirectory(bytes, central.length, centralSize, centralOffset);

  return new Uint8Array(bytes);
}

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeLocalFileHeader(
  bytes: number[],
  pathBytes: Uint8Array,
  crc: number,
  size: number,
  time: number,
  date: number,
): void {
  writeU32(bytes, 0x04034b50);
  writeU16(bytes, 20);
  writeU16(bytes, 0);
  writeU16(bytes, 0);
  writeU16(bytes, time);
  writeU16(bytes, date);
  writeU32(bytes, crc);
  writeU32(bytes, size);
  writeU32(bytes, size);
  writeU16(bytes, pathBytes.length);
  writeU16(bytes, 0);
  pushBytes(bytes, pathBytes);
}

function writeCentralDirectoryHeader(
  bytes: number[],
  entry: CentralDirectoryEntry,
): void {
  writeU32(bytes, 0x02014b50);
  writeU16(bytes, 20);
  writeU16(bytes, 20);
  writeU16(bytes, 0);
  writeU16(bytes, 0);
  writeU16(bytes, entry.time);
  writeU16(bytes, entry.date);
  writeU32(bytes, entry.crc);
  writeU32(bytes, entry.size);
  writeU32(bytes, entry.size);
  writeU16(bytes, entry.pathBytes.length);
  writeU16(bytes, 0);
  writeU16(bytes, 0);
  writeU16(bytes, 0);
  writeU16(bytes, 0);
  writeU32(bytes, 0);
  writeU32(bytes, entry.offset);
  pushBytes(bytes, entry.pathBytes);
}

function writeEndOfCentralDirectory(
  bytes: number[],
  count: number,
  centralSize: number,
  centralOffset: number,
): void {
  writeU32(bytes, 0x06054b50);
  writeU16(bytes, 0);
  writeU16(bytes, 0);
  writeU16(bytes, count);
  writeU16(bytes, count);
  writeU32(bytes, centralSize);
  writeU32(bytes, centralOffset);
  writeU16(bytes, 0);
}

function writeU16(bytes: number[], value: number): void {
  bytes.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(bytes: number[], value: number): void {
  bytes.push(
    value & 0xff,
    (value >>> 8) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 24) & 0xff,
  );
}

function pushBytes(target: number[], source: Uint8Array): void {
  for (const byte of source) target.push(byte);
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

function toDosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}
