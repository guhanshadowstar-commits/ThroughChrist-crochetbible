// Reader for the eBible.org "verse per line" files:  GEN 1:1 In the beginning...
import { readFileSync } from 'node:fs';
import { BOOK_BY_VPL, refId } from '../core/books.mjs';

const LINE = /^([1-3A-Z][A-Za-z0-9]{2}) (\d+):(\d+) ?(.*)$/;

/** English sources carry paragraph marks and [supplied-word] brackets; they are not Bible text. */
export const cleanEnglish = (t) => t.replace(/¶/g, ' ').replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim();
/** Tamil text is kept exactly as published (CC BY-SA: no changes). */
export const cleanTamil = (t) => t.trim();

export function parseVpl(file, { stripMarkup }) {
  const rows = [];
  let skippedBooks = 0;
  for (const line of readFileSync(file, 'utf8').replace(/^﻿/, '').split('\n')) {
    if (!line.trim()) continue;
    const m = LINE.exec(line);
    if (!m) throw new Error(`Unparseable line in ${file}: ${line.slice(0, 80)}`);
    const book = BOOK_BY_VPL.get(m[1]);
    if (!book) { skippedBooks++; continue; } // deuterocanon etc. is not in the 66-book canon
    const text = stripMarkup ? cleanEnglish(m[4]) : cleanTamil(m[4]);
    rows.push({ ref: refId(book.id, +m[2], +m[3]), text });
  }
  return { rows, skippedBooks };
}
