// Draws a verse's picture from its spec. Every verse gets its own seed (from its reference), so
// even two verses about a lamb in a meadow differ in clouds, hills, trees, flowers and placement.
//
// The scene is a stack of layers. A layer is one or more frames of a Grid plus a little motion
// (drift, bob, frame flicker). frame(t) flattens the stack for time t; the renderer turns
// each cell into a stitch.
import { Grid, rng } from './draw.mjs';
import { C, grade } from './palette.mjs';
import { getFrames, getSprite, BIRD, FPS } from './sprites.mjs';
import { hashRef } from './spec.mjs';

export const W = 48;
export const H = 32;
const HORIZON = 18;      // where sky ends for most settings
const GROUND_BASE = 29;  // feet of figures standing on the ground

const SKIES = {
  day: ['b', 's', 's', 'S'],
  dawn: ['v', 'p', 'h', 'u'],
  dusk: ['V', 'P', 'h', 'o'],
  night: ['x', 'X', 'X', 'B'],
};
const STORM_SKY = ['A', 'd', 'd', 'a'];
const WRATH_SKY = ['R', 'r', 'o', 'y'];
const HEAVEN_SKY = ['s', 'S', 'u', 'w'];

const AIR = new Set(['dove', 'eagle', 'angel']);
const FLOAT = new Set(['heart', 'crown', 'eye', 'hands', 'hand', 'gem', 'spark', 'key', 'scales', 'trumpet']);
const WATER = new Set(['boat', 'ark', 'fish']);
const FLIPPABLE = new Set(['lamb', 'sheep', 'lion', 'camel', 'donkey', 'horse', 'eagle', 'dove', 'fish', 'boat', 'serpent', 'man', 'woman', 'child', 'king', 'priest', 'prophet', 'warrior', 'shepherd']);

const full = () => new Grid(W, H);

function sky(colors, horizon) {
  const g = full();
  const bandH = Math.max(2, Math.ceil(horizon / colors.length));
  for (let y = 0; y < H; y++) {
    const b = Math.min(colors.length - 1, Math.floor(y / bandH));
    const edge = y % bandH === bandH - 1 && b < colors.length - 1; // dithered seam between bands
    for (let x = 0; x < W; x++) g.set(x, y, edge && (x + y) % 2 ? colors[b + 1] : colors[b]);
  }
  return g;
}

function cloud(g, cx, cy, size, main, under) {
  const rx = size / 2;
  g.ellipse(cx, cy, rx, 1.7, main);
  g.circle(cx - rx * 0.35, cy - 1.2, 2 + size / 9, main);
  g.circle(cx + rx * 0.25, cy - 1.7, 2.4 + size / 8, main);
  g.rect(Math.round(cx - rx), Math.round(cy + 1), Math.round(size), 1, under);
}

/** Rolling hills / dunes: a heightmap made of two sine waves, filled down to the bottom. */
function hills(r, baseY, amp, main, top = null) {
  const g = full();
  const p1 = r() * 6.28, p2 = r() * 6.28, f1 = 0.1 + r() * 0.08, f2 = 0.25 + r() * 0.1;
  for (let x = 0; x < W; x++) {
    const y = Math.round(baseY - amp * (0.5 + 0.5 * Math.sin(x * f1 + p1)) - amp * 0.35 * Math.sin(x * f2 + p2));
    for (let j = y; j < H; j++) g.set(x, j, j === y && top ? top : main);
  }
  return g;
}

function mountains(r, baseY, main, dark, snow) {
  const g = full();
  const peaks = [];
  const n = r.int(2, 4);
  for (let i = 0; i < n; i++) peaks.push({ x: Math.round(((i + 0.5) / n) * W + r.int(-4, 4)), h: r.int(8, 13), s: 0.8 + r() * 0.5 });
  for (let x = 0; x < W; x++) {
    let top = baseY, owner = null;
    for (const p of peaks) {
      const y = baseY - (p.h - Math.abs(x - p.x) * p.s);
      if (y < top) { top = y; owner = p; }
    }
    top = Math.round(top);
    for (let y = top; y < H; y++) {
      const high = owner && y < baseY - owner.h * 0.62;
      g.set(x, y, high && snow ? snow : owner && x > owner.x ? dark : main);
    }
  }
  return g;
}

