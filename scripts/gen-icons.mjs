// 从 ImageGen 生成的品牌主图导出扩展所需尺寸，无运行时依赖。

import { deflateSync, inflateSync } from 'node:zlib';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = join(ROOT, 'assets', 'brand', 'navigator-icon-source.png');
const OUT_DIR = join(ROOT, 'public', 'icons');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let k = 0; k < 8; k += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[n] = value >>> 0;
  }
  return table;
})();

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = CRC_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('品牌主图不是有效的 PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += length + 12;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error('品牌主图必须是非隔行的 8-bit RGBA PNG');
      }
    } else if (type === 'IDAT') compressed.push(data);
    else if (type === 'IEND') break;
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const filtered = inflateSync(Buffer.concat(compressed));
  const rgba = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = filtered[sourceOffset];
    sourceOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const raw = filtered[sourceOffset + x];
      const left = x >= bytesPerPixel ? rgba[y * stride + x - bytesPerPixel] : 0;
      const up = y ? rgba[(y - 1) * stride + x] : 0;
      const upLeft = y && x >= bytesPerPixel ? rgba[(y - 1) * stride + x - bytesPerPixel] : 0;
      let value;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paeth(left, up, upLeft);
      else throw new Error(`不支持的 PNG 过滤器：${filter}`);
      rgba[y * stride + x] = value & 0xff;
    }
    sourceOffset += stride;
  }
  return { width, height, rgba };
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const diagonalDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= diagonalDistance) return left;
  return upDistance <= diagonalDistance ? up : upLeft;
}

function resize({ width, height, rgba }, size) {
  const output = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    const sourceY = (y + 0.5) * height / size - 0.5;
    const y0 = Math.max(0, Math.floor(sourceY));
    const y1 = Math.min(height - 1, y0 + 1);
    const dy = Math.max(0, sourceY - y0);
    for (let x = 0; x < size; x += 1) {
      const sourceX = (x + 0.5) * width / size - 0.5;
      const x0 = Math.max(0, Math.floor(sourceX));
      const x1 = Math.min(width - 1, x0 + 1);
      const dx = Math.max(0, sourceX - x0);
      const samples = [
        [x0, y0, (1 - dx) * (1 - dy)],
        [x1, y0, dx * (1 - dy)],
        [x0, y1, (1 - dx) * dy],
        [x1, y1, dx * dy],
      ];
      let alpha = 0;
      let red = 0;
      let green = 0;
      let blue = 0;
      for (const [sampleX, sampleY, weight] of samples) {
        const index = (sampleY * width + sampleX) * 4;
        const weightedAlpha = rgba[index + 3] / 255 * weight;
        alpha += weightedAlpha;
        red += rgba[index] * weightedAlpha;
        green += rgba[index + 1] * weightedAlpha;
        blue += rgba[index + 2] * weightedAlpha;
      }
      const outputIndex = (y * size + x) * 4;
      if (alpha > 0) {
        output[outputIndex] = Math.round(red / alpha);
        output[outputIndex + 1] = Math.round(green / alpha);
        output[outputIndex + 2] = Math.round(blue / alpha);
      }
      output[outputIndex + 3] = Math.round(alpha * 255);
    }
  }
  return output;
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const source = decodePng(readFileSync(SOURCE));
mkdirSync(OUT_DIR, { recursive: true });
for (const size of [16, 48, 128]) {
  const output = join(OUT_DIR, `icon${size}.png`);
  writeFileSync(output, encodePng(size, size, resize(source, size)));
  console.log(`✓ ${output}`);
}
