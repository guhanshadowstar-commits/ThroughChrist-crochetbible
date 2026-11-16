// Tests against the built data files. Run `npm run build` first.
import test from 'node:test';
import assert from 'node:assert/strict';

import { openBible, dataExists } from './node-bible.mjs';
import { VERSIONS } from './versions.mjs';

const skip = dataExists() ? false : 'dist/data not built - run "npm run build"';
const bible = skip ? null : openBible();
test.after(() => bible?.close());

const refsOf = (r) => r.results.map((x) => x.label.en);

test('every version is present with license and attribution', { skip }, () => {
  const rows = bible.versions();
  assert.equal(rows.length, VERSIONS.length);
  for (const v of rows) {
    assert.ok(v.license && v.attribution && v.source_url, `${v.id} is missing legal info`);
    assert.ok(v.verse_count > 31000, `${v.id} looks incomplete (${v.verse_count})`);
  }
  assert.equal(rows.filter((v) => v.lang === 'ta').length, 2);
  assert.ok(rows.filter((v) => v.lang === 'en').length >= 9);
});

test('structure: 66 books, 1189 chapters, canonical verse list', { skip }, () => {
  const books = bible.books();
  assert.equal(books.length, 66);
  assert.equal(books.reduce((n, b) => n + b.chapters, 0), 1189);
  assert.equal(bible.chapterVerseCount(19, 119), 176); // Psalm 119
  assert.equal(bible.chapterVerseCount(19, 23), 6);
});

test('KJV is complete: 31,102 verses, John 3:16 exact', { skip }, () => {
  const kjv = bible.versions().find((v) => v.id === 'en-kjv');
  assert.equal(kjv.verse_count, 31102);
  const r = bible.lookup('John 3:16', { show: ['en-kjv'] });
  assert.match(r.verses[0].texts['en-kjv'], /^For God so loved the world, that he gave his only begotten Son/);
  assert.doesNotMatch(r.verses[0].texts['en-kjv'], /[¶\[\]]/); // source markup stripped
});

test('Tamil text is stored untouched (no index remapping leaks into display text)', { skip }, () => {
  const r = bible.lookup('John 3:16', { show: ['ta-irv', 'ta-tcv'] });
  assert.match(r.verses[0].texts['ta-irv'], /^தேவன், தம்முடைய ஒரேபேறான குமாரனை/);
  assert.ok(r.verses[0].texts['ta-tcv'].includes('அன்புகூர்ந்தார்'));
  const privateUse = /[-]/u;
  const leaked = ['ta-irv', 'ta-tcv'].flatMap((id) => bible.shards.get(id).all('SELECT text FROM texts'))
    .filter((r) => privateUse.test(r.text));
  assert.equal(leaked.length, 0);
});

test('lookup: ranges, whole chapters, Tamil names, bad input', { skip }, () => {
  const range = bible.lookup('Gen 1:1-3', { show: ['en-kjv'] });
  assert.equal(range.verses.length, 3);
  assert.equal(bible.lookup('சங்கீதம் 23', { show: ['ta-irv'] }).verses.length, 6);
  assert.equal(bible.lookup('1 Cor 13', { show: ['en-kjv'] }).verses.length, 13);
  assert.match(bible.lookup('John 99:1').error, /21 chapters/);
  assert.match(bible.lookup('John 3:99').error, /36 verses/);
  assert.equal(bible.lookup('love one another'), null);
});

test('English search: AND, phrase, NOT, OR, prefix', { skip }, () => {
  const love = bible.search('love one another', { limit: 50 });
  assert.ok(refsOf(love).includes('John 13:34'));
  assert.ok(refsOf(love).includes('1 John 4:7'));

  assert.deepEqual(refsOf(bible.search('"the Lord is my shepherd"', { versions: ['en-kjv'] })), ['Psalms 23:1']);

  const withHope = bible.search('faith', { limit: 1 }).total;
  const without = bible.search('faith -hope', { limit: 1 }).total;
  assert.ok(without < withHope && without > 0);

  assert.ok(bible.search('shepherd lamb', { any: true }).total > bible.search('shepherd lamb').total);
  assert.ok(bible.search('merci*').total > bible.search('mercy').total * 0.5);
});

test('English search finds archaic and modern forms together', { skip }, () => {
  // KJV says "believeth"; searching the base word must still hit John 3:16 in KJV alone.
  const kjv = bible.search('believe', { versions: ['en-kjv'], limit: 500 });
  assert.ok(refsOf(kjv).includes('John 3:16'));
  const ws = bible.search('whosoever believeth', { versions: ['en-kjv'], limit: 50 });
  assert.ok(refsOf(ws).includes('John 3:16'));
});

test('version filter restricts what can match', { skip }, () => {
  const r = bible.search('begotten', { versions: ['en-web'] });
  assert.ok(r.results.every((x) => x.matchedVersions.every((v) => v === 'en-web')));
  assert.equal(bible.search('begotten', { versions: ['ta-irv'] }).total, 0); // wrong language filter
});

test('Tamil script search finds inflected forms', { skip }, () => {
  const r = bible.search('அன்பு', { limit: 700 });
  assert.ok(r.total > 300, `expected many hits, got ${r.total}`);
  const labels = refsOf(r);
  assert.ok(labels.includes('1 John 4:8'));   // அன்பாகவே / அன்பில்லாதவன்
  assert.ok(labels.includes('1 Corinthians 13:4'));
  assert.ok(r.results.every((x) => x.matchedVersions.every((v) => v.startsWith('ta-'))));
});

test('Tamil search: two words must both appear', { skip }, () => {
  const both = bible.search('தேவன் அன்பு', { limit: 100 });
  assert.ok(both.total > 0 && both.total < bible.search('அன்பு').total);
  assert.ok(refsOf(both).includes('1 John 4:8'));
});

test('Tamil typed in English letters (Tanglish)', { skip }, () => {
  const r = bible.search('anbu', { lang: 'ta', limit: 700 });
  assert.ok(r.total > 300);
  assert.ok(refsOf(r).includes('1 John 4:8'));
  // English-only default does not drag Tamil in for a Latin query
  assert.equal(bible.search('anbu').total, 0);
  // devan / thevan both reach தேவன்
  assert.equal(bible.search('devan', { lang: 'ta' }).total, bible.search('thevan', { lang: 'ta' }).total);
});

test('results carry text for the requested versions', { skip }, () => {
  const r = bible.search('shepherd', { show: ['en-kjv', 'ta-irv', 'ta-tcv'], limit: 3 });
  for (const hit of r.results) {
    assert.ok(hit.texts['en-kjv'] && hit.texts['ta-irv']);
    assert.ok(hit.label.ta && hit.bookName.ta);
  }
});

test('paging does not repeat verses', { skip }, () => {
  const a = bible.search('grace', { limit: 10, offset: 0 });
  const b = bible.search('grace', { limit: 10, offset: 10 });
  const overlap = refsOf(a).filter((x) => refsOf(b).includes(x));
  assert.equal(overlap.length, 0);
  assert.equal(a.total, b.total);
});

test('empty and symbol-only queries are safe', { skip }, () => {
  assert.equal(bible.search('').total, 0);
  assert.equal(bible.search('   ').total, 0);
  assert.equal(bible.search('"" ** --').total, 0);
  assert.doesNotThrow(() => bible.search('God\'s "love" (AND) NOT OR'));
});
