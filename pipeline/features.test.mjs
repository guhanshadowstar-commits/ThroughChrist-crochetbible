// Tests for the features added after the first release: search scopes, picture variants and edits,
// saved data (stars, highlights, notes, backup), interface text and the verse-of-the-day list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { scopeRange } from '../core/scope.mjs';
import { openBible, dataExists, DEFAULT_DATA_DIR } from './node-bible.mjs';
import { composeScene, W, H } from '../core/art/compose.mjs';
import { decodeArt, SETTINGS, TIMES, MOODS, SPRITE_LIST } from '../core/art/spec.mjs';
import { label, figureLabel } from '../web/js/labels.mjs';
import { STRINGS } from '../web/js/i18n.mjs';
import { POPULAR, verseOfTheDay } from '../web/js/popular.mjs';

const skip = dataExists() ? false : 'dist/data not built - run "npm run build"';

// The store reads localStorage and navigator when it loads, so give it simple stand-ins.
const memory = new Map();
globalThis.localStorage = {
  getItem: (k) => (memory.has(k) ? memory.get(k) : null),
  setItem: (k, v) => memory.set(k, String(v)),
  removeItem: (k) => memory.delete(k),
};
const store = await import('../web/js/store.mjs');

test('search scopes: whole Bible, testaments and single books', () => {
  assert.equal(scopeRange('all'), null);
  assert.deepEqual(scopeRange('ot'), [1_000_000, 39_999_999]);
  assert.deepEqual(scopeRange('nt'), [40_000_000, 66_999_999]);
  assert.deepEqual(scopeRange('b43'), [43_000_000, 43_999_999]);
  assert.equal(scopeRange('b0'), null);
  assert.equal(scopeRange('b67'), null);
  assert.equal(scopeRange('nonsense'), null);
});

test('scoped search: testaments add up to the whole, and one book stays inside itself', { skip }, () => {
  const bible = openBible(DEFAULT_DATA_DIR, { versions: ['en-kjv'] });
  const q = (range) => bible.search('love', { versions: ['en-kjv'], range, limit: 500 });
  const all = q(null).total, ot = q(scopeRange('ot')).total, nt = q(scopeRange('nt')).total;
  assert.equal(ot + nt, all);
  assert.ok(ot > 0 && nt > 0);
  const psalms = q(scopeRange('b19'));
  assert.ok(psalms.total > 0);
  assert.ok(psalms.results.every((r) => r.book === 19));
  assert.equal(q([1, 2]).total, 0); // an empty range finds nothing
  bible.close();
});

test('picture variants: the default is unchanged, other variants rearrange the same scene', () => {
  const spec = { setting: 'meadow', time: 'day', mood: 'calm', hero: 'lamb', props: ['dove'] };
  const base = composeScene(spec, 4242).frame(0);
  assert.equal(base.length, W * H);
  assert.deepEqual(composeScene(spec, 4242, 0).frame(0), base); // variant 0 is the original picture
  const variants = new Set([1, 2, 3, 4].map((v) => composeScene(spec, 4242, v).frame(0).join(',')));
  assert.equal(variants.size, 4, 'each shuffle should give a different layout');
  assert.ok(![...variants].includes(base.join(',')));
});

test('every figure, place, hour and mood has an English and a Tamil name', () => {
  for (const lang of ['en', 'ta']) {
    for (const v of SETTINGS) assert.ok(label('setting', v, lang));
    for (const v of TIMES) assert.ok(label('time', v, lang));
    for (const v of MOODS) assert.ok(label('mood', v, lang));
    for (const f of SPRITE_LIST) assert.ok(figureLabel(f, lang));
  }
  const missingTamil = SPRITE_LIST.filter((f) => f !== 'bird' && figureLabel(f, 'ta') === figureLabel(f, 'en') && !['spark'].includes(f));
  assert.deepEqual(missingTamil, [], `figures with no Tamil name: ${missingTamil.join(', ')}`);
});

test('interface text: English and Tamil have exactly the same entries', () => {
  const en = Object.keys(STRINGS.en).sort(), ta = Object.keys(STRINGS.ta).sort();
  assert.deepEqual(ta.filter((k) => !en.includes(k)), [], 'Tamil has entries English lacks');
  assert.deepEqual(en.filter((k) => !ta.includes(k)), [], 'English entries missing in Tamil');
  for (const k of en) assert.equal(typeof STRINGS.en[k], typeof STRINGS.ta[k], `${k}: text vs function mismatch`);
  assert.equal(STRINGS.en.results(1), '1 verse');
  assert.equal(STRINGS.en.results(1200, true), '1,200+ verses');
});

