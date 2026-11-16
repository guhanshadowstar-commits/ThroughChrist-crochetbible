// Parses typed Bible references such as "John 3:16", "1 Cor 13", "Gen 1:1-3",
// "யோவான் 3:16" or "II Kings 5.14" into { book, chapter, verseStart, verseEnd }.
import { ALIAS_INDEX, BOOK_BY_ID, aliasKey } from './books.mjs';

const ROMAN = { i: '1', ii: '2', iii: '3' };
const ORDINAL = { first: '1', '1st': '1', second: '2', '2nd': '2', third: '3', '3rd': '3' };

/** "II Kings" / "First John" / "1st John" -> "2 Kings" / "1 John" / "1 John". */
function normalizeBookName(name) {
  const m = /^(\S+)\s+(.+)$/u.exec(name.trim());
  if (!m) return name;
  const head = m[1].toLowerCase().replace(/\.$/, '');
  const num = ROMAN[head] ?? ORDINAL[head];
  return num ? `${num} ${m[2]}` : name;
}

// <book name> <chapter> [ (: | . | space) <verse> [ - <end verse> ] ]
const REF = /^\s*(.+?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?)?\s*$/u;
const BOOK_ONLY = /^\s*(.+?)\s*$/u;

/**
 * @returns {{book:number, chapter:number|null, verseStart:number|null, verseEnd:number|null}|null}
 *   null when the text is not a recognisable reference. Numbers are NOT range-checked here.
 */
export function parseReference(input) {
  if (!input || !input.trim()) return null;
  let m = REF.exec(input);
  if (m) {
    const book = ALIAS_INDEX.get(aliasKey(normalizeBookName(m[1])));
    if (book) {
      const chapter = +m[2];
      const verseStart = m[3] ? +m[3] : null;
      const verseEnd = m[4] ? +m[4] : verseStart;
      if (verseStart !== null && verseEnd < verseStart) return null;
      return { book, chapter, verseStart, verseEnd };
    }
  }
  m = BOOK_ONLY.exec(input);
  const book = m && ALIAS_INDEX.get(aliasKey(normalizeBookName(m[1])));
  return book ? { book, chapter: null, verseStart: null, verseEnd: null } : null;
}

export function formatReference({ book, chapter, verse, verseEnd }, lang = 'en') {
  const b = BOOK_BY_ID.get(book);
  const name = lang === 'ta' ? b.ta : b.en;
  let s = name;
  if (chapter) s += ` ${chapter}`;
  if (verse) s += `:${verse}`;
  if (verse && verseEnd && verseEnd !== verse) s += `-${verseEnd}`;
  return s;
}