/** Fill rows [y0, H) with a colour, with a dithered first row and some darker bottom rows. */
function ground(y0, top, main, deep = null, r = null) {
  const g = full();
  for (let y = y0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let c = main;
      if (y === y0) c = (x + y) % 2 ? top : main;
      else if (y === y0 + 1 && top !== main && (x + y) % 3 === 0) c = top;
      else if (deep && y >= H - 3 && (x + y) % 2 === 0) c = deep;
      g.set(x, y, c);
    }
  }
  if (r && top !== main) for (let i = 0; i < 14; i++) g.set(r.int(0, W - 1), r.int(y0 + 2, H - 1), top); // specks
  return g;
}

function dots(r, g, y0, y1, colors, n) {
  for (let i = 0; i < n; i++) g.set(r.int(0, W - 1), r.int(y0, y1), r.pick(colors));
}

function stars(r, n) {
  const frames = [full(), full(), full()];
  for (let i = 0; i < n; i++) {
    const x = r.int(1, W - 2), y = r.int(1, 12), phase = r.int(0, 2), big = r.chance(0.25);
    frames.forEach((g, f) => {
      if ((f + phase) % 3 === 2) return; // this star is dim in this frame
      g.set(x, y, 'w');
      if (big && (f + phase) % 3 === 0) { g.set(x - 1, y, 'u'); g.set(x + 1, y, 'u'); g.set(x, y - 1, 'u'); g.set(x, y + 1, 'u'); }
    });
  }
  return frames;
}

function sunGrid(cx, cy, r0, pulse) {
  const g = full();
  g.circle(cx, cy, r0, 'y');
  g.ellipse(cx, cy + 1, r0 - 0.6, r0 - 1.2, 'u');
  if (pulse) {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      g.set(cx + Math.cos(ang) * (r0 + 2.2), cy + Math.sin(ang) * (r0 + 2.2), 'y');
      g.set(cx + Math.cos(ang) * (r0 + 3.4), cy + Math.sin(ang) * (r0 + 3.4), 'u');
    }
  }
  return g;
}

function moonGrid(cx, cy, skyColor) {
  const g = full();
  g.circle(cx, cy, 3.2, 'w');
  g.circle(cx + 1.8, cy - 0.8, 2.8, skyColor);
  g.set(cx - 2, cy + 1, 'c');
  return g;
}

function rain(r, density, color) {
  const frames = [];
  const cols = [];
  for (let i = 0; i < density; i++) cols.push([r.int(0, W - 1), r.int(0, H - 1)]);
  for (let f = 0; f < 4; f++) {
    const g = full();
    for (const [x, y] of cols) {
      const yy = (y + f * 3) % H;
      g.set(x - Math.floor(f / 2), yy, color); g.set(x - Math.floor(f / 2) - 1, (yy + 1) % H, color);
    }
    frames.push(g);
  }
  return frames;
}

function lightning(r) {
  const none = full();
  const bolt = full();
  let x = r.int(14, 34);
  for (let y = 1; y < 15; y += 2) {
    bolt.line(x, y, x + (y % 4 === 1 ? 2 : -2), y + 2, 'w'); x += y % 4 === 1 ? 2 : -2;
    bolt.set(x, y + 1, 'y');
  }
  return [none, none, none, none, none, none, bolt, none, none, none];
}

function sparkles(r, n, y0, y1) {
  const frames = [full(), full(), full()];
  for (let i = 0; i < n; i++) {
    const x = r.int(2, W - 3), y = r.int(y0, y1), phase = r.int(0, 2);
    frames.forEach((g, f) => {
      if ((f + phase) % 3 === 0) { g.set(x, y, 'y'); g.set(x - 1, y, 'u'); g.set(x + 1, y, 'u'); g.set(x, y - 1, 'u'); g.set(x, y + 1, 'u'); }
      else if ((f + phase) % 3 === 1) g.set(x, y, 'w');
    });
  }
  return frames;
}

