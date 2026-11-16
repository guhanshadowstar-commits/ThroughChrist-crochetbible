// English text helpers for search. Applied identically to indexed verses and to queries,
// so "believeth" (KJV) and "believe" / "believes" (WEB) land on the same index term.
import { ARCHAIC_FORMS as FORMS } from './archaic.gen.mjs';

/** Split into lowercase words; apostrophes are dropped ("God's" -> "gods" is avoided: it becomes "god" + "s"). */
export const englishWords = (s) =>
  s.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Fold one word: "loveth" -> "love". Words not in the generated map are returned as-is. */
export const foldArchaic = (w) => FORMS[w] ?? w;

/** The string actually given to FTS5 for an English verse (display text is stored separately). */
export const englishIndexForm = (text) => englishWords(text).map(foldArchaic).join(' ');
