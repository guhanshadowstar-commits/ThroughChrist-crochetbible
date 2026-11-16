// The Bible database API, shared by Node (CLI, tests, dev server) and the browser app.
//
// Data lives in small files: core.db (books, versions, chapter sizes) plus one shard per
// version (verse texts + full-text indexes). A shard is only needed once a person picks that
// version, so the app downloads versions on demand.
//
// A "db" here is any object with:  all(sql, params?) -> Array<plain row objects>
// (the Node build wraps node:sqlite, the browser wraps SQLite compiled to WebAssembly).
import { BOOK_BY_ID, refId, splitRef } from './books.mjs';
import { parseReference, formatReference } from './reference.mjs';
import { planQuery } from './query.mjs';

export const DEFAULT_VERSION = { en: 'en-web', ta: 'ta-irv' };

/** Most verses one shard contributes to a single search (very common words hit tens of thousands). */
const HIT_CAP = 4000;

export class Bible {
  /** @param {{all:Function}} core the core.db adapter */
  constructor(core) {
    this.core = core;
    this._versions = core.all('SELECT * FROM versions ORDER BY sort');
    this._lang = Object.fromEntries(this._versions.map((v) => [v.id, v.lang]));
    this.shards = new Map(); // version id -> db
    this._bookChapters = new Map(core.all('SELECT id, chapters FROM books').map((b) => [b.id, b.chapters]));
    this._chapters = new Map(
      core.all('SELECT book, chapter, verses FROM chapters').map((c) => [c.book * 1000 + c.chapter, c.verses]),
    );
  }

  addShard(versionId, db) {
    if (!(versionId in this._lang)) throw new Error(`Unknown version ${versionId}`);
    this.shards.set(versionId, db);
  }
  removeShard(versionId) { this.shards.delete(versionId); }
  hasShard(versionId) { return this.shards.has(versionId); }
  loaded(lang = null) {
    return [...this.shards.keys()].filter((id) => !lang || this._lang[id] === lang);
  }

  versions() { return this._versions; }
  books() { return this.core.all('SELECT * FROM books ORDER BY id'); }
  chapterCount(book) { return this._bookChapters.get(book) ?? 0; }
  chapterVerseCount(book, chapter) { return this._chapters.get(book * 1000 + chapter) ?? 0; }
  /** Every verse ref that exists in at least one bundled version, in canonical order. */
  allRefs() { return this.core.all('SELECT ref FROM verses ORDER BY ref').map((r) => r.ref); }

  /** Verse texts for the given refs in the given (loaded) versions: Map<ref, {versionId: text}>. */
  textsFor(refs, versions) {
    const out = new Map(refs.map((r) => [r, {}]));
    if (!refs.length) return out;
    const marks = refs.map(() => '?').join(',');
    for (const id of versions) {
      const db = this.shards.get(id);
      if (!db) continue;
      for (const r of db.all(`SELECT ref, text FROM texts WHERE ref IN (${marks})`, refs)) out.get(r.ref)[id] = r.text;
    }
    return out;
  }

  _decorate(ref, extra = {}) {
    const s = splitRef(ref);
    const b = BOOK_BY_ID.get(s.book);
    return {
      ref, ...s,
      bookName: { en: b.en, ta: b.ta },
      label: { en: formatReference(s, 'en'), ta: formatReference(s, 'ta') },
      ...extra,
    };
  }

  /** All verses of one chapter, with the requested versions' texts. */
  chapter(book, chapter, show) {
    const last = this.chapterVerseCount(book, chapter);
    const refs = Array.from({ length: last }, (_, i) => refId(book, chapter, i + 1));
    const texts = this.textsFor(refs, show);
    return refs
      .map((ref, i) => ({ ref, verse: i + 1, texts: texts.get(ref) }))
      .filter((v) => Object.keys(v.texts).length);
  }

