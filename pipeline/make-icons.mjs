// Draws the app icon (a stitched cross on a green hill under a blue sky) as PNG files.
//   node pipeline/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Grid } from '../core/art/draw.mjs';
import { getSprite } from '../core/art/sprites.mjs';
import { RGB, C } from '../core/art/palette.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = 32; // stitches across

function scene() {
  const g = new Grid(N, N);
  const bands = ['b', 'b', 's', 's', 'S'];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) g.set(x, y, bands[Math.min(4, Math.floor(y / 5.5))]);
  g.circle(24, 8, 3.2, 'y'); g.circle(24, 8.6, 2.4, 'u');
  // soft hill
  for (let x = 0; x < N; x++) {
    const top = Math.round(22 - 2.5 * Math.sin((x / N) * Math.PI * 1.3 + 0.5));
    for (let y = top; y < N; y++) g.set(x, y, y === top ? 'l' : y > N - 4 ? 'N' : 'n');
  }
  const cross = getSprite('cross');
  g.blit(cross, Math.floor((N - cross.w) / 2), 22 - cross.h + 4);
  g.rect(2, 3, 5, 2, 'w'); g.rect(4, 2, 5, 2, 'w'); // a small cloud
  return g;
}

const crc = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return (buf) => { let c = 0xffffffff; for (const b of buf) c = t[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
})();
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

const segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const tone = (c, k) => c.map((v) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k)))));

function render(size, { border = true, inset = 0 } = {}) {
  const g = scene();
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * N, fy = (y / size) * N;
      const cx = Math.min(N - 1, Math.floor(fx)), cy = Math.min(N - 1, Math.floor(fy));
      const u = fx - cx, v = fy - cy;
      let idx = g.px[cy * N + cx];
      if (border && (cx === 0 || cy === 0 || cx === N - 1 || cy === N - 1)) idx = C.c;
      const base = RGB[idx];
      const dl = segDist(u, v, 0.3, 0.18, 0.5, 0.8), dr = segDist(u, v, 0.7, 0.18, 0.5, 0.8);
      const d = Math.min(dl, dr);
      let col;
      if (d > 0.23) col = tone(base, -0.36);
      else if (segDist(u, v, 0.25, 0.2, 0.42, 0.62) < 0.07) col = tone(base, 0.3);
      else col = base;
      rgba.set([col[0], col[1], col[2], 255], (y * size + x) * 4);
    }
  }
  return png(size, rgba);
}

const out = path.join(ROOT, 'web', 'icons');
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, 'icon-192.png'), render(192));
writeFileSync(path.join(out, 'icon-512.png'), render(512));
writeFileSync(path.join(out, 'icon-maskable-512.png'), render(512, { border: false }));
writeFileSync(path.join(out, 'apple-touch-icon.png'), render(180, { border: false }));
console.log('icons written to', out);
