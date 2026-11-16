import { TAMIL_NAMES as TA } from './tamil-names.gen.mjs';

// Canonical order = Protestant 66-book canon. `vpl` is the 3-letter code used inside
// the eBible *_vpl.txt files, `usfm` is the standard USFM/Paratext code.
// `en` lists English aliases (the full English name is added automatically).
const RAW = [
  ['GEN', 'GEN', 'Genesis', ['gen', 'ge', 'gn']],
  ['EXO', 'EXO', 'Exodus', ['exo', 'ex', 'exod']],
  ['LEV', 'LEV', 'Leviticus', ['lev', 'le', 'lv']],
  ['NUM', 'NUM', 'Numbers', ['num', 'nu', 'nm', 'nb']],
  ['DEU', 'DEU', 'Deuteronomy', ['deu', 'de', 'dt', 'deut']],
  ['JOS', 'JOS', 'Joshua', ['jos', 'josh', 'jsh']],
  ['JDG', 'JDG', 'Judges', ['jdg', 'judg', 'jg', 'jdgs']],
  ['RUT', 'RUT', 'Ruth', ['rut', 'ru', 'rth']],
  ['1SA', '1SA', '1 Samuel', ['1sa', '1sam', '1sm', '1s']],
  ['2SA', '2SA', '2 Samuel', ['2sa', '2sam', '2sm', '2s']],
  ['1KI', '1KI', '1 Kings', ['1ki', '1kgs', '1kin', '1k']],
  ['2KI', '2KI', '2 Kings', ['2ki', '2kgs', '2kin', '2k']],
  ['1CH', '1CH', '1 Chronicles', ['1ch', '1chr', '1chron']],
  ['2CH', '2CH', '2 Chronicles', ['2ch', '2chr', '2chron']],
  ['EZR', 'EZR', 'Ezra', ['ezr']],
  ['NEH', 'NEH', 'Nehemiah', ['neh', 'ne']],
  ['EST', 'EST', 'Esther', ['est', 'esth']],
  ['JOB', 'JOB', 'Job', ['job', 'jb']],
  ['PSA', 'PSA', 'Psalms', ['psa', 'ps', 'psalm', 'pss', 'psm', 'pslm']],
  ['PRO', 'PRO', 'Proverbs', ['pro', 'prov', 'pr', 'prv']],
  ['ECC', 'ECC', 'Ecclesiastes', ['ecc', 'eccl', 'eccles', 'qoh']],
  ['SOL', 'SNG', 'Song of Solomon', ['sol', 'sng', 'song', 'sos', 'songofsongs', 'canticles', 'sg']],
  ['ISA', 'ISA', 'Isaiah', ['isa', 'is']],
  ['JER', 'JER', 'Jeremiah', ['jer', 'je', 'jr']],
  ['LAM', 'LAM', 'Lamentations', ['lam', 'la']],
  ['EZE', 'EZK', 'Ezekiel', ['eze', 'ezk', 'ezek']],
  ['DAN', 'DAN', 'Daniel', ['dan', 'da', 'dn']],
  ['HOS', 'HOS', 'Hosea', ['hos', 'ho']],
  ['JOE', 'JOL', 'Joel', ['joe', 'jol', 'jl']],
  ['AMO', 'AMO', 'Amos', ['amo', 'am']],
  ['OBA', 'OBA', 'Obadiah', ['oba', 'obad', 'ob']],
  ['JON', 'JON', 'Jonah', ['jonah', 'jnh']],
  ['MIC', 'MIC', 'Micah', ['mic', 'mi']],
  ['NAH', 'NAM', 'Nahum', ['nah', 'nam', 'na']],
  ['HAB', 'HAB', 'Habakkuk', ['hab', 'hb']],
  ['ZEP', 'ZEP', 'Zephaniah', ['zep', 'zeph', 'zp']],
  ['HAG', 'HAG', 'Haggai', ['hag', 'hg']],
  ['ZEC', 'ZEC', 'Zechariah', ['zec', 'zech', 'zc']],
  ['MAL', 'MAL', 'Malachi', ['mal', 'ml']],
  ['MAT', 'MAT', 'Matthew', ['mat', 'matt', 'mt']],
  ['MAR', 'MRK', 'Mark', ['mar', 'mrk', 'mk', 'mr']],
  ['LUK', 'LUK', 'Luke', ['luk', 'lk', 'lu']],
  ['JOH', 'JHN', 'John', ['joh', 'jhn', 'jn']],
  ['ACT', 'ACT', 'Acts', ['act', 'ac', 'actsoftheapostles']],
  ['ROM', 'ROM', 'Romans', ['rom', 'ro', 'rm']],
  ['1CO', '1CO', '1 Corinthians', ['1co', '1cor']],
  ['2CO', '2CO', '2 Corinthians', ['2co', '2cor']],
  ['GAL', 'GAL', 'Galatians', ['gal', 'ga']],
  ['EPH', 'EPH', 'Ephesians', ['eph', 'ep']],
  ['PHI', 'PHP', 'Philippians', ['phi', 'php', 'phil', 'pp']],
  ['COL', 'COL', 'Colossians', ['col']],
  ['1TH', '1TH', '1 Thessalonians', ['1th', '1thess', '1thes']],
  ['2TH', '2TH', '2 Thessalonians', ['2th', '2thess', '2thes']],
  ['1TI', '1TI', '1 Timothy', ['1ti', '1tim', '1tm']],
  ['2TI', '2TI', '2 Timothy', ['2ti', '2tim', '2tm']],
  ['TIT', 'TIT', 'Titus', ['tit', 'ti']],
  ['PHM', 'PHM', 'Philemon', ['phm', 'philem', 'phlm']],
  ['HEB', 'HEB', 'Hebrews', ['heb']],
  ['JAM', 'JAS', 'James', ['jam', 'jas', 'jm']],
  ['1PE', '1PE', '1 Peter', ['1pe', '1pet', '1pt']],
  ['2PE', '2PE', '2 Peter', ['2pe', '2pet', '2pt']],
  ['1JO', '1JN', '1 John', ['1jo', '1jn', '1joh']],
  ['2JO', '2JN', '2 John', ['2jo', '2jn', '2joh']],
  ['3JO', '3JN', '3 John', ['3jo', '3jn', '3joh']],
  ['JUD', 'JUD', 'Jude', ['jud', 'jude']],
  ['REV', 'REV', 'Revelation', ['rev', 're', 'rv', 'revelations', 'apocalypse']],
];

