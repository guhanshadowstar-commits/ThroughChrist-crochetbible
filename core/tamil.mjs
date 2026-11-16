// Tamil text helpers for search.
//
// Problem: SQLite's FTS5 `unicode61` tokenizer treats combining marks (Tamil vowel signs
// and the pulli) as separators, so it chops "அன்பு" into fragments and gives false matches.
// Fix: before indexing/querying we map those combining marks into the Private Use Area
// (category Co), which unicode61 treats as ordinary letters. The mapping is symmetric, so
// it is applied identically to indexed text and to queries. The stored verse text is
// never changed.
//
// Two indexes are built from this:
//   1. "script" index - exact Tamil letters (PUA-mapped). Used for Tamil-script queries.
//   2. "phonetic" index - a lossy ASCII sound key. Lets people type Tamil in English letters
//      ("anbu" finds அன்பு, "thevan" finds தேவன்).

const PULLI = 0x0bcd;

/** Tamil combining marks (category Mc/Mn): anusvara, vowel signs, pulli, au length mark. */
const isTamilMark = (cp) =>
  cp === 0x0b82 || (cp >= 0x0bbe && cp <= 0x0bcd) || cp === 0x0bd7;

const PUA_OFFSET = 0xe000 - 0x0b00; // U+0Bxx -> U+E0xx

export const isTamilChar = (cp) => cp >= 0x0b80 && cp <= 0x0bff;
export const hasTamil = (s) => /[஀-௿]/u.test(s);

/**
 * Normalise Tamil text for indexing: NFC, drop ZWJ/ZWNJ, lowercase any Latin,
 * then PUA-map combining marks. Punctuation is left for the tokenizer to split on.
 */
export function tamilScriptForm(text) {
  const s = text.normalize('NFC').replace(/[‌‍]/g, '').toLowerCase();
  let out = '';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    out += isTamilMark(cp) ? String.fromCodePoint(cp + PUA_OFFSET) : ch;
  }
  return out;
}

/** Split a user query into script tokens (PUA-mapped), keeping letters/digits only. */
export function tamilTokens(query) {
  return tamilScriptForm(query)
    .split(/[^\p{L}\p{N}\p{Co}]+/u)
    .filter(Boolean);
}

/**
 * Tamil is agglutinative: அன்பு / அன்பை / அன்புக்கு / அன்பினால் share a stem.
 * Dropping the final vowel sign or pulli and prefix-matching catches most inflections
 * ("அன்ப*", "தேவன*") without pulling in unrelated words.
 */
export function stemToken(token) {
  const chars = [...token];
  const last = chars[chars.length - 1]?.codePointAt(0);
  if (chars.length > 2 && last >= 0xe000 && last <= 0xe0ff) chars.pop();
  return chars.join('');
}

// ---------------------------------------------------------------------------
// Phonetic key (for "Tanglish" input). Lossy on purpose: Tamil script has no
// voiced/voiceless split and people type both ("thevan" / "devan").
// ---------------------------------------------------------------------------

const VOWELS = {
  அ: 'a', ஆ: 'a', இ: 'i', ஈ: 'i', உ: 'u', ஊ: 'u', எ: 'e', ஏ: 'e',
  ஐ: 'ai', ஒ: 'o', ஓ: 'o', ஔ: 'au',
};
const CONSONANTS = {
  க: 'k', ங: 'n', ச: 's', ஞ: 'n', ட: 't', ண: 'n', த: 't', ந: 'n',
  ப: 'p', ம: 'm', ய: 'y', ர: 'r', ல: 'l', வ: 'v', ழ: 'l', ள: 'l',
  ற: 'r', ன: 'n', ஜ: 'j', ஷ: 's', ஸ: 's', ஹ: 'h',
};
const SIGNS = {
  'ா': 'a', 'ி': 'i', 'ீ': 'i', 'ு': 'u', 'ூ': 'u', 'ெ': 'e', 'ே': 'e',
  'ை': 'ai', 'ொ': 'o', 'ோ': 'o', 'ௌ': 'au', 'ௗ': 'au',
};

const collapseRepeats = (s) => s.replace(/(.)\1+/g, '$1');

/** Sound key for one Tamil-script word, e.g. அன்பு -> "anpu", தேவன் -> "tevan". */
export function tamilWordToPhonetic(word) {
  const s = word.normalize('NFC').replace(/[‌‍]/g, '');
  let out = '';
  let inherent = false; // true when the last thing written was a consonant + its inherent "a"
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (ch in CONSONANTS) {
      out += CONSONANTS[ch] + 'a';
      inherent = true;
    } else if (ch in VOWELS) {
      out += VOWELS[ch];
      inherent = false;
    } else if (ch in SIGNS) {
      if (inherent) out = out.slice(0, -1);
      out += SIGNS[ch];
      inherent = false;
    } else if (cp === PULLI) {
      if (inherent) out = out.slice(0, -1);
      inherent = false;
    } else if (ch === 'ஃ') { // aytham
      out += 'h';
      inherent = false;
    } else if (ch === 'ஂ') { // anusvara
      out += 'm';
      inherent = false;
    } else if (/[a-z0-9]/i.test(ch)) {
      out += ch.toLowerCase();
      inherent = false;
    } else {
      inherent = false;
    }
  }
  return collapseRepeats(out);
}

/**
 * Sound key for a word typed in English letters. Mirrors the Tamil-side folding:
 * voiced and voiceless collapse (g/k, d/t, b/p), th/dh -> t, ch/sh -> s, zh -> l, w -> v,
 * long vowels shorten (aa -> a, ee -> i, oo -> u).
 */
export function latinWordToPhonetic(word) {
  let s = word.toLowerCase().replace(/[^a-z]/g, '');
  s = s
    .replace(/zh/g, 'l')
    .replace(/(?:th|dh)/g, 't')
    .replace(/(?:sch|ch|sh)/g, 's')
    .replace(/(?:ph|bh)/g, 'p')
    .replace(/(?:kh|gh)/g, 'k')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/ou/g, 'au')
    .replace(/ay/g, 'ai')
    .replace(/[gq]/g, 'k')
    .replace(/[bf]/g, 'p')
    .replace(/d/g, 't')
    .replace(/c/g, 's')
    .replace(/w/g, 'v')
    .replace(/z/g, 'l')
    .replace(/x/g, 'ks');
  return collapseRepeats(s);
}

/** Index form of a whole Tamil verse: space-separated phonetic words. */
export function tamilPhoneticForm(text) {
  return text
    .normalize('NFC')
    .split(/[^\p{L}\p{M}\p{N}‌‍]+/u)
    .map(tamilWordToPhonetic)
    .filter(Boolean)
    .join(' ');
}

/** Prefix stem for a phonetic key: drop trailing vowels so "anpu" and "anpai" meet at "anp". */
export function stemPhonetic(key) {
  const trimmed = key.replace(/[aeiou]+$/, '');
  return trimmed.length >= 2 ? trimmed : key;
}
