// Tests for the crochet art: sprites, scene writer, composer and the art pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { SPRITE_NAMES, getFrames } from '../core/art/sprites.mjs';
import { PALETTE_SIZE } from '../core/art/palette.mjs';
import { composeScene, describeScene, W, H } from '../core/art/compose.mjs';
import { decodeArt, makeSpec, encodeSpecs, SETTINGS, TIMES, MOODS } from '../core/art/spec.mjs';
import { SPRITE_WORDS, BOOK_DEFAULTS } from '../core/art/concepts.mjs';
import { openBible, dataExists, DEFAULT_DATA_DIR } from './node-bible.mjs';

const skip = dataExists() ? false : 'dist/data not built - run "npm run build"';
const art = skip ? null : decodeArt(readFileSync(path.join(DEFAULT_DATA_DIR, 'art.bin')));
const REFS = skip ? [] : (() => { const b = openBible(DEFAULT_DATA_DIR, { versions: ['en-kjv'] }); const x = b.allRefs(); b.close(); return x; })();
const hash = (u8) => createHash('sha1').update(u8).digest('hex');
const ref = (b, c, v) => b * 1e6 + c * 1e3 + v;

test('every sprite draws something, stays small and uses real palette colours', () => {
  assert.ok(SPRITE_NAMES.length >= 70);
  for (const name of SPRITE_NAMES) {
    for (const g of getFrames(name)) {
      const filled = g.px.filter(Boolean).length;
      assert.ok(filled >= 6, `${name} is nearly empty`);
      assert.ok(g.w <= 32 && g.h <= 24, `${name} is too big (${g.w}x${g.h})`);
      assert.ok(g.px.every((v) => v < PALETTE_SIZE), `${name} uses an unknown colour`);
    }
  }
});

test('every word list in the dictionary points at a real sprite or setting', () => {
  for (const key of Object.keys(SPRITE_WORDS)) {
    const sprite = key.split('_')[0];
    assert.ok(SPRITE_NAMES.includes(sprite), `concept "${key}" has no sprite`);
  }
  for (const d of Object.values(BOOK_DEFAULTS)) {
    assert.ok(SETTINGS.includes(d.setting), `unknown setting ${d.setting}`);
    assert.ok(d.heroes.some((n) => SPRITE_NAMES.includes(n)), `no usable hero in ${d.heroes}`);
  }
});

test('scene writer reads the verse (no database needed)', () => {
  const s = makeSpec(ref(19, 23, 1), ['The LORD is my shepherd; I shall not want.']);
  assert.equal(s.hero, 'shepherd');
  assert.ok(s.props.includes('lamb'));
  assert.equal(s.setting, 'meadow');
  assert.equal(makeSpec(ref(32, 1, 17), ['Now the LORD had prepared a great fish to swallow up Jonah.']).hero, 'fish');
  assert.equal(makeSpec(ref(43, 1, 1), ['']).hero !== undefined, true); // empty text falls back to the book's defaults
  const night = makeSpec(ref(43, 3, 2), ['The same came to Jesus by night, and said unto him']);
  assert.equal(night.time, 'night');
});

test('art pack round-trips', () => {
  const entries = [
    { ref: 1001001, spec: { setting: 'heaven', time: 'dawn', mood: 'holy', hero: 'dove', props: ['lamb'] } },
    { ref: 66022021, spec: { setting: 'sea', time: 'night', mood: 'storm', hero: 'boat', props: [] } },
  ];
  const pack = decodeArt(encodeSpecs(entries));
  assert.equal(pack.count, 2);
  assert.deepEqual(pack.specFor(1001001), entries[0].spec);
  assert.deepEqual(pack.specFor(66022021), entries[1].spec);
  assert.equal(pack.specFor(5), null);
});