// Extra Tamil spellings people commonly type, on top of the names in the IRV headers.
const TA_EXTRA = {
  PSA: ['சங்கீதம்'],
  LAM: ['புலம்பல்கள்'],
  ACT: ['அப்போஸ்தலர்', 'அப்போஸ்தலரின் நடபடிகள்', 'நடபடிகள்'],
  REV: ['வெளிப்படுத்துதல்', 'வெளிப்படுத்தல்'],
  SNG: ['உன்னதப்பாட்டு', 'உன்னதபாட்டு'],
};

/** Lowercase, drop spaces/dots/hyphens/ZWNJ so "1 Cor.", "1cor" and "1  COR" compare equal. */
export function aliasKey(s) {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[\s.\-‌‍_]/g, '');
}

export const BOOKS = RAW.map(([vpl, usfm, en, aliases], i) => {
  const ta = TA[usfm];
  if (!ta) throw new Error(`No Tamil name for ${usfm}`);
  const id = i + 1;
  const testament = id <= 39 ? 'OT' : 'NT';
  const enAliases = [en, vpl, usfm, ...aliases];
  const taAliases = [ta.full, ta.long, ta.short, ...(TA_EXTRA[usfm] ?? [])];
  return { id, vpl, usfm, testament, en, ta: ta.full, enAliases, taAliases };
});

export const BOOK_BY_VPL = new Map(BOOKS.map((b) => [b.vpl, b]));
export const BOOK_BY_ID = new Map(BOOKS.map((b) => [b.id, b]));

/** alias key -> book id. Built once; ambiguous aliases throw so we notice at build time. */
export const ALIAS_INDEX = (() => {
  const m = new Map();
  for (const b of BOOKS) {
    for (const a of [...b.enAliases, ...b.taAliases]) {
      const k = aliasKey(a);
      if (!k) continue;
      if (m.has(k) && m.get(k) !== b.id) {
        throw new Error(`Ambiguous book alias "${a}" (${k}): books ${m.get(k)} and ${b.id}`);
      }
      m.set(k, b.id);
    }
  }
  return m;
})();

// ref id = book * 1_000_000 + chapter * 1_000 + verse  (e.g. John 3:16 -> 43003016)
export const refId = (book, chapter, verse) => book * 1_000_000 + chapter * 1_000 + verse;
export const splitRef = (ref) => ({
  book: Math.floor(ref / 1_000_000),
  chapter: Math.floor((ref % 1_000_000) / 1_000),
  verse: ref % 1_000,
});
