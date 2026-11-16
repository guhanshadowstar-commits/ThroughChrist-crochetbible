# Architecture

How Crochet Bible is put together, what each part uses, and where each thing happens.

## The idea in one paragraph

The Bible texts are downloaded once and turned into small database files. A web app, which is only static files
(HTML, CSS, JavaScript), downloads the databases it needs into the visitor's browser and opens them with SQLite
(compiled to WebAssembly). Search and reading therefore happen **on the device**, with no server, and keep working offline.
Every verse also has a small description of its picture; the browser draws that picture as crochet, stitch by stitch.

## Three stages

```
 STAGE 1: BUILD (Node, on a computer or in GitHub Actions)
 ─────────────────────────────────────────────────────────
  eBible.org ──fetch-sources──▶ data/raw/<text>/…_vpl.txt      (11 Bible texts, never edited)
                                       │
                                  vpl.mjs  (parse "GEN 1:1 In the beginning…")
                                       │
                                  build-data.mjs ──▶ dist/data/core.db        books, versions, licenses, chapter sizes
                                                     dist/data/<version>.db   verse text + full-text indexes (11 files)
                                                     dist/data/manifest.json  file list, sizes, build time
                                       │
                                  build-art.mjs  (reads 4 English versions, core/art/spec.mjs)
                                       └──────────▶ dist/data/art.bin         6 numbers per verse: its picture
                                       │
                                  export-web.mjs ──▶ dist/web/   (web/ + core/ + sqlite wasm + data)  = the whole site

 STAGE 2: HOSTING (GitHub)
 ─────────────────────────
  git push to main ──▶ .github/workflows/pages.yml: fetch → build → test → export → deploy
                       └──▶ https://guhanshadowstar-commits.github.io/ThroughChrist-crochetbible/

 STAGE 3: THE APP (in the visitor's browser)
 ───────────────────────────────────────────
  index.html ─▶ js/app.mjs ─▶ data.mjs ─▶ SQLite WebAssembly opens core.db, art.bin and each chosen <version>.db
                           └▶ views.mjs  Home · Reader · Verse · Search · Saved · Settings
                              ├─ core/bible.mjs      reading and search (same file the build tests use)
                              ├─ core/art/*          picture from the verse's description
                              ├─ js/crochet.mjs      draws and animates the stitches
                              └─ js/store.mjs        stars, highlights, notes, settings (localStorage)
  sw.js keeps the app files and the downloaded versions for offline use.
```

## What is used

| Need | Used | Why |
|---|---|---|
| Runtime for building and testing | **Node 24** (`node:sqlite`, `node:test`, `node:zlib`, `fetch`) | Built-in SQLite with full-text search and a test runner: no extra build tools |
| Database in the browser | **`@sqlite.org/sqlite-wasm`** (official SQLite build, includes FTS5) | Runs the same SQL as the build; `sql.js` was tried and lacks FTS5 |
| Full-text search | **SQLite FTS5** (Porter stemmer, unicode61 tokenizer, BM25 ranking) | Fast, offline, runs on the device |
| Bible texts | **eBible.org** verse-per-line files | Open licenses, one consistent format |
| Offline | **Service worker + Cache API** | Keeps app files and downloaded versions |
| Drawing | **HTML canvas 2D** | Every stitch is drawn from a small cached tile |
| Hosting and publishing | **GitHub Pages + GitHub Actions**, pushed with **GitHub Desktop** | Free static hosting; the build and tests run on every push |
| Framework | none | Plain ES modules; a 40-line `h()` helper builds the DOM |

Only one npm dependency is installed (`@sqlite.org/sqlite-wasm`).

## The data files

**Verse reference id.** `book*1,000,000 + chapter*1,000 + verse`, so John 3:16 is `43003016`. Books are numbered 1 to 66
in Protestant order. The same id keys the texts, the search indexes, the pictures, saved verses, highlights and notes,
so a picture or a note belongs to the verse, not to one translation.

**`core.db`** (about 0.5 MB): `books` (names in both languages, chapter counts), `versions` (name, license, credit line, notes,
verse count), `verses` (every verse that exists in any version: 31,133), `chapters` (highest verse per chapter), `meta`.

**`<version>.db`** (English about 7 MB, Tamil 20 to 21 MB; about 3 and 6 MB gzipped): `texts(ref, text)` plus contentless FTS5 tables
whose rowid is the verse id. English has one index `fts`. Tamil has two: `fts` (Tamil script, with vowel signs protected)
and `fts_ph` (a sound key, for Tamil typed in English letters).

**`art.bin`** (304 KB; 165 KB gzipped): header `CRO1`, the verse count, every verse id (4 bytes), then 6 bytes per verse:
setting, hour, mood, main figure, extra figure 1, extra figure 2.

**`manifest.json`**: file names with sizes (plain and gzipped) and the build time `builtAt`. The app reads it first, and
adds `?v=<builtAt>` to every data address so a new build is downloaded while old offline copies are dropped.

## How search works

1. `views.mjs` (search screen) takes the typed text. A reference with a chapter ("John 3:16", "யோவான் 3") opens the passage;
   anything else is a keyword search. A bare book name ("Job") is still a search, with an "Open book" shortcut.
2. `core/query.mjs` parses `"phrases"`, `-excluded`, `prefix*`, and builds quoted FTS5 queries (user text can never break the syntax).
3. `core/bible.mjs` runs the query on the full-text index of each shown version, keeps up to 4,000 hits per version,
   merges by verse (one verse found in three versions counts once, with the best score), sorts by BM25 and pages the result.
   A scope (`core/scope.mjs`) adds `rowid BETWEEN lo AND hi` to limit it to a testament or one book.
