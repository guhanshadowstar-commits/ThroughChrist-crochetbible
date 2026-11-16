// Reads a verse and decides what its picture shows: setting, time of day, mood and up to three
// figures. The result (a "spec") is tiny: six numbers per verse, stored in art.bin.
import { foldArchaic } from '../english.mjs';
import { SPRITE_NAMES } from './sprites.mjs';
import {
  SPRITE_INDEX, SETTING_INDEX, TIME_INDEX, MOOD_INDEX, GLORY_SET, BOOK_DEFAULTS, lite,
} from './concepts.mjs';

export const SETTINGS = ['meadow', 'sea', 'mountain', 'desert', 'city', 'temple', 'garden', 'heaven', 'cave', 'field', 'river', 'house'];
export const TIMES = ['day', 'dawn', 'dusk', 'night'];
export const MOODS = ['calm', 'joy', 'holy', 'sorrow', 'storm', 'wrath', 'peace'];
export const SPRITE_LIST = SPRITE_NAMES; // stable order; indices are stored in art.bin
const NONE = 255;

const PEOPLE = new Set(['man', 'woman', 'child', 'king', 'priest', 'prophet', 'warrior', 'shepherd']);

/** Where a figure naturally belongs when a verse names no place. */
const HOME = {
  boat: 'sea', fish: 'sea', net: 'sea', ark: 'sea', lamb: 'meadow', sheep: 'meadow', shepherd: 'meadow', donkey: 'meadow',
  tree: 'garden', flower: 'garden', lily: 'garden', grapes: 'garden', apple: 'garden', sprout: 'garden', palm: 'garden',
  angel: 'heaven', throne: 'heaven', crown: 'heaven', trumpet: 'heaven', tomb: 'cave', chains: 'cave',
  altar: 'temple', temple: 'temple', priest: 'temple', candle: 'temple', lamp: 'temple',
  camel: 'desert', tent: 'desert', cedar: 'mountain', tablets: 'mountain', rock: 'mountain', eagle: 'mountain',
  tower: 'city', wall: 'city', gate: 'city', horse: 'city', king: 'city', warrior: 'city', sword: 'city', shield: 'city',
  house: 'house', door: 'house', bread: 'house', cup: 'house', jar: 'house', book: 'house', scroll: 'house',
  wheat: 'field', well: 'river', cross: 'mountain', lion: 'desert',
};

/** Every plausible base form of a word ("loved" -> love, "healing" -> heal), so one listed stem catches them all. */
function baseForms(wd) {
  const out = [lite(wd)];
  if (wd.length > 5 && wd.endsWith('ing')) { out.push(wd.slice(0, -3), `${wd.slice(0, -3)}e`); }
  if (wd.length > 4 && wd.endsWith('ied')) out.push(`${wd.slice(0, -3)}y`);
  else if (wd.length > 4 && wd.endsWith('ed')) { out.push(wd.slice(0, -2), wd.slice(0, -1)); }
  return out;
}

export const tokensOf = (text) =>
  text.toLowerCase().split(/[^\p{L}-]+/u).filter(Boolean).flatMap((x) => baseForms(foldArchaic(x)));

function tally(counts, index, scores) {
  for (const [tok, n] of counts) {
    const hits = index.get(tok);
    if (!hits) continue;
    for (const [name, weight] of hits) scores[name.split('_')[0]] = (scores[name.split('_')[0]] ?? 0) + weight * Math.min(n, 2);
  }
}
const best = (scores, min) => Object.entries(scores).filter(([, v]) => v >= min).sort((a, b) => b[1] - a[1]);

