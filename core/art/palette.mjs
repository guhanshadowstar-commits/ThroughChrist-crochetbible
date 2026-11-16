// The yarn palette. Every pixel of every picture is an index into this list, so a whole scene can
// be re-coloured (dawn, night, storm...) by changing the palette, without touching the pixels.

const COLORS = {
  k: '#3b2b25', // dark brown (outline yarn)
  w: '#f8f3ea', // wool white
  c: '#e6d9bf', // cream
  y: '#f6d24f', // yellow
  g: '#dca221', // gold
  o: '#ec8c2d', // orange
  r: '#d03c34', // red
  R: '#8d2528', // maroon
  p: '#f0a0b6', // pink
  P: '#c0608e', // plum
  v: '#8466b4', // violet
  V: '#55408a', // deep violet
  b: '#4a86c8', // blue
  q: '#2f5f9f', // deep blue
  B: '#233a6d', // navy
  s: '#93cdee', // sky
  S: '#cdeaf8', // pale sky
  t: '#34a39d', // teal
  T: '#1f736f', // deep teal
  n: '#58a74b', // green
  N: '#2f7137', // deep green
  l: '#a6d55a', // lime
  m: '#92603a', // brown
  M: '#5f3d24', // deep brown
  a: '#a7adb3', // grey
  A: '#5f656e', // dark grey
  f: '#f3cca4', // skin, light
  F: '#cf966a', // skin, medium
  j: '#8e5f3f', // skin, deep
  e: '#e8c995', // sand
  E: '#c79b5f', // deep sand
  x: '#131a38', // night, deepest
  X: '#212f63', // night blue
  h: '#f7bba8', // sunrise haze
  u: '#ffd883', // sun glow
  d: '#6f7f8f', // storm grey-blue
};

export const KEYS = Object.keys(COLORS).join('');
export const HEX = Object.values(COLORS);
/** colour letter -> palette index (0 is "transparent", so indices start at 1) */
export const C = Object.fromEntries(Object.keys(COLORS).map((k, i) => [k, i + 1]));
export const PALETTE_SIZE = HEX.length + 1;

/** The darker yarn used for the shaded lower edge of a shape (gives each stitch group some volume). */
const SHADE_LETTERS = {
  w: 'c', c: 'e', y: 'g', g: 'E', o: 'r', r: 'R', p: 'P', v: 'V', b: 'q', q: 'B', s: 'b', S: 's',
  t: 'T', n: 'N', l: 'n', m: 'M', a: 'A', f: 'F', F: 'j', e: 'E', u: 'y', h: 'p', d: 'A',
};
export const SHADE = {};
for (const [a, b] of Object.entries(SHADE_LETTERS)) SHADE[C[a]] = C[b];

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const RGB = [[0, 0, 0], ...HEX.map(hex2rgb)];

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const gray = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

/**
 * Colour grade for a scene. `time` is the hour of the picture; `mood` shifts the feeling.
 * Returns an array of [r,g,b] indexed like RGB.
 */
export function grade(time = 'day', mood = 'calm') {
  const steps = [];
  if (time === 'dawn') steps.push((c) => mix(c, [255, 190, 130], 0.16));
  if (time === 'dusk') steps.push((c) => mix(mix(c, [255, 140, 90], 0.2), [90, 60, 130], 0.12));
  if (time === 'night') steps.push((c) => mix(c.map((v, i) => v * [0.5, 0.55, 0.85][i]), [20, 30, 80], 0.25));
  if (mood === 'storm' || mood === 'sorrow') steps.push((c) => mix(c, [gray(c), gray(c), gray(c) + 8], 0.5).map((v) => v * 0.82));
  if (mood === 'wrath') steps.push((c) => mix(c, [200, 60, 40], 0.18).map((v) => v * 0.88));
  if (mood === 'holy' || mood === 'joy') steps.push((c) => mix(c, [255, 236, 170], 0.12));
  return RGB.map((c, i) => (i === 0 ? c : steps.reduce((acc, f) => f(acc), c).map((v) => Math.max(0, Math.min(255, Math.round(v))))));
}