function embers(r, n) {
  const cols = [];
  for (let i = 0; i < n; i++) cols.push([r.int(0, W - 1), r.int(4, H - 1)]);
  return [0, 1, 2, 3].map((f) => {
    const g = full();
    for (const [x, y] of cols) g.set(x + (f % 2), (y - f * 2 + H) % H, f % 2 ? 'o' : 'y');
    return g;
  });
}

function waves(r, y0, y1, base, light, deep) {
  const frames = [];
  for (let f = 0; f < 3; f++) {
    const g = full();
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W; x++) {
        const depth = (y - y0) / (y1 - y0);
        g.set(x, y, depth > 0.66 ? deep : base);
      }
    }
    for (let y = y0 + 1; y < y1; y += 2) {
      for (let x = (y * 3 + f * 2) % 9; x < W; x += 9) { g.set(x, y, light); g.set(x + 1, y, light); }
    }
    for (let x = 0; x < W; x++) g.set(x, y0, (x + f) % 4 < 2 ? light : base); // sparkling horizon edge
    frames.push(g);
  }
  return frames;
}

function placeSprite(layers, name, x, baseY, { flip = false, bob = 0, period = 1.8, dx = 0, wrap = false } = {}) {
  const frames = getFrames(name).map((s) => (flip ? s.flipped() : s));
  const s = frames[0];
  const g = frames.map((f) => { const a = full(); a.blit(f, 0, 0); return a; });
  layers.push({
    frames: g, fps: frames.length > 1 ? (FPS[name] ?? 3) : 0,
    ox: Math.round(x - s.w / 2), oy: Math.round(baseY - s.h + 1), dx, wrap, bob, bobPeriod: period,
  });
}

function placeOn(layers, name, x, baseY, r, extra = {}) {
  let by = baseY, bob = 0, period = 1.8;
  if (AIR.has(name)) { by = r.int(11, 16); bob = 1; period = 2.4; }
  else if (FLOAT.has(name)) { by = r.int(15, 19); bob = 1; period = 2.0; }
  else if (WATER.has(name)) { bob = 1; period = 2.6; }
  const flip = FLIPPABLE.has(name) && r.chance(0.5);
  placeSprite(layers, name, x, by, { flip, bob, period, ...extra });
}

const TREES = ['tree', 'tree', 'palm', 'cedar'];