/** Small deterministic hash used to break ties and rotate defaults. */
export const hashRef = (ref, salt = 0) => {
  let h = Math.imul((ref ^ salt) + 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
};

/**
 * @param {number} ref  verse id (book*1e6 + chapter*1e3 + verse)
 * @param {string[]} texts  the verse in a few English versions (more versions = steadier reading)
 */
export function makeSpec(ref, texts) {
  const book = Math.floor(ref / 1e6);
  const def = BOOK_DEFAULTS[book] ?? { setting: 'meadow', heroes: ['book', 'tree', 'heart'] };

  // word counts, averaged over the versions given
  const counts = new Map();
  for (const t of texts) for (const tok of tokensOf(t)) counts.set(tok, (counts.get(tok) ?? 0) + 1 / texts.length);

  const sprite = {}, setting = {}, time = {}, mood = {};
  tally(counts, SPRITE_INDEX, sprite);
  tally(counts, SETTING_INDEX, setting);
  tally(counts, TIME_INDEX, time);
  tally(counts, MOOD_INDEX, mood);
  let glory = 0;
  for (const [tok, n] of counts) if (GLORY_SET.has(tok)) glory += Math.min(n, 2);
  if (glory) mood.holy = (mood.holy ?? 0) + Math.min(glory * 0.9, 1.8);
  if (glory >= 2) setting.heaven = (setting.heaven ?? 0) + 1.4;

  // ---- figures ----
  const ranked = best(sprite, 1.2).map(([n]) => n).filter((n) => SPRITE_LIST.includes(n));
  let hero = ranked[0];
  if (!hero) {
    const options = def.heroes.filter((n) => SPRITE_LIST.includes(n));
    hero = options[hashRef(ref, 11) % options.length];
  }
  const props = [];
  let people = PEOPLE.has(hero) ? 1 : 0;
  for (const n of ranked.slice(1)) {
    if (props.length >= 2) break;
    if (PEOPLE.has(n)) { if (people) continue; people++; }
    if (sprite[n] >= 1.5) props.push(n);
  }
  if (hero === 'shepherd' && !props.includes('lamb')) props.unshift('lamb');
  if (hero === 'lamb' && props.length === 0 && (sprite.shepherd ?? 0) >= 1) props.push('shepherd');

  // ---- place, hour, mood ----
  let [place] = best(setting, 2)[0] ?? [];
  place ??= HOME[hero] ?? def.setting;
  if (hero === 'cross' && !setting.mountain) place = 'mountain';
  const moodName = best(mood, 1.5)[0]?.[0] ?? def.mood ?? 'calm';
  let hour = best(time, 2)[0]?.[0] ?? 'day';
  if (moodName === 'sorrow' && hour === 'day' && hashRef(ref, 5) % 3 === 0) hour = 'dusk';
  if (place === 'cave' && hour === 'day') hour = 'dusk';

  return { setting: place, time: hour, mood: moodName, hero, props };
}

// ---------- compact storage ----------
const idx = (list, v) => (v == null ? NONE : list.indexOf(v));

/** art.bin: 'CRO1', count (u32), refs (u32 each), then 6 bytes per verse. */
export function encodeSpecs(entries) {
  const n = entries.length;
  const out = new Uint8Array(8 + n * 4 + n * 6);
  const dv = new DataView(out.buffer);
  out.set([0x43, 0x52, 0x4f, 0x31], 0);
  dv.setUint32(4, n, true);
  entries.forEach(({ ref }, i) => dv.setUint32(8 + i * 4, ref, true));
  const base = 8 + n * 4;
  entries.forEach(({ spec: s }, i) => {
    out.set([
      idx(SETTINGS, s.setting), idx(TIMES, s.time), idx(MOODS, s.mood),
      idx(SPRITE_LIST, s.hero), idx(SPRITE_LIST, s.props[0]), idx(SPRITE_LIST, s.props[1]),
    ], base + i * 6);
  });
  return out;
}

export function decodeArt(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  if (dv.getUint32(0, false) !== 0x43524f31) throw new Error('Not an art pack');
  const n = dv.getUint32(4, true);
  const base = 8 + n * 4;
  const where = new Map();
  for (let i = 0; i < n; i++) where.set(dv.getUint32(8 + i * 4, true), i);
  const name = (list, v) => (v === NONE ? undefined : list[v]);
  return {
    count: n,
    has: (ref) => where.has(ref),
    specFor(ref) {
      const i = where.get(ref);
      if (i === undefined) return null;
      const o = base + i * 6;
      return {
        setting: SETTINGS[u8[o]], time: TIMES[u8[o + 1]], mood: MOODS[u8[o + 2]],
        hero: SPRITE_LIST[u8[o + 3]],
        props: [name(SPRITE_LIST, u8[o + 4]), name(SPRITE_LIST, u8[o + 5])].filter(Boolean),
      };
    },
  };
}
