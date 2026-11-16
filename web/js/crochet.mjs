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
    // A faint ghost of the finished pattern, so you can see what is being made (like a crochet chart).
    for (let i = 0; i < first.length; i++) {
      const [r, g, b] = this.scene.rgb[first[i]];
      this.fx.fillStyle = `rgba(${r},${g},${b},0.24)`;
      this.fx.fillRect(((i % w) + p) * s, (Math.floor(i / w) + p) * s, s, s);
    }
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
        this.recent.push({ i, at: now, idx: first[i] });
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
      const progress = done / total, row = Math.floor(cur / w);
      this._flush((c) => {
        this._drawRow(c, row);
        this._drawPop(c, now);
        const ball = this._drawBall(c, first[cur], progress, now);
        this._drawHook(c, cx, cy, first[cur], now, ball);
      });
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /** The row being worked is lit, so you can follow where the hook is going. */
  _drawRow(c, row) {
    const { w } = this.scene, s = this.cell, p = this.pad;
    c.fillStyle = 'rgba(255,255,255,0.09)';
    c.fillRect(p * s, (row + p) * s, w * s, s);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(p * s, (row + p) * s, w * s, Math.max(1, s * 0.08));
  }

  /** Each new stitch pops out a little bigger and settles, with a glint, like a loop being pulled through. */
  _drawPop(c, now) {
    const { w } = this.scene, s = this.cell, p = this.pad;
    for (const r of this.recent) {
      const age = now - r.at;
      if (age > 260) continue;
      const k = age / 260;
      const size = s * (1 + 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.15)));
      const x = ((r.i % w) + p) * s + s / 2 - size / 2, y = (Math.floor(r.i / w) + p) * s + s / 2 - size / 2;
      c.drawImage(this._tile(r.idx, hash(r.i % w, Math.floor(r.i / w))), x, y, size, size);
      c.fillStyle = `rgba(255,255,255,${((1 - k) * 0.4).toFixed(3)})`;
      c.fillRect(x, y, size, size);
    }
  }

  /** The ball of yarn the thread comes from. It gets smaller as the work grows. */
  _drawBall(c, idx, progress, now) {
    const s = this.cell;
    const r = s * 3 * (1 - 0.45 * progress);
    const bx = this.W - s * 4.2, by = s * 4.2 + Math.sin(now / 420) * s * 0.12;
    const yarn = this.scene.rgb[idx];
    c.save();
    c.translate(bx, by);
    c.rotate(now / 1800);
    // soft shadow, then the ball with a round shading
    c.fillStyle = 'rgba(0,0,0,.25)';
    c.beginPath(); c.ellipse(s * 0.25, r * 0.95, r, r * 0.28, 0, 0, Math.PI * 2); c.fill();
    const grad = c.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, css(tone(yarn, 0.35)));
    grad.addColorStop(0.6, css(yarn));
    grad.addColorStop(1, css(tone(yarn, -0.4)));
    c.fillStyle = grad;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    // wound strands
    c.strokeStyle = css(tone(yarn, -0.35)); c.lineWidth = Math.max(1, s * 0.1); c.lineCap = 'round';
    for (let k = -2; k <= 2; k++) {
      c.beginPath(); c.ellipse(0, 0, r * 0.97, Math.abs(k) < 1 ? r * 0.35 : r * 0.7, k * 0.5, -0.9, 1.3); c.stroke();
    }
    c.restore();
    return { x: bx, y: by, r };
  }

  _drawHook(c, cx, cy, idx, now, ball) {
    const s = this.cell;
    const yarn = css(this.scene.rgb[idx]);
    const sway = Math.sin(now / 260) * s * 1.1;
    c.lineCap = 'round';
    // the thread runs from the ball to the hook, swaying a little
    for (const [col, wd] of [['rgba(0,0,0,.25)', 0.42], [yarn, 0.34]]) {
      c.strokeStyle = col; c.lineWidth = Math.max(2, s * wd);
      c.beginPath(); c.moveTo(ball.x - ball.r * 0.3, ball.y + ball.r * 0.8);
      c.quadraticCurveTo(this.W * 0.8 + sway, cy - s * 6, cx + s * 1.7, cy - s * 1.4); c.stroke();
    }
    // the hook: bigger and rocking as it works: aluminium shaft, wooden handle, hooked tip
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.sin(now / 90) * 0.08);
    c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = Math.max(3, s * 0.62);
    c.beginPath(); c.moveTo(s * 0.2, s * 0.35); c.lineTo(s * 6, -s * 4.9); c.stroke();
    c.strokeStyle = '#e1e6ec'; c.lineWidth = Math.max(3, s * 0.46);
    c.beginPath(); c.moveTo(s * 0.1, s * 0.15); c.lineTo(s * 6, -s * 5); c.stroke();
    c.strokeStyle = '#f7f9fb'; c.lineWidth = Math.max(1, s * 0.14);
    c.beginPath(); c.moveTo(s * 0.4, 0); c.lineTo(s * 5.6, -s * 4.7); c.stroke();
    c.strokeStyle = '#b4573b'; c.lineWidth = Math.max(4, s * 0.9);
    c.beginPath(); c.moveTo(s * 3.6, -s * 3); c.lineTo(s * 9, -s * 7.4); c.stroke();
    c.strokeStyle = '#d98a5f'; c.lineWidth = Math.max(1, s * 0.2);
    c.beginPath(); c.moveTo(s * 3.9, -s * 3.4); c.lineTo(s * 8.6, -s * 7.3); c.stroke();
    // the hooked tip, and the loop of yarn sitting on it
    c.strokeStyle = '#e1e6ec'; c.lineWidth = Math.max(2, s * 0.4);
    c.beginPath(); c.arc(-s * 0.15, s * 0.05, s * 0.4, 0, Math.PI * 1.45); c.stroke();
    c.strokeStyle = yarn; c.lineWidth = Math.max(2, s * 0.3);
    const pulse = 1 + 0.12 * Math.sin(now / 110);
    c.beginPath(); c.ellipse(s * 0.25, -s * 0.1, s * 0.95 * pulse, s * 0.6 * pulse, -0.5, 0, Math.PI * 2); c.stroke();
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