4. The screen shows each hit in the shown versions with the searched words marked (`highlightRegex`) and the verse's picture as a thumbnail.

**English.** Verses are indexed as lower-case words after folding old-English verb forms (`core/english.mjs`, map in
`core/archaic.gen.mjs`), then SQLite's Porter stemmer. A query goes through exactly the same steps, so "believe" finds the KJV's "believeth".

**Tamil.** SQLite's tokenizer would split a Tamil word at every vowel sign, so those marks are replaced by private-use
characters in the index only (`core/tamil.mjs`); the stored verse is never changed. A query drops the final vowel sign or pulli and
matches as a prefix, so one stem finds inflected forms. **Tamil typed in English letters** ("anbu", "thevan", "devan") is turned into a sound key
that is also computed for every Tamil word (`fts_ph`).

## How a verse gets its picture

1. **Describe** (build time, `core/art/spec.mjs` + `core/art/concepts.mjs`): the verse in KJV, WEB, ASV and BSB is split into words;
   words are matched against weighted lists for about 70 figures, 12 settings, hours and moods. The best figure becomes the main one,
   the next two become extra figures. No match: the book's default. Result: six numbers, stored in `art.bin`.
2. **Compose** (in the browser, `core/art/compose.mjs`): a random generator seeded by the verse id lays out sky, sun or moon, clouds, hills or sea,
   trees, the figures and weather on a 48 by 32 grid of palette indices. The same verse always gives the same picture; different verses about the same
   thing differ in layout. A "variant" number (the Shuffle button) gives other layouts.
3. **Draw** (`web/js/crochet.mjs`): each cell becomes a yarn stitch. The reveal works bottom row first, each row in the opposite direction, with a hook, swaying yarn and a shimmer, then a light sweeps across. After that only changed cells repaint ten times a second for the idle animation (drifting clouds, flapping wings, flickering flames, rain).
4. **Edit** (`web/js/art-view.mjs`): the reader may change place, hour, mood and figures or shuffle; the change is stored on the device (`store.mjs`) and applied everywhere (verse card, thumbnails, sharing).

God and Christ are never drawn as people. They appear through symbols: light and heaven for God, the cross, lamb, shepherd or crown for Christ.

## Offline and installing

`web/sw.js` registers at the app's own folder. Downloaded data (`data/*.db`, `art.bin`) is cache-first (fetched once, kept);
everything else is network-first with the cached copy as fallback. After the second visit (the first visit installs the worker) the whole app works
with no connection. The web manifest and icons let phones install it to the home screen.

## Hosting under any folder

All addresses in `web/` are relative (`css/app.css`, `../core/bible.mjs`, `new URL('data/…', base)`), and the service worker derives its folder from its scope.
So the same files run at a domain root (`npm run serve`) or in a sub-folder (GitHub Pages: `/ThroughChrist-crochetbible/`).

## Feature map: where each thing is done

| Feature | Files |
|---|---|
| Choosing a book and chapter (bottom book icon) | `web/js/app.mjs` (bottom bar), `web/js/views.mjs` (`bookPicker`) |
| Reading, selecting verses, highlight, note, copy | `web/js/views.mjs` (`readView`), `web/js/store.mjs`, `core/bible.mjs` (`chapter`) |
| English and Tamil side by side | `web/js/views.mjs` (`.parallel`), `web/css/app.css` |
| Keyword search, phrases, scopes | `web/js/views.mjs` (`searchView`), `core/query.mjs`, `core/bible.mjs`, `core/scope.mjs` |
| Tamil search and Tamil in English letters | `core/tamil.mjs`, `core/query.mjs`, `pipeline/build-data.mjs` (indexes) |
| "John 3:16" style references | `core/reference.mjs`, `core/books.mjs` |
| The crochet animation | `web/js/crochet.mjs`, `web/js/art-view.mjs` (`verseCard`) |
| Which picture a verse gets | `core/art/concepts.mjs`, `core/art/spec.mjs`, `pipeline/build-art.mjs` |
| Drawing the scene | `core/art/compose.mjs`, `core/art/sprites.mjs`, `core/art/draw.mjs`, `core/art/palette.mjs` |
| Editing a picture | `web/js/art-view.mjs` (`openPictureEditor`), `web/js/labels.mjs`, `web/js/store.mjs` |
| Share a verse as an image | `web/js/art-view.mjs` (`shareImage`) |
| Verse of the day | `web/js/popular.mjs`, `web/js/views.mjs` (`homeView`) |
| Saved verses, highlights, notes, backup | `web/js/store.mjs`, `web/js/views.mjs` (`savedView`, `settingsView`) |
| Downloading and removing versions | `web/js/data.mjs`, `web/js/views.mjs` (`toggleVersion`, settings) |
| English and Tamil interface | `web/js/i18n.mjs`, `web/js/labels.mjs`, `core/tamil-names.gen.mjs` |
| Offline use | `web/sw.js`, `web/js/data.mjs`, `web/manifest.webmanifest` |
| Licenses and credits | `pipeline/versions.mjs` → `core.db` → Settings; `ATTRIBUTION.md` |
| Publishing | `.github/workflows/pages.yml`, `pipeline/export-web.mjs` |

## Key numbers

31,133 verse ids (the union over all versions; the KJV has 31,102) · 11 Bible texts · 66 books, 1,189 chapters · 75 crochet figures ·
12 settings · 48 by 32 stitches per picture (1,536) · 36 yarn colours · 1,146 old-English forms folded · about 390 book-name spellings ·
at most 4 versions shown (and searched) at once · 48 automated tests.
