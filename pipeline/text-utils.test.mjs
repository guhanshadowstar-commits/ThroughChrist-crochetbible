import test from 'node:test';
import assert from 'node:assert/strict';

import { parseReference } from '../core/reference.mjs';
import {
  tamilWordToPhonetic, latinWordToPhonetic, stemPhonetic, tamilTokens, stemToken, tamilScriptForm,
} from '../core/tamil.mjs';
import { foldArchaic, englishIndexForm } from '../core/english.mjs';
import { parseQuery } from '../core/query.mjs';
import { BOOKS, ALIAS_INDEX, refId, splitRef } from '../core/books.mjs';

test('66 books with Tamil names and no alias collisions', () => {
  assert.equal(BOOKS.length, 66);
  assert.ok(BOOKS.every((b) => b.ta && b.en));
  const perBook = new Map();
  for (const id of ALIAS_INDEX.values()) perBook.set(id, (perBook.get(id) ?? 0) + 1);
  assert.equal(perBook.size, 66);                       // every book is reachable by name
  assert.ok([...perBook.values()].every((n) => n >= 3)); // full name, code and a short form at least
});

test('ref ids round-trip', () => {
  assert.equal(refId(43, 3, 16), 43003016);
  assert.deepEqual(splitRef(43003016), { book: 43, chapter: 3, verse: 16 });
});

test('parseReference: English forms', () => {
  assert.deepEqual(parseReference('John 3:16'), { book: 43, chapter: 3, verseStart: 16, verseEnd: 16 });
  assert.deepEqual(parseReference('jn 3.16'), { book: 43, chapter: 3, verseStart: 16, verseEnd: 16 });
  assert.deepEqual(parseReference('Gen 1:1-3'), { book: 1, chapter: 1, verseStart: 1, verseEnd: 3 });
  assert.deepEqual(parseReference('1 Cor 13'), { book: 46, chapter: 13, verseStart: null, verseEnd: null });
  assert.deepEqual(parseReference('II Kings 5:14'), { book: 12, chapter: 5, verseStart: 14, verseEnd: 14 });
  assert.deepEqual(parseReference('First John 4:8'), { book: 62, chapter: 4, verseStart: 8, verseEnd: 8 });
  assert.deepEqual(parseReference('Song of Solomon 2:1'), { book: 22, chapter: 2, verseStart: 1, verseEnd: 1 });
  assert.deepEqual(parseReference('Psalm 23'), { book: 19, chapter: 23, verseStart: null, verseEnd: null });
  assert.equal(parseReference('Genesis').book, 1);
});

test('parseReference: Tamil names', () => {
  assert.deepEqual(parseReference('யோவான் 3:16'), { book: 43, chapter: 3, verseStart: 16, verseEnd: 16 });
  assert.deepEqual(parseReference('1 யோவான் 4:8'), { book: 62, chapter: 4, verseStart: 8, verseEnd: 8 });
  assert.deepEqual(parseReference('சங்கீதம் 23'), { book: 19, chapter: 23, verseStart: null, verseEnd: null });
});

test('parseReference: rejects non-references', () => {
  assert.equal(parseReference('love one another'), null);
  assert.equal(parseReference('God is love'), null);
  assert.equal(parseReference(''), null);
  assert.equal(parseReference('John 3:16-2'), null);
});

test('Tamil: marks are protected so words are not chopped into fragments', () => {
  // each whole word must survive as one token
  assert.equal(tamilTokens('அன்பு தேவன்').length, 2);
  assert.notEqual(tamilScriptForm('அன்பு'), 'அன்பு'); // vowel signs/pulli were remapped
  assert.equal(tamilTokens('அன்பு,').length, 1); // punctuation still separates
});

test('Tamil: stemming drops only the final vowel sign / pulli', () => {
  const stem = (w) => stemToken(tamilTokens(w)[0]);
  assert.equal(stem('அன்பு'), stem('அன்பை'));
  assert.equal(stem('தேவன்'), stem('தேவனே').slice(0, stem('தேவன்').length));
  assert.notEqual(stem('அன்பு'), stem('தேவன்'));
});

test('Tanglish: typed English letters meet Tamil script', () => {
  assert.equal(tamilWordToPhonetic('அன்பு'), 'anpu');
  assert.equal(latinWordToPhonetic('anbu'), 'anpu');
  assert.equal(tamilWordToPhonetic('தேவன்'), 'tevan');
  assert.equal(latinWordToPhonetic('thevan'), 'tevan');
  assert.equal(latinWordToPhonetic('devan'), 'tevan');
  assert.equal(tamilWordToPhonetic('தங்கம்'), latinWordToPhonetic('thangam'));
  assert.equal(tamilWordToPhonetic('தமிழ்'), latinWordToPhonetic('tamizh'));
  assert.equal(stemPhonetic('anpu'), stemPhonetic('anpai'));
});

test('English: archaic verb forms fold to their modern base, real words are untouched', () => {
  for (const [a, b] of [['loveth', 'love'], ['believeth', 'believe'], ['hath', 'have'], ['sayest', 'say'], ['walketh', 'walk']]) {
    assert.equal(foldArchaic(a), b);
  }
  for (const w of ['earnest', 'forest', 'priest', 'death', 'breath', 'faith', 'rest', 'honest']) {
    assert.equal(foldArchaic(w), w);
  }
  assert.equal(englishIndexForm('Whosoever believeth in Him'), 'whosoever believe in him');
});

test('parseQuery: phrases, exclusions, prefixes', () => {
  const p = parseQuery('"good shepherd" faith -hope merci*');
  assert.deepEqual(p.positive.map((x) => [x.text, x.phrase, x.prefix]),
    [['good shepherd', true, false], ['faith', false, false], ['merci', false, true]]);
  assert.deepEqual(p.negative.map((x) => x.text), ['hope']);
});
