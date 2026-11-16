# History: what was built, in order

A record of how Crochet Bible was made: what was asked, what was done, what went wrong and how it was fixed, what was verified,
and what is still open. Dates are 2026. Nothing here is rounded up: unverified things are listed as unverified.

## The request

Make a Bible app with **all versions in English and Tamil**, searchable by **key terms**, where each verse has a **pixel crochet art animation**.
Decisions made at the start: web app first (installable on a phone) and a native iPhone app later; only public-domain and open-license texts;
a unique picture for every verse; a stitch-by-stitch crocheting reveal.
Later requests: a complete working web app before any native app, **edits** and **animations** polish, a **book icon at the bottom for chapters**,
hosting on **GitHub** with updates pushed there, and this documentation.

## Timeline

### 12 Nov: plan and Phase 1 (data and search)
- Planned five phases: data and search, reader, crochet engine, art for every verse, release.
- Read the eBible.org index; chose 9 English and 2 Tamil open-license texts; downloaded and unzipped them.
- Wrote the importer, a SQLite database with full-text search, reference lookup, a command-line search tool, and 24 tests.
- Wrote `ATTRIBUTION.md` from a version registry.

### 12 to 13 Nov: review of Phase 1
- Re-read every raw file independently and compared with the database: 0 differences. Fixed two bugs found in review
  (a bare book name hijacked searches; three wrong old-English mappings) and rebuilt.
- A temporary local viewer (a Node server with a search API) let the owner try the search in a browser.

### 13 to 15 Nov: the complete web app
- **Engine check:** `sql.js` has no FTS5, so the official SQLite WebAssembly build was adopted and checked in Node and the browser.
- **Data layout:** moved shared code to `core/`, split the 112 MB database into per-version files plus `core.db`, and made search one class (`core/bible.mjs`) that runs in Node and the browser.
- **Crochet engine:** drew about 75 figures from primitives with automatic outline and shading, and a stitch renderer with the hook animation; checked in a sprite gallery.
- **Pictures for every verse:** word dictionary, scene writer, scene composer, `art.bin` for 31,133 verses; checked in a scene gallery.
- **App:** reader, verse screen, search, saved verses, settings, verse of the day, share-as-image, English and Tamil interface, themes, service worker, icons, static export.
- **Checks:** 36 tests; end-to-end checks in the browser; a phone-width layout check; first-run from a cleared browser; offline use with the server stopped.

### 15 Nov: edits and animations pass
- Reader rebuilt: tap verses to select; Picture, Copy, Save, Highlight (4 colours) and Note; English and Tamil side by side on wide screens; compact versions pill.
- **Book icon at the bottom** opens a book and chapter picker with "Continue reading" and a filter (English or Tamil names).
- **Picture editor** (place, hour, mood, three figures, shuffle, reset), saved on the device.
- Search scopes (whole Bible, testament, one book) and recent searches; a Saved screen with stars, highlights and notes; backup and restore.
- Settings: stitching speed, idle motion, pictures beside verses.
- Animation: swaying hook, shimmer on fresh stitches, a light sweep at the end, flapping wings, a grazing lamb, flicking tails, flapping birds, shooting stars, page transitions, rising search results.
- App code split into `ui`, `art-view`, `views`, `app`, `labels`, `store`, `thumbs` modules.

### 16 Nov: animation made clearer, and played once per verse
- Asked: make the crochet animation more visible and relatable, and stop it playing every time.
- Reveal redrawn: ghost of the finished pattern, lit working row, popping stitches, visible yarn ball, larger hook with a loop, "Row N of 32".
- Playing rule changed: the crocheting plays the first time each verse is opened (remembered on the device), then the finished picture appears at once. Settings: First time only (default), Every time, Off; "Watch again" always works.
- Checked in the browser: all three modes, skipping, reopening, "Watch again" with the animation off. Added tests for the remembered list and its cap.

### 16 Nov: GitHub and documentation
- Made all addresses relative so the app works from a sub-folder; the service worker finds its own folder.
- Added the Pages workflow, `.gitignore`, a local git repository and the first commit.
- Published to a private repository with GitHub Desktop; discovered the free plan cannot serve Pages from a private repository; the owner chose to make it public.
- Before going public, rewrote the single commit to use GitHub's no-reply email (owner approved), force-pushed, made the repository public, set Pages to "GitHub Actions", ran the workflow (success in 54 s).
- Checked the live site: search, pictures, service worker scope, offline caches after the second visit.
- Pushed a README change and saw the push start a new build by itself.
- Checked the picture editor, settings, scopes and backup on the live site; found and fixed the stitching-animation switch (it needed a reload).
- Added tests for the newer features and this documentation, plus a test that keeps the documentation current.