  /**
   * Look up a typed reference ("John 3:16", "Gen 1", "யோவான் 3:16").
   * @returns {null | {error:string} | {reference, verses:Array}} null = not a reference.
   */
  lookup(input, { show = Object.values(DEFAULT_VERSION) } = {}) {
    const p = parseReference(input);
    if (!p) return null;
    const b = BOOK_BY_ID.get(p.book);
    const chapter = p.chapter ?? 1;
    const chapterCount = this._bookChapters.get(p.book);
    if (chapter < 1 || chapter > chapterCount) {
      return { error: `${b.en} has ${chapterCount} chapters (you asked for ${chapter}).` };
    }
    const last = this.chapterVerseCount(p.book, chapter);
    const from = p.verseStart ?? 1;
    const to = Math.min(p.verseEnd ?? last, last);
    if (from > last) return { error: `${b.en} ${chapter} has ${last} verses (you asked for ${from}).` };
    const refs = [];
    for (let v = from; v <= to; v++) refs.push(refId(p.book, chapter, v));
    const texts = this.textsFor(refs, show);
    const verses = refs
      .filter((r) => Object.keys(texts.get(r)).length)
      .map((r) => this._decorate(r, { texts: texts.get(r) }));
    const parts = { book: p.book, chapter, verse: p.verseStart, verseEnd: p.verseEnd };
    return {
      reference: {
        ...p, chapter,
        label: { en: formatReference(parts, 'en'), ta: formatReference(parts, 'ta') },
      },
      verses,
    };
  }

  /**
   * Keyword search across the loaded versions.
   * @param {string} query
   * @param {object} [o]
   * @param {'all'|'en'|'ta'} [o.lang='all']
   * @param {string[]} [o.versions]   restrict to these version ids
   * @param {string[]} [o.show]       versions whose text to return for each hit
   * @param {boolean} [o.any=false]   OR instead of AND between words
   * @param {boolean} [o.tanglish=false] also match Tamil typed in English letters
   * @param {[number, number]} [o.range] only verses with lo <= ref <= hi (e.g. one book or a testament)
   * @returns {{query, plans, total, truncated, results}}
   */
  search(query, o = {}) {
    const {
      lang = 'all', versions = null, show = Object.values(DEFAULT_VERSION),
      any = false, tanglish = false, limit = 20, offset = 0, range = null,
    } = o;
    const plans = planQuery(query, { lang, any, tanglish });
    if (!plans.length) return { query, plans: [], total: 0, truncated: false, results: [] };

    const merged = new Map(); // ref -> {score, matched:Set<versionId>}
    let truncated = false;
    for (const plan of plans) {
      for (const id of this.loaded(plan.lang)) {
        if (versions && !versions.includes(id)) continue;
        const rows = this.shards.get(id).all(
          `SELECT rowid AS ref, bm25(${plan.table}) AS score FROM ${plan.table}
           WHERE ${plan.table} MATCH ?${range ? ' AND rowid BETWEEN ? AND ?' : ''} ORDER BY score LIMIT ?`,
          range ? [plan.match, range[0], range[1], HIT_CAP] : [plan.match, HIT_CAP],
        );
        if (rows.length === HIT_CAP) truncated = true;
        for (const r of rows) {
          const cur = merged.get(r.ref) ?? { score: r.score, matched: new Set() };
          cur.score = Math.min(cur.score, r.score);
          cur.matched.add(id);
          merged.set(r.ref, cur);
        }
      }
    }

    const ordered = [...merged.entries()]
      .sort((a, b) => a[1].score - b[1].score || a[0] - b[0])
      .slice(offset, offset + limit);
    const refs = ordered.map(([ref]) => ref);
    const texts = this.textsFor(refs, [...new Set([...show, ...ordered.flatMap(([, v]) => [...v.matched])])]);
    const results = ordered.map(([ref, v]) =>
      this._decorate(ref, { score: v.score, matchedVersions: [...v.matched].sort(), texts: texts.get(ref) }));
    return {
      query,
      plans: plans.map(({ table, script, match }) => ({ table, script, match })),
      total: merged.size, truncated, results,
    };
  }
}