/** @param variant 0 = the picture chosen for the verse; other numbers give different layouts of the same scene */
export function composeScene(spec, ref = 0, variant = 0) {
  const r = rng(hashRef(ref, 1 + variant * 7919));
  const layers = [];
  const add = (grid, o = {}) => layers.push({
    frames: Array.isArray(grid) ? grid : [grid], fps: o.fps ?? 0, ox: o.ox ?? 0, oy: o.oy ?? 0,
    dx: o.dx ?? 0, wrap: !!o.wrap, bob: o.bob ?? 0, bobPeriod: o.bobPeriod ?? 1.6,
  });

  const { setting, time, mood } = spec;
  const stormy = mood === 'storm' || mood === 'sorrow' && r.chance(0.5);
  const night = time === 'night';
  let skyColors = SKIES[time] ?? SKIES.day;
  if (setting === 'heaven') skyColors = HEAVEN_SKY;
  if (mood === 'storm') skyColors = STORM_SKY;
  if (mood === 'wrath') skyColors = WRATH_SKY;
  const horizon = setting === 'sea' ? 17 : setting === 'mountain' ? 20 : HORIZON;
  const inCave = setting === 'cave';

  // ---- sky, sun/moon, stars, clouds ----
  if (inCave) {
    const g = full();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g.set(x, y, (x + y) % 2 && y > 16 ? 'X' : 'x');
    add(g);
    const beam = full();
    for (let y = 0; y < 22; y++) for (let x = 0; x < W; x++) if (Math.abs(x - 24) < 3 + y * 0.35 && (x + y) % 2 === 0) beam.set(x, y, 'u');
    add([beam, full()], { fps: 1 });
  } else {
    add(sky(skyColors, horizon));
    if (night) {
      add(stars(r, 22), { fps: 2 });
      // a shooting star every few seconds
      const shoot = Array.from({ length: 16 }, () => full());
      const sx0 = r.int(6, 30), sy0 = r.int(1, 5);
      for (let i = 0; i < 7; i++) {
        shoot[i].set(sx0 + i * 2, sy0 + i, 'w'); shoot[i].set(sx0 + i * 2 - 1, sy0 + i - 1, 'u'); shoot[i].set(sx0 + i * 2 - 2, sy0 + i - 1, 'y');
      }
      add(shoot, { fps: 4 });
    }
    const sx = r.int(8, 40), sy = time === 'dawn' || time === 'dusk' ? horizon - 2 : r.int(4, 8);
    if (night) add(moonGrid(r.int(8, 40), r.int(4, 8), 'x'));
    else if (!stormy && mood !== 'storm' && setting !== 'heaven') {
      add([sunGrid(sx, sy, 3, false), sunGrid(sx, sy, 3, true)], { fps: 1.2 });
    }
    const clouds = full();
    const nClouds = mood === 'storm' ? r.int(4, 6) : setting === 'heaven' ? r.int(4, 6) : r.int(2, 4);
    const main = mood === 'storm' || stormy ? 'a' : 'w';
    const under = mood === 'storm' || stormy ? 'd' : 'S';
    for (let i = 0; i < nClouds; i++) cloud(clouds, r.int(2, W - 3), r.int(3, 11), r.int(9, 17), main, under);
    add(clouds, { dx: 0.5 + r() * 0.8, wrap: true });
  }

  // ---- terrain ----
  let groundTop = 24;
  switch (setting) {
    case 'meadow':
    case 'house':
    case 'river': {
      add(hills(r, 20, 3, 't', 'l'));
      add(hills(r, 23, 3, 'n', 'l'));
      const gr = ground(25, 'l', 'n', 'N', r);
      dots(r, gr, 26, 31, ['l', 'N'], 20);
      dots(r, gr, 26, 31, ['p', 'y', 'w', 'r'], r.int(5, 12)); // wildflowers
      add(gr);
      if (setting === 'river') add(waves(r, 25, 29, 'b', 'S', 'q'), { fps: 2 });
      groundTop = 25;
      break;
    }
    case 'sea': {
      add(waves(r, 17, 27, 'b', 'S', 'q'), { fps: 2 });
      const sand = full();
      for (let y = 27; y < H; y++) for (let x = 0; x < W; x++) sand.set(x, y, y === 27 ? ((x + y) % 2 ? 'S' : 'e') : y > 29 && (x + y) % 2 ? 'E' : 'e');
      add(sand);
      groundTop = 27;
      break;
    }
    case 'mountain': {
      add(mountains(r, 24, 'v', 'V', 'w'));
      add(mountains(r, 27, 'a', 'A', 'w'));
      const gr = ground(27, 'n', 'A', 'M', r);
      dots(r, gr, 27, 31, ['a', 'n', 'N'], 18);
      add(gr);
      groundTop = 27;
      break;
    }
    case 'desert': {
      add(hills(r, 21, 2, 'E', 'e'));
      add(hills(r, 24, 2.5, 'e', 'u'));
      const gr = ground(26, 'u', 'e', 'E', r);
      dots(r, gr, 27, 31, ['E', 'u'], 16);
      add(gr);
      groundTop = 26;
      break;
    }
    case 'city': {
      add(hills(r, 21, 1.5, 'd'));
      const skyline = full();
      let x = r.int(0, 3);
      while (x < W - 6) {
        const pick = r.pick(['tower', 'house', 'wall', 'tower', 'house']);
        const s = getSprite(pick);
        skyline.blit(s, x, 23 - s.h + 1);
        x += s.w + r.int(0, 2);
      }
      add(skyline);
      const gr = ground(24, 'E', 'e', 'E', r);
      for (let i = 0; i < 6; i++) gr.rect(r.int(0, W - 4), r.int(26, 31), 3, 1, 'E'); // paving
      add(gr);
      groundTop = 24;
      break;
    }
    case 'temple': {
      add(hills(r, 20, 2, 't', 'n'));
      const back = full();
      back.blit(getSprite('temple'), 11, 24 - getSprite('temple').h + 1);
      add(back);
      for (const px of [5, 43]) placeSprite(layers, r.pick(['palm', 'cedar']), px, 25, {});
      const gr = ground(24, 'w', 'c', 'e', r);
      for (let y = 25; y < H; y += 2) for (let x = (y % 4) / 2; x < W; x += 4) gr.set(x, y, 'e');
      add(gr);
      groundTop = 24;
      break;
    }
    case 'garden': {
      add(hills(r, 20, 3, 'T', 'n'));
      const gr = ground(24, 'l', 'n', 'N', r);
      dots(r, gr, 25, 31, ['l', 'N'], 20);
      dots(r, gr, 25, 31, ['p', 'y', 'r', 'w', 'v'], r.int(10, 18));
      add(gr);
      const t1 = r.int(4, 10), t2 = r.int(38, 44);
      placeSprite(layers, r.pick(TREES), t1, 25, {});
      placeSprite(layers, r.pick(TREES), t2, 25, {});
      groundTop = 24;
      break;
    }
    case 'heaven': {
      const rays = [full(), full()];
      for (let a = -4; a <= 4; a++) {
        rays.forEach((g, f) => {
          for (let y = 0; y < 22; y++) {
            const x = 24 + Math.round(a * (2 + y * 0.28)) + (f ? 1 : 0);
            if ((y + a) % 2 === 0) g.set(x, y, 'u');
          }
        });
      }
      add(rays, { fps: 1.2 });
      const floor = full();
      for (let y = 25; y < H; y++) for (let x = 0; x < W; x++) floor.set(x, y, y === 25 ? ((x + y) % 2 ? 'S' : 'w') : (x + y) % 5 === 0 ? 'S' : 'w');
      for (let i = 0; i < 6; i++) floor.circle(r.int(0, W), 26, r.int(2, 4), 'w');
      add(floor);
      groundTop = 25;
      break;
    }
    case 'cave': {
      const walls = full();
      for (let x = 0; x < W; x++) {
        const c = 3 + Math.round(2 * Math.sin(x * 0.7) + (x * 7 % 5) * 0.4);
        for (let y = 0; y < c; y++) walls.set(x, y, y > c - 2 ? 'a' : 'A');
      }
      for (let y = 0; y < 26; y++) {
        const l = 3 + Math.round(Math.sin(y * 0.6) * 1.5), rr = 3 + Math.round(Math.cos(y * 0.5) * 1.5);
        for (let x = 0; x < l; x++) walls.set(x, y, x === l - 1 ? 'a' : 'A');
        for (let x = 0; x < rr; x++) walls.set(W - 1 - x, y, x === rr - 1 ? 'a' : 'A');
      }
      for (let y = 27; y < H; y++) for (let x = 0; x < W; x++) walls.set(x, y, y === 27 ? 'a' : (x + y) % 3 ? 'A' : 'M');
      add(walls);
      groundTop = 27;
      break;
    }
    case 'field': {
      add(hills(r, 21, 2, 't', 'n'));
      const gr = full();
      for (let y = 23; y < H; y++) for (let x = 0; x < W; x++) gr.set(x, y, y % 3 === 0 ? 'g' : (x + y) % 4 === 0 ? 'y' : 'e');
      for (let y = 24; y < H; y += 3) for (let x = r.int(0, 3); x < W; x += 4) gr.set(x, y, 'y');
      add(gr);
      for (const px of [r.int(4, 9), r.int(38, 44)]) placeSprite(layers, 'wheat', px, 27, {});
      groundTop = 23;
      break;
    }
    default:
      add(ground(24, 'l', 'n', 'N', r));
  }
  if (setting === 'house') placeSprite(layers, 'house', r.pick([8, 40]), 26, { flip: false });
  if (setting === 'desert' && r.chance(0.6)) placeSprite(layers, r.pick(['palm', 'tent']), r.pick([6, 42]), 26, {});
  if (setting === 'mountain' && r.chance(0.5)) placeSprite(layers, 'cedar', r.pick([5, 43]), 28, {});
  if (setting === 'river' || setting === 'meadow') {
    if (r.chance(0.7)) placeSprite(layers, r.pick(TREES), r.pick([5, 6, 42, 43]), 26, {});
  }

  // ---- figures ----
  const base = Math.max(groundTop + 4, GROUND_BASE - 1);
  const heroName = spec.hero;
  const props = spec.props ?? [];
  const heroX = 24 + r.int(-3, 3);
  const sideSlots = r.chance(0.5) ? [11, 37] : [37, 11];
  props.forEach((p, i) => {
    const x = sideSlots[i] + r.int(-2, 2);
    const by = AIR.has(p) || FLOAT.has(p) || WATER.has(p) ? base : base - r.int(0, 2);
    placeOn(layers, p, x, WATER.has(p) && setting !== 'sea' ? base : by, r);
  });
  let heroBase = base;
  if (WATER.has(heroName) && setting === 'sea') heroBase = heroName === 'fish' ? 24 : 26;
  placeOn(layers, heroName, heroX, heroBase, r);

  // ---- ambient life and mood ----
  if (!night && !inCave && !stormy && mood !== 'storm' && r.chance(0.6)) {
    const flock = [full(), full()]; // two wing positions, so the birds flap as they drift past
    const spots = [[r.int(0, 20), r.int(4, 10)]];
    if (r.chance(0.5)) spots.push([r.int(24, 44), r.int(6, 12)]);
    flock.forEach((g, f) => { const b = BIRD('M', f); spots.forEach(([x, y]) => g.blit(b, x, y)); });
    add(flock, { dx: 1.5 + r() * 1.5, wrap: true, fps: 3 });
  }
  if (night && (setting === 'meadow' || setting === 'garden' || setting === 'field')) {
    const f = [full(), full()];
    for (let i = 0; i < 7; i++) { const x = r.int(2, W - 3), y = r.int(24, 30); f[i % 2].set(x, y, 'y'); f[(i + 1) % 2].set(x + 1, y - 1, 'u'); }
    add(f, { fps: 1.6 });
  }
  if (mood === 'storm') { add(rain(r, 34, 'S'), { fps: 8 }); add(lightning(r), { fps: 5 }); }
  if (mood === 'sorrow' && !inCave) add(rain(r, 14, 's'), { fps: 6 });
  if (mood === 'wrath') add(embers(r, 14), { fps: 5 });
  if (mood === 'holy' || mood === 'joy') add(sparkles(r, mood === 'joy' ? 9 : 6, 2, 22), { fps: 2 });
  if (mood === 'peace' && !AIR.has(heroName) && r.chance(0.5)) placeSprite(layers, 'dove', r.int(8, 40), r.int(8, 12), { bob: 1, period: 3 });

  // ---- finishing ----
  const border = night ? 'B' : mood === 'storm' || mood === 'sorrow' ? 'A' : mood === 'wrath' ? 'R'
    : mood === 'holy' ? 'g' : r.pick(['c', 'e', 'p', 's', 'l', 'y']);

  const rgb = grade(time, mood);
  const frame = (t = 0) => {
    const out = new Uint8Array(W * H);
    t = Math.max(0, t);
    for (const L of layers) {
      const g = L.frames[L.fps ? Math.floor(t * L.fps) % L.frames.length : 0];
      const ox = L.ox + (L.dx ? Math.floor(t * L.dx) : 0);
      const oy = L.oy + (L.bob ? Math.round(Math.sin((t / L.bobPeriod) * Math.PI * 2) * L.bob) : 0);
      for (let y = 0; y < g.h; y++) {
        const ty = y + oy;
        if (ty < 0 || ty >= H) continue;
        for (let x = 0; x < g.w; x++) {
          const v = g.px[y * g.w + x];
          if (!v) continue;
          let tx = x + ox;
          if (L.wrap) tx = ((tx % W) + W) % W;
          else if (tx < 0 || tx >= W) continue;
          out[ty * W + tx] = v;
        }
      }
    }
    return out;
  };
  return { w: W, h: H, rgb, frame, frameColor: C[border], spec };
}

/** One-line description, used as the picture's alt text. */
export function describeScene(spec) {
  const { hero, props, setting, time, mood } = spec;
  const things = [hero, ...(props ?? [])].filter(Boolean).join(', ');
  return `Crochet picture: ${things} in a ${setting} scene, ${time}, ${mood} mood`;
}