test('art.bin has a picture for every verse in the Bible', { skip }, () => {
  const bible = openBible(DEFAULT_DATA_DIR, { versions: ['en-kjv'] });
  const refs = bible.allRefs();
  bible.close();
  assert.equal(art.count, refs.length);
  assert.ok(refs.every((r) => art.has(r)));
  for (const r of refs.filter((_, i) => i % 97 === 0)) {
    const s = art.specFor(r);
    assert.ok(SETTINGS.includes(s.setting) && TIMES.includes(s.time) && MOODS.includes(s.mood) && SPRITE_NAMES.includes(s.hero));
  }
});

test('famous verses get fitting pictures', { skip }, () => {
  const heroOrProp = (r) => { const s = art.specFor(r); return [s.hero, ...s.props]; };
  assert.ok(heroOrProp(ref(6, 1, 1)).length >= 1);
  assert.ok(heroOrProp(ref(1, 6, 14)).includes('ark'));              // Noah
  assert.ok(heroOrProp(ref(27, 6, 22)).includes('lion'));            // Daniel and the lions
  assert.ok(heroOrProp(ref(32, 1, 17)).includes('fish'));            // Jonah
  assert.ok(heroOrProp(ref(1, 3, 1)).includes('serpent'));           // Eden
  assert.ok(heroOrProp(ref(19, 23, 1)).some((n) => ['shepherd', 'lamb'].includes(n)));
  assert.ok(heroOrProp(ref(46, 13, 4)).includes('heart'));           // love is patient
  assert.ok(heroOrProp(ref(19, 150, 3)).some((n) => ['harp', 'trumpet'].includes(n)));
  assert.ok(heroOrProp(ref(40, 4, 19)).some((n) => ['fish', 'net', 'boat'].includes(n))); // fishers of men
  assert.equal(art.specFor(ref(19, 23, 4)).setting, 'cave');         // valley of the shadow of death
});

test('scenes are fully covered, animate without error, and never change shape', { skip }, () => {
  let checked = 0;
  for (let i = 0; i < REFS.length; i += 37) {
    const r = REFS[i];
    const scene = composeScene(art.specFor(r), r);
    for (const tm of [0, 0.4, 1.3, 7.7, 61.2]) {
      const f = scene.frame(tm);
      assert.equal(f.length, W * H);
      assert.ok(f.every((v) => v > 0 && v < PALETTE_SIZE), `hole or bad colour in ${r} at t=${tm}`);
    }
    assert.ok(describeScene(art.specFor(r)).startsWith('Crochet picture'));
    checked++;
  }
  assert.ok(checked > 800);
});

test('scenes are deterministic, and verses with the same subject still look different', { skip }, () => {
  const refs = REFS;
  const sample = refs[1234];
  const a = composeScene(art.specFor(sample), sample).frame(0);
  const b = composeScene(art.specFor(sample), sample).frame(0);
  assert.equal(hash(a), hash(b));

  // every verse whose picture is "a lamb in a meadow" should still get its own scene
  const same = refs.filter((r) => { const s = art.specFor(r); return s.hero === 'lamb' && s.setting === 'meadow' && s.time === 'day'; }).slice(0, 120);
  assert.ok(same.length >= 30, `only ${same.length} lamb scenes to compare`);
  const unique = new Set(same.map((r) => hash(composeScene(art.specFor(r), r).frame(0))));
  assert.ok(unique.size / same.length > 0.97, `only ${unique.size} distinct pictures out of ${same.length}`);
});

test('the idle animation actually moves', { skip }, () => {
  const night = composeScene({ setting: 'meadow', time: 'night', mood: 'calm', hero: 'lamb', props: [] }, 77);
  const frames = new Set([0, 0.5, 1, 1.5, 2, 3].map((t) => hash(night.frame(t))));
  assert.ok(frames.size >= 3, 'twinkling stars and drifting clouds should change the picture over time');
  const storm = composeScene({ setting: 'sea', time: 'day', mood: 'storm', hero: 'boat', props: [] }, 78);
  assert.ok(new Set([0, 0.1, 0.2, 0.3].map((t) => hash(storm.frame(t)))).size >= 2, 'rain should fall');
});