## Problems found and how they were fixed

| # | Problem | How it was found | Fix |
|---|---|---|---|
| 1 | `sql.js` has no FTS5 ("no such module: fts5") | Test run | Switched to the official `@sqlite.org/sqlite-wasm` |
| 2 | Tamil words were chopped at every vowel sign, giving false matches | A whole-word Tamil query matched three unrelated verses | Vowel signs mapped to private-use characters in the index only |
| 3 | `bm25()` unusable in a joined query | Error on first search | Materialised sub-query (later unnecessary after the per-version layout) |
| 4 | Foreign-key error when building | First build | Insert the canonical verse list before the texts |
| 5 | Searching "believe" missed the KJV's "believeth" | Manual search | Generated old-English map; three wrong entries blocked after reading the list |
| 6 | Douay-Rheims did not align with the other versions | Verse-id comparison | Left out |
| 7 | Typing a book name (Job, Mark) jumped to the book | Review | A bare name is a search; the book is offered as a shortcut |
| 8 | Idle animation crashed with a negative time | Console error | Clamp time at zero |
| 9 | Highlighted verses stretched the page sideways on phones | Phone-width measurement | Wrap text in its own element |
| 10 | Tamil verses wrapped one word per line in the reader on narrow screens | Screenshot | Smaller pictures on small screens; `overflow-wrap: break-word` |
| 11 | Sub-folder hosting would have broken every address | Planning the GitHub Pages deploy | Relative addresses; service worker uses its scope |
| 12 | The commit carried a real email that a public repository would show | Pre-publish check | Rewrote the commit with the no-reply address (approved) |
| 13 | Free GitHub plan cannot serve Pages from a private repository | GitHub's Pages settings | Owner chose to make the repository public |
| 14 | The stitching-animation switch needed a reload | Check on the live site | The switch now re-applies the look immediately |
| 15 | Just after a deploy the live site mixed new and old files (new screen, old text labels) because GitHub Pages lets browsers cache files for 10 minutes | Checking the animation change on the live site | The service worker now revalidates every request with the server |

## What was verified, and how

- **50 automated tests** (46 for the app and data, plus 4 that keep the documentation complete and current): data integrity, search (English, Tamil, Tamil typed in English letters, phrases, NOT, OR, prefix, scopes, paging), references,
  pictures (every figure, every verse has a picture, scenes fully covered, deterministic, same-subject verses differ, animation moves), the web server (and path-escape attempts), saved data and backup, interface text parity, the verse-of-the-day list.
- **In a browser:** first run from a cleared browser (installs the default versions); every screen; reader selection, highlight, star and note; saved tabs; book picker with English and Tamil filters; search results with highlights; picture editor (change, shuffle, reset); settings; backup round trip; Tamil interface; phone-width layout with no sideways scrolling.
- **Offline:** with the server stopped the app loaded and searched; on the live site the app files, the SQLite engine and the downloaded versions are cached after the second visit.
- **Hosting:** the exported site works from a plain file server under a sub-folder; the live site works at its GitHub address.

## Still open or unverified

- **No native iPhone app.** The web app installs to the home screen and works offline.
- **Light theme** was never looked at visually; the **reader on a phone** was seen only in some screenshots.
- A native Tamil speaker has not reviewed the Tamil interface text or the Tamil search results.
- The pictures are generated: concrete things match well; abstract verses get symbolic pictures. Nobody has reviewed all 31,133.
- Search covers only the versions being shown (up to four). Version downloads are large for Tamil (about 6 MB gzipped each).
- The old Tamil Union Version and copyrighted versions are not included.
- The service worker was confirmed on the live site; its behaviour on every phone browser was not tested.

## Tools used while building

Claude (the AI assistant) wrote the code, ran the tests and drove a browser to check the app; the built-in browser pane, the iOS-style narrow viewport emulation and
page-script checks were used for verification; GitHub Desktop (operated on the owner's Mac) published and pushed; GitHub Actions and GitHub Pages build and host the site.
