// Turns what a person types into FTS5 MATCH strings. Pure functions, no database access,
// so the exact same code runs in Node (tests, build) and in the browser.
import {
  hasTamil, tamilTokens, stemToken, latinWordToPhonetic, stemPhonetic,
} from './tamil.mjs';
import { englishWords, foldArchaic } from './english.mjs';

/**
 * Query syntax (all optional):  "exact phrase"   -excluded   prefix*
 * @returns {{positive:Array<{text:string,phrase:boolean,prefix:boolean}>, negative:Array<...>}}
 */
export function parseQuery(q) {
  const positive = [];
  const negative = [];
  const re = /(-?)"([^"]*)"|(-?)(\S+)/gu;
  let m;
  while ((m = re.exec(q)) !== null) {
    const neg = (m[1] || m[3]) === '-';
    const raw = m[2] ?? m[4];
    const phrase = m[2] !== undefined;
    const prefix = !phrase && raw.endsWith('*');
    const text = raw.replace(/\*$/, '');
    if (!text.trim()) continue;
    (neg ? negative : positive).push({ text, phrase, prefix });
  }
  return { positive, negative };
}

const fts = (s) => `"${s.replace(/"/g, '""')}"`;

/** Turn parsed items into an FTS5 MATCH string. `wordsOf` tokenises a term, `stem` shortens it for prefix matching. */
function buildMatch(parsed, { any, wordsOf, stem }) {
  const item = (it) => {
    const words = wordsOf(it.text);
    if (!words.length) return null;
    if (it.phrase) return fts(words.join(' '));
    if (words.length > 1) return `(${words.map((w) => fts(w)).join(' AND ')})`;
    const w = words[0];
    if (it.prefix) return `${fts(w)}*`;
    return stem ? `${fts(stem(w))}*` : fts(w);
  };
  const pos = parsed.positive.map(item).filter(Boolean);
  const neg = parsed.negative.map(item).filter(Boolean);
  if (!pos.length) return null;
  let match = pos.length > 1 ? `(${pos.join(any ? ' OR ' : ' AND ')})` : pos[0];
  if (neg.length) match = `${match} NOT (${neg.join(' OR ')})`;
  return match;
}

const englishQueryWords = (s) => englishWords(s).map(foldArchaic);
const phoneticWords = (s) => s.split(/[^A-Za-z]+/).map(latinWordToPhonetic).filter(Boolean);

/**
 * Decide which indexes to query for this input.
 * @returns {Array<{table:'fts'|'fts_ph', lang:'en'|'ta', match:string, script:string}>}
 */
export function planQuery(query, { lang = 'all', any = false, tanglish = false } = {}) {
  const parsed = parseQuery(query ?? '');
  const plans = [];
  if (hasTamil(query ?? '')) {
    const match = buildMatch(parsed, { any, wordsOf: tamilTokens, stem: stemToken });
    if (match) plans.push({ table: 'fts', lang: 'ta', match, script: 'tamil' });
    return plans;
  }
  if (lang === 'all' || lang === 'en') {
    const match = buildMatch(parsed, { any, wordsOf: englishQueryWords });
    if (match) plans.push({ table: 'fts', lang: 'en', match, script: 'latin' });
  }
  if (lang === 'ta' || tanglish) {
    const match = buildMatch(parsed, { any, wordsOf: phoneticWords, stem: stemPhonetic });
    if (match) plans.push({ table: 'fts_ph', lang: 'ta', match, script: 'latin-phonetic' });
  }
  return plans;
}

/** Regex that highlights the searched words inside a verse (CLI and UI). */
export function highlightRegex(query) {
  const parsed = parseQuery(query);
  const words = [];
  for (const it of parsed.positive) {
    if (hasTamil(it.text)) {
      for (const tok of tamilTokens(it.text)) {
        const stem = [...stemToken(tok)].map((c) => {
          const cp = c.codePointAt(0);
          return cp >= 0xe000 && cp <= 0xe0ff ? String.fromCodePoint(cp - (0xe000 - 0x0b00)) : c;
        }).join('');
        words.push(stem);
      }
    } else {
      for (const w of englishWords(it.text)) {
        const base = foldArchaic(w); // "believeth" -> "believe", so the highlight still finds "believes"
        words.push(base.length > 4 ? base.replace(/(ing|ed|es|e|s)$/, '') : base);
      }
    }
  }
  if (!words.length) return null;
  const esc = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`(${esc.join('|')})[\\p{L}\\p{M}]*`, 'giu');
}
