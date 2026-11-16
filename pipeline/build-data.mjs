// Builds the app's data files from the raw eBible texts:
//   dist/data/core.db        books, versions (with licenses), chapter sizes, canonical verse list
//   dist/data/<version>.db   one shard per version: verse texts + full-text indexes
//   dist/data/manifest.json  file list with sizes (the app reads this first)
//   node pipeline/build-data.mjs
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { BOOKS } from '../core/books.mjs';
import { VERSIONS } from './versions.mjs';
import { tamilScriptForm, tamilPhoneticForm } from '../core/tamil.mjs';
import { englishIndexForm } from '../core/english.mjs';
import { parseVpl } from './vpl.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_DIR = path.join(ROOT, 'data', 'raw');
export const DATA_DIR = path.join(ROOT, 'dist', 'data');

const fresh = (file) => {
  for (const suffix of ['', '-wal', '-shm', '-journal']) rmSync(file + suffix, { force: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF; PRAGMA page_size = 4096;');
  return db;
};

function buildShard(version, rows) {
  const file = path.join(DATA_DIR, `${version.id}.db`);
  const db = fresh(file);
  const isEn = version.lang === 'en';
  db.exec(`
    CREATE TABLE texts (ref INTEGER PRIMARY KEY, text TEXT NOT NULL) WITHOUT ROWID;
    -- Contentless full-text indexes; rowid = verse ref, text is read from "texts".
    CREATE VIRTUAL TABLE fts USING fts5(t, content='', tokenize='${isEn ? 'porter unicode61 remove_diacritics 2' : 'unicode61'}');
    ${isEn ? '' : "CREATE VIRTUAL TABLE fts_ph USING fts5(t, content='', tokenize='unicode61');"}
  `);
  const insText = db.prepare('INSERT INTO texts VALUES (?,?)');
  const insFts = db.prepare('INSERT INTO fts (rowid, t) VALUES (?,?)');
  const insPh = isEn ? null : db.prepare('INSERT INTO fts_ph (rowid, t) VALUES (?,?)');
  db.exec('BEGIN');
  for (const { ref, text } of rows) {
    insText.run(ref, text);
    if (isEn) {
      insFts.run(ref, englishIndexForm(text));
    } else {
      insFts.run(ref, tamilScriptForm(text));       // exact Tamil letters (combining marks protected)
      insPh.run(ref, tamilPhoneticForm(text));      // sound key for typing Tamil in English letters
    }
  }
  db.exec('COMMIT');
  db.exec(`INSERT INTO fts(fts) VALUES ('optimize')`);
  if (!isEn) db.exec(`INSERT INTO fts_ph(fts_ph) VALUES ('optimize')`);
  db.exec('VACUUM');
  db.close();
  return file;
}

export function build() {
  mkdirSync(DATA_DIR, { recursive: true });
  for (const f of readdirSync(DATA_DIR)) if (/\.db$/.test(f)) rmSync(path.join(DATA_DIR, f));

  // Parse everything first: the canonical verse list is the union over all versions.
  const parsed = VERSIONS.map((v) => {
    const file = path.join(RAW_DIR, v.source, `${v.source}_vpl.txt`);
    if (!existsSync(file)) throw new Error(`Missing ${file} - run "npm run fetch" first.`);
    const all = parseVpl(file, { stripMarkup: v.stripMarkup }).rows;
    const rows = all.filter((r) => r.text);
    return { v, rows, blank: all.length - rows.length }; // blank = verses this translation omits
  });
  const allRefs = [...new Set(parsed.flatMap((p) => p.rows.map((r) => r.ref)))].sort((a, b) => a - b);

  // ---- core.db ----
  const core = fresh(path.join(DATA_DIR, 'core.db'));
  core.exec(`
    CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID;
    CREATE TABLE books (
      id INTEGER PRIMARY KEY, usfm TEXT NOT NULL UNIQUE, testament TEXT NOT NULL,
      en_name TEXT NOT NULL, ta_name TEXT NOT NULL, chapters INTEGER NOT NULL
    );
    CREATE TABLE versions (
      id TEXT PRIMARY KEY, lang TEXT NOT NULL, abbr TEXT NOT NULL, name TEXT NOT NULL,
      license TEXT NOT NULL, attribution TEXT NOT NULL, source_url TEXT NOT NULL, notes TEXT NOT NULL,
      is_default INTEGER NOT NULL, sort INTEGER NOT NULL, verse_count INTEGER NOT NULL
    );
    -- ref = book*1000000 + chapter*1000 + verse (John 3:16 = 43003016); art is keyed on the same id.
    CREATE TABLE verses (ref INTEGER PRIMARY KEY, book INTEGER NOT NULL, chapter INTEGER NOT NULL, verse INTEGER NOT NULL);
    CREATE TABLE chapters (book INTEGER NOT NULL, chapter INTEGER NOT NULL, verses INTEGER NOT NULL, PRIMARY KEY (book, chapter)) WITHOUT ROWID;
  `);
  core.exec('BEGIN');
  const insVerse = core.prepare('INSERT INTO verses VALUES (?,?,?,?)');
  for (const ref of allRefs) insVerse.run(ref, Math.floor(ref / 1e6), Math.floor((ref % 1e6) / 1e3), ref % 1e3);
  core.exec('INSERT INTO chapters SELECT book, chapter, MAX(verse) FROM verses GROUP BY book, chapter');
  const insBook = core.prepare('INSERT INTO books VALUES (?,?,?,?,?,0)');
  for (const b of BOOKS) insBook.run(b.id, b.usfm, b.testament, b.en, b.ta);
  core.exec('UPDATE books SET chapters = (SELECT COUNT(*) FROM chapters c WHERE c.book = books.id)');
  const insVersion = core.prepare('INSERT INTO versions VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  parsed.forEach(({ v, rows }, i) => insVersion.run(
    v.id, v.lang, v.abbr, v.name, v.license, v.attribution,
    `https://ebible.org/${v.source}/`, v.notes, v.default ? 1 : 0, i, rows.length,
  ));
  const setMeta = core.prepare('INSERT INTO meta VALUES (?,?)');
  setMeta.run('schema_version', '2');
  setMeta.run('built_at', new Date().toISOString());
  setMeta.run('ref_id_format', 'book*1000000 + chapter*1000 + verse');
  core.exec('COMMIT');
  core.exec('VACUUM');
  core.close();

  // ---- shards ----
  const report = [];
  for (const { v, rows, blank } of parsed) {
    buildShard(v, rows);
    report.push({ id: v.id, verses: rows.length, blank });
  }

  // ---- manifest ----
  const sizeOf = (f) => {
    const file = path.join(DATA_DIR, f);
    return { file: f, bytes: statSync(file).size, gzipBytes: gzipSync(readFileSync(file), { level: 6 }).length };
  };
  const manifest = {
    schema: 2,
    builtAt: new Date().toISOString(),
    core: sizeOf('core.db'),
    versions: VERSIONS.map((v) => ({ id: v.id, lang: v.lang, ...sizeOf(`${v.id}.db`) })),
  };
  writeFileSync(path.join(DATA_DIR, 'manifest.json'), JSON.stringify(manifest, null, 1));

  const mb = (n) => (n / 1048576).toFixed(1);
  console.log(`Built ${DATA_DIR}: ${allRefs.length} canonical verses`);
  console.table(manifest.versions.map((s) => ({ id: s.id, 'MB': mb(s.bytes), 'MB gzipped': mb(s.gzipBytes) })));
  console.log(`core.db ${mb(manifest.core.bytes)} MB (${mb(manifest.core.gzipBytes)} MB gzipped)`);
  console.table(report);
  return { manifest, report };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build();