test('saved data: stars, highlights, notes, picture edits, recent searches', () => {
  assert.equal(store.isBookmarked(43003016), false);
  assert.equal(store.toggleBookmark(43003016), true);
  assert.equal(store.isBookmarked(43003016), true);
  assert.equal(store.toggleBookmark(43003016), false);

  store.setHighlight([43003016, 43003017], 3);
  assert.equal(store.highlightOf(43003017), 3);
  store.setHighlight([43003017], 0);
  assert.equal(store.highlightOf(43003017), 0);

  store.setNote(43003016, '  remember this  ');
  assert.equal(store.noteOf(43003016), 'remember this');
  store.setNote(43003016, '   ');
  assert.equal(store.noteOf(43003016), '');

  store.setArtEdit(1001001, { setting: 'sea', variant: 2 });
  assert.deepEqual(store.artEditOf(1001001), { setting: 'sea', variant: 2 });
  store.setArtEdit(1001001, null);
  assert.equal(store.artEditOf(1001001), null);

  for (let i = 0; i < 12; i++) store.addRecent(`word${i}`);
  store.addRecent('word5');
  const recent = store.settings.recent;
  assert.equal(recent.length, 8);
  assert.equal(recent[0], 'word5');
  assert.equal(new Set(recent).size, 8);
  store.clearRecent();
  assert.deepEqual(store.settings.recent, []);
});

test('backup: export then restore merges without duplicates, and refuses foreign files', () => {
  store.toggleBookmark(19023001);
  store.setNote(19023001, 'the Lord is my shepherd');
  store.setHighlight([19023001], 2);
  const backup = store.exportData();
  assert.equal(JSON.parse(backup).app, 'crochet-bible');

  store.toggleBookmark(19023001); // remove the star, then restore it from the backup
  assert.equal(store.isBookmarked(19023001), false);
  store.importData(backup);
  assert.equal(store.isBookmarked(19023001), true);
  const before = store.settings.bookmarks.length;
  store.importData(backup); // restoring again must not add the star twice
  assert.equal(store.settings.bookmarks.length, before);
  assert.equal(store.noteOf(19023001), 'the Lord is my shepherd');

  assert.throws(() => store.importData('{"app":"something-else"}'), /not a Crochet Bible backup/);
  assert.throws(() => store.importData('not json'));
});

test('crocheting plays once per verse: seen verses are remembered, with a limit', () => {
  assert.equal(store.settings.motion, 'first', 'the default is "first time only"');
  assert.equal(store.hasSeen(1001001), false);
  store.markSeen(1001001);
  assert.equal(store.hasSeen(1001001), true);
  store.markSeen(1001001); // marking twice must not duplicate
  assert.equal(store.settings.seen.filter((r) => r === 1001001).length, 1);

  // the list is capped so it never grows without bound: the oldest verses are forgotten first
  for (let i = 0; i < 4100; i++) store.markSeen(5_000_000 + i);
  assert.equal(store.settings.seen.length, 4000);
  assert.equal(store.hasSeen(1001001), false, 'the oldest entry was dropped');
  assert.equal(store.hasSeen(5_000_000 + 4099), true);

  store.forgetSeen();
  assert.equal(store.hasSeen(5_000_000 + 4099), false);
  assert.deepEqual(store.settings.seen, []);
});

test('older settings and backups that said motion "on" now mean "first time only"', () => {
  store.settings.motion = 'always';
  store.importData(JSON.stringify({ app: 'crochet-bible', motion: 'on' }));
  assert.equal(store.settings.motion, 'first');
  store.importData(JSON.stringify({ app: 'crochet-bible', motion: 'off' }));
  assert.equal(store.settings.motion, 'off');
  store.settings.motion = 'first';
});

test('verse of the day: well-loved verses that all have pictures, same verse all day', { skip }, () => {
  const art = decodeArt(readFileSync(path.join(DEFAULT_DATA_DIR, 'art.bin')));
  assert.ok(POPULAR.length >= 80);
  assert.ok(POPULAR.every((r) => art.has(r)), 'every verse-of-the-day pick needs a picture');
  assert.equal(new Set(POPULAR).size, POPULAR.length);
  const a = verseOfTheDay(new Date(2026, 5, 1, 8, 0)), b = verseOfTheDay(new Date(2026, 5, 1, 23, 30));
  assert.equal(a, b);
  assert.notEqual(verseOfTheDay(new Date(2026, 5, 2)), a);
});
