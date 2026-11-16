// Tiny pixel drawing kit. A Grid is a w*h array of palette indices (0 = transparent).
// Sprites and scenes are built from these primitives, so shapes stay crisp at any size and the
// whole library shares one look: dark outline yarn plus a darker lower edge on every shape.
import { C, SHADE } from './palette.mjs';

export class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.px = new Uint8Array(w * h);
    this.dx = 0; this.dy = 0; // drawing offset (lets sprites keep a 1px margin for the outline)
  }
  clone() { const g = new Grid(this.w, this.h); g.px.set(this.px); return g; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.px[y * this.w + x]; }
  /** Set one pixel (colour letter or palette index). Out-of-range writes are ignored. */
  set(x, y, c) {
    x = Math.round(x + this.dx); y = Math.round(y + this.dy);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.px[y * this.w + x] = typeof c === 'string' ? C[c] ?? 0 : c;
    return this;
  }
  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
    return this;
  }
  /** Filled ellipse centred at (cx, cy); pixel centres decide membership. */
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) this.set(x, y, c);
      }
    }
    return this;
  }
  circle(cx, cy, r, c) { return this.ellipse(cx, cy, r, r, c); }
  line(x0, y0, x1, y1, c, thick = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n, y = y0 + ((y1 - y0) * i) / n;
      for (let j = 0; j < thick; j++) for (let k = 0; k < thick; k++) this.set(Math.round(x) + j, Math.round(y) + k, c);
    }
    return this;
  }
  /** Filled polygon (even-odd) through the given [x,y] points. */
  poly(pts, c) {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
        const py = y + 0.5;
        if ((y1 <= py && y2 > py) || (y2 <= py && y1 > py)) xs.push(x1 + ((py - y1) / (y2 - y1)) * (x2 - x1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.ceil(xs[i] - 0.5); x < xs[i + 1] - 0.5 + 0.5; x++) this.set(x, y, c);
    }
    return this;
  }
  /** Stamp small hand-drawn detail: rows of colour letters, '.' leaves the pixel alone. */
  stamp(x, y, rows) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') this.set(x + i, y + j, ch); }));
    return this;
  }
  /** Copy `src` on top (transparent pixels are skipped). */
  blit(src, ox = 0, oy = 0, { flip = false } = {}) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const v = src.px[y * src.w + x];
        if (!v) continue;
        const tx = ox + (flip ? src.w - 1 - x : x), ty = oy + y;
        if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.px[ty * this.w + tx] = v;
      }
    }
    return this;
  }
  /** Dark yarn around the shape. */
  outline(c = 'k') {
    const col = typeof c === 'string' ? C[c] : c;
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.px[y * this.w + x]) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1)) add.push(y * this.w + x);
      }
    }
    for (const i of add) this.px[i] = col;
    return this;
  }
  /** Darker yarn on pixels whose lower neighbour is empty or outline: a rounded, padded look. */
  shade(outlineColor = C.k) {
    const out = this.px.slice();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const v = this.px[y * this.w + x];
        if (!v || v === outlineColor || !SHADE[v]) continue;
        const below = this.get(x, y + 1);
        if (!below || below === outlineColor) out[y * this.w + x] = SHADE[v];
      }
    }
    this.px = out;
    return this;
  }
  flipped() {
    const g = new Grid(this.w, this.h);
    g.blit(this, 0, 0, { flip: true });
    return g;
  }
  /** Replace one colour with another (used to re-dress a figure, e.g. a different robe). */
  recolor(map) {
    for (let i = 0; i < this.px.length; i++) {
      for (const [from, to] of Object.entries(map)) if (this.px[i] === C[from]) { this.px[i] = C[to]; break; }
    }
    return this;
  }
}

/** Build a sprite: a w*h canvas with a 1px margin, drawn at (0,0), then outlined and shaded. */
export function sprite(w, h, draw, { outline = true, shade = true } = {}) {
  const g = new Grid(w + 2, h + 2);
  g.dx = 1; g.dy = 1;
  draw(g);
  g.dx = 0; g.dy = 0;
  if (shade) g.shade();
  if (outline) g.outline('k');
  return g;
}

/** Small deterministic random generator (mulberry32) so every verse always gets the same picture. */
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)); // inclusive
  next.pick = (arr) => arr[Math.floor(next() * arr.length)];
  next.chance = (p) => next() < p;
  return next;
}
