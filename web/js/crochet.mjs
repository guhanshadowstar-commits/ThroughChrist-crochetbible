// Draws a pixel scene as crochet: every cell is a yarn stitch (a little "V" with a highlight),
// and the picture can be "worked" stitch by stitch with a hook, row by row from the bottom,
// the way a crocheted tapestry is really made. Once finished, a light shines across the work
// and the scene's own animation plays (drifting clouds, flapping wings, flickering flames...).
//
// A scene is { w, h, rgb:[[r,g,b]...], frame(t) -> Uint8Array(w*h of palette indices), frameColor }.

const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const tone = (rgb, k) => rgb.map((v) => clamp(k >= 0 ? v + (255 - v) * k : v * (1 + k)));
const css = (rgb) => `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
const hash = (x, y) => { let h = Math.imul(x * 374761393 + y * 668265263, 1274126177); h ^= h >>> 13; return (h >>> 0) % 4; };

/** How long the full reveal takes, in ms, for each speed setting. */
export const SPEEDS = { slow: 7000, normal: 3800, fast: 1700 };

/** One stitch drawn at the given cell size: a darker gap, two slanted yarn legs and a highlight. */
function stitchTile(rgb, s, variant) {
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const x = c.getContext('2d');
  const body = tone(rgb, [-0.04, 0, 0.04, 0.02][variant]);
  x.fillStyle = css(tone(rgb, -0.36));
  x.fillRect(0, 0, s, s);
  x.lineCap = 'round';
  const leg = (x1, y1, x2, y2, color, w) => { x.strokeStyle = css(color); x.lineWidth = w; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };
  const w = Math.max(2, s * 0.44);
  leg(s * 0.3, s * 0.18, s * 0.5, s * 0.8, body, w);
  leg(s * 0.7, s * 0.18, s * 0.5, s * 0.8, body, w);
  const hi = Math.max(1, s * 0.13);
  leg(s * 0.25, s * 0.2, s * 0.42, s * 0.62, tone(body, 0.3), hi);
  leg(s * 0.65, s * 0.2, s * 0.5, s * 0.62, tone(body, 0.2), hi);
  leg(s * 0.37, s * 0.3, s * 0.5, s * 0.72, tone(body, -0.22), hi);
  return c;
}

export class CrochetCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{cell?:number}} [o]
   */
  constructor(canvas, { cell = 10 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cell = cell;
    this.scene = null;
    this.raf = 0;
    this.tiles = new Map();
    this.token = 0; // bumps on every restart so stale animation frames stop themselves
    this.recent = []; // freshly worked stitches, for the shimmer that follows the hook
  }

  get pad() { return 1; } // border stitches around the picture

  _tile(idx, variant) {
    const key = `${idx}:${variant}`;
    let t = this.tiles.get(key);
    if (!t) { t = stitchTile(this.scene.rgb[idx], this.cell, variant); this.tiles.set(key, t); }
    return t;
  }

  setScene(scene, { cell } = {}) {
    this.stop();
    this.scene = scene;
    if (cell) this.cell = cell;
    this.tiles.clear();
    const { w, h } = scene, s = this.cell, p = this.pad;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const cw = (w + p * 2) * s, ch = (h + p * 2) * s;
    this.canvas.width = Math.round(cw * dpr); this.canvas.height = Math.round(ch * dpr);
    this.canvas.style.aspectRatio = `${w + p * 2} / ${h + p * 2}`;
    this.fabric = document.createElement('canvas');
    this.fabric.width = cw; this.fabric.height = ch;
    this.fx = this.fabric.getContext('2d');
    this.shown = new Uint8Array(w * h); // palette index currently painted per cell
    this.W = cw; this.H = ch;
    this._paintBorder();
    this._flush();
  }

  _paintBorder() {
    const { w, h } = this.scene, s = this.cell, p = this.pad;
    const idx = this.scene.frameColor;
    for (let y = 0; y < h + p * 2; y++) {
      for (let x = 0; x < w + p * 2; x++) {
        if (x >= p && x < w + p && y >= p && y < h + p) continue;
        this.fx.drawImage(this._tile(idx, hash(x, y)), x * s, y * s);
      }
    }
  }

  _paintCell(x, y, idx) {
    const s = this.cell, p = this.pad;
    this.fx.drawImage(this._tile(idx, hash(x, y)), (x + p) * s, (y + p) * s);
    this.shown[y * this.scene.w + x] = idx;
  }

  _flush(overlay) {
    const c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.imageSmoothingEnabled = true;
    c.clearRect(0, 0, this.W, this.H);
    c.drawImage(this.fabric, 0, 0);
    if (overlay) overlay(c);
  }

  stop() { this.token++; cancelAnimationFrame(this.raf); this.recent = []; }

  /** Paint the whole finished picture at once (reduced motion, thumbnails). */
  showStill() {
    this.stop();
    const f = this.scene.frame(0);
    for (let i = 0; i < f.length; i++) this._paintCell(i % this.scene.w, Math.floor(i / this.scene.w), f[i]);
    this._flush();
  }

  /** Repaint only the cells whose colour changed since the last frame. */
  _applyFrame(t) {
    const { w } = this.scene;
    const f = this.scene.frame(t);
    let changed = false;
    for (let i = 0; i < f.length; i++) {
      if (f[i] !== this.shown[i]) { this._paintCell(i % w, Math.floor(i / w), f[i]); changed = true; }
    }
    return changed;
  }

  /**
   * Work the picture stitch by stitch, bottom row first, each row in the opposite direction.
   * @param {{duration?:number, speed?:'slow'|'normal'|'fast', onDone?:Function, onProgress?:Function, idle?:boolean}} [o]
   */
  reveal({ duration, speed = 'normal', onDone, onProgress, idle = true } = {}) {
    this.stop();
    const token = this.token;
    const ms = duration ?? SPEEDS[speed] ?? SPEEDS.normal;
    const { w, h } = this.scene, total = w * h, s = this.cell, p = this.pad;
    this.shown.fill(0);
    this.fx.clearRect(p * s, p * s, w * s, h * s);
    this.fx.fillStyle = '#2a221d'; // bare, not-yet-worked fabric
    this.fx.fillRect(p * s, p * s, w * s, h * s);
    const first = this.scene.frame(0);
    const order = (n) => { // n-th stitch worked -> cell index
      const row = h - 1 - Math.floor(n / w);
      const k = n % w;
      const col = (h - 1 - row) % 2 === 0 ? k : w - 1 - k;
      return row * w + col;
    };
    let done = 0;
    const start = performance.now();
    const tick = (now) => {
      if (token !== this.token) return;
      const target = Math.min(total, Math.floor(((now - start) / ms) * total));
      for (; done < target; done++) {
        const i = order(done);
        this._paintCell(i % w, Math.floor(i / w), first[i]);
        this.recent.push({ i, at: now });
      }
      onProgress?.(done, total);
      if (done >= total) {
        this.recent = [];
        this._flush();
        onDone?.();
        this._shine(token, () => { if (idle) this._idle(token); });
        return;
      }
      const cur = order(Math.max(0, done - 1));
      const cx = ((cur % w) + p + 0.5) * s, cy = (Math.floor(cur / w) + p + 0.5) * s;
      this.recent = this.recent.filter((r) => now - r.at < 280);
      this._flush((c) => { this._drawShimmer(c, now); this._drawHook(c, cx, cy, first[cur], now); });
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** A soft glow on the stitches just worked, fading behind the hook. */
  _drawShimmer(c, now) {
    const { w } = this.scene, s = this.cell, p = this.pad;
    for (const r of this.recent) {
      const a = (1 - (now - r.at) / 280) * 0.5;
      if (a <= 0) continue;
      c.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
      c.fillRect(((r.i % w) + p) * s, (Math.floor(r.i / w) + p) * s, s, s);
    }
  }

  _drawHook(c, cx, cy, idx, now) {
    const s = this.cell;
    const sway = Math.sin(now / 260) * s * 1.1;
    const yarn = css(this.scene.rgb[idx]);
    c.lineCap = 'round';
    // yarn running in from the top-right corner to the hook, swaying a little
    for (const [col, wd] of [['rgba(0,0,0,.22)', 0.34], [yarn, 0.28]]) {
      c.strokeStyle = col; c.lineWidth = Math.max(2, s * wd);
      c.beginPath(); c.moveTo(this.W, -s);
      c.quadraticCurveTo(this.W * 0.82 + sway, cy - s * 5, cx + s * 1.4, cy - s * 1.2); c.stroke();
    }
    // the hook rocks gently as it works: aluminium shaft, wooden handle, small barb
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.sin(now / 90) * 0.07);
    c.strokeStyle = '#d7dde4'; c.lineWidth = Math.max(2, s * 0.32);
    c.beginPath(); c.moveTo(s * 0.1, s * 0.15); c.lineTo(s * 4.4, -s * 3.6); c.stroke();
    c.strokeStyle = '#b4573b'; c.lineWidth = Math.max(3, s * 0.62);
    c.beginPath(); c.moveTo(s * 2.6, -s * 2.1); c.lineTo(s * 6.4, -s * 5.3); c.stroke();
    c.strokeStyle = '#d7dde4'; c.lineWidth = Math.max(2, s * 0.3);
    c.beginPath(); c.arc(-s * 0.12, s * 0.02, s * 0.3, 0, Math.PI * 1.4); c.stroke();
    c.restore();
  }

  /** A band of light sweeps across the finished picture. */
  _shine(token, done) {
    const t0 = performance.now(), dur = 950;
    const tick = (now) => {
      if (token !== this.token) return;
      const p = Math.min(1, (now - t0) / dur);
      this._flush((c) => {
        const x = -this.W * 0.25 + p * this.W * 1.5;
        const g = c.createLinearGradient(x - this.W * 0.14, 0, x + this.W * 0.14, this.H * 0.45);
        g.addColorStop(0, 'rgba(255,255,255,0)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, this.W, this.H);
      });
      if (p < 1) this.raf = requestAnimationFrame(tick);
      else { this._flush(); done(); }
    };
    this.raf = requestAnimationFrame(tick);
  }

  _idle(token) {
    const t0 = performance.now();
    let last = 0;
    const tick = (now) => {
      if (token !== this.token) return;
      if (now - last >= 100) { // ten frames a second is plenty for stitched motion
        last = now;
        if (this._applyFrame(Math.max(0, now - t0) / 1000)) this._flush();
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** Jump to the end of the reveal and start the idle animation. */
  finish({ idle = true } = {}) {
    this.stop();
    this.showStill();
    if (idle) this._idle(this.token);
  }

  /** PNG data URL of the finished picture (for sharing). */
  snapshot() {
    const t = document.createElement('canvas');
    t.width = this.W; t.height = this.H;
    t.getContext('2d').drawImage(this.fabric, 0, 0);
    return t.toDataURL('image/png');
  }
}
