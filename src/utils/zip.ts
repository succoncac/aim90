/**
 * Pure JavaScript ZIP archive generator (No external dependencies)
 * Implements standard PKZIP store format with CRC-32 checksums
 */

// CRC-32 Table
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0 ^ -1;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

export interface ZipFileEntry {
  name: string;
  content: string | Uint8Array;
}

export function createZipBlob(files: ZipFileEntry[]): Blob {
  const encoder = new TextEncoder();
  const fileRecords: {
    nameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc32: number;
    offset: number;
  }[] = [];

  const localChunks: Uint8Array[] = [];
  let currentOffset = 0;

  // Now: DOS date/time format
  const now = new Date();
  const dosTime =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >>> 1) & 0x1f);
  const dosDate =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);

  // 1. Process local file headers and data
  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes =
      typeof file.content === 'string'
        ? encoder.encode(file.content)
        : file.content;
    const crc = calculateCrc32(dataBytes);

    const header = new Uint8Array(30);
    const view = new DataView(header.buffer);

    // Signature 0x04034b50 (PK\x03\x04)
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true); // Version needed: 2.0
    view.setUint16(6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(8, 0, true); // Compression: Stored (0)
    view.setUint16(10, dosTime, true);
    view.setUint16(12, dosDate, true);
    view.setUint32(14, crc, true);
    view.setUint32(18, dataBytes.length, true); // Compressed size
    view.setUint32(22, dataBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // File name length
    view.setUint16(28, 0, true); // Extra field length

    localChunks.push(header, nameBytes, dataBytes);

    fileRecords.push({
      nameBytes,
      dataBytes,
      crc32: crc,
      offset: currentOffset,
    });

    currentOffset += header.length + nameBytes.length + dataBytes.length;
  }

  // 2. Central Directory
  const centralDirStartOffset = currentOffset;
  const centralChunks: Uint8Array[] = [];
  let centralDirSize = 0;

  for (const rec of fileRecords) {
    const cdir = new Uint8Array(46);
    const view = new DataView(cdir.buffer);

    // Signature 0x02014b50 (PK\x01\x02)
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true); // Made by 2.0
    view.setUint16(6, 20, true); // Needed 2.0
    view.setUint16(8, 0x0800, true); // UTF-8
    view.setUint16(10, 0, true); // Stored
    view.setUint16(12, dosTime, true);
    view.setUint16(14, dosDate, true);
    view.setUint32(16, rec.crc32, true);
    view.setUint32(20, rec.dataBytes.length, true);
    view.setUint32(24, rec.dataBytes.length, true);
    view.setUint16(28, rec.nameBytes.length, true);
    view.setUint16(30, 0, true); // Extra length
    view.setUint16(32, 0, true); // Comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal attributes
    view.setUint32(38, 0, true); // External attributes
    view.setUint32(42, rec.offset, true); // Relative offset of local header

    centralChunks.push(cdir, rec.nameBytes);
    centralDirSize += cdir.length + rec.nameBytes.length;
  }

  // 3. End of Central Directory Record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  // Signature 0x06054b50 (PK\x05\x06)
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true); // Disk number
  eocdView.setUint16(6, 0, true); // Disk number start
  eocdView.setUint16(8, fileRecords.length, true); // Records on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total records
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // Comment length

  const allChunks: BlobPart[] = [...localChunks, ...centralChunks, eocd];
  return new Blob(allChunks, { type: 'application/zip' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}
