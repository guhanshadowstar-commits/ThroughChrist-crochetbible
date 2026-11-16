# Decisions

Why things are the way they are. Each entry: what was chosen, why, and what was considered instead.

## Scope and content

**1. Only public-domain and open-license Bibles.**
Why: "all versions" cannot legally include NIV, ESV, NLT or the current Tamil Bible Society editions in a free app that works offline.
Instead considered: fetching copyrighted versions through a licensed online API (needs a key, internet, usage limits, no full-text search); a "personal use only" mode. Rejected for now.
Result: 9 English and 2 Tamil texts ([DATA-SOURCES.md](DATA-SOURCES.md)).

**2. One picture for every verse, made by code, not by hand or by an image generator.**
Why: 31,133 verses cannot be hand-drawn, and 31,133 AI images would be expensive, inconsistent and hard to turn into stitches. A scene composer fed by a short description per verse gives a picture that matches what the verse names and costs nothing to run.
Instead considered: a library of 100 to 200 reusable scenes (every verse gets art but many repeat); unique AI art converted to pixels (cost, messy results); art only for famous verses.
Trade-off: abstract verses get a symbolic picture; the pictures are good at concrete things (a fish, an ark, a lion) and generic otherwise.

**3. God and Christ are never drawn as people.**
Why: respectful and avoids contested imagery. They are shown through light, heaven, the cross, lamb, shepherd, crown, dove. Done in `core/art/concepts.mjs`.

**4. The picture is keyed on the verse reference, not on a translation.**
Why: the English and Tamil readings of a verse share one picture, and saved verses, notes and edits belong to the verse.

## Data and search

**5. Per-version database files ("shards"), not one big database.**
Why: all 11 texts in one database were 112 MB; a phone should download only what it reads (English about 3 MB, Tamil about 6 MB gzipped). The browser loads only the versions being shown.
Instead considered: one monolithic database (kept briefly, then replaced); JSON files per book with a hand-written search index.

**6. SQLite in the browser (official WebAssembly build) instead of a server.**
Why: no server to run or pay for, search works offline, and the build, the tests and the app all run the same SQL and the same `core/bible.mjs`.
Instead considered: a Node server with a search API (kept for a day as the first local viewer); `sql.js`. **`sql.js` was tried first and fails with "no such module: fts5"**, so the official `@sqlite.org/sqlite-wasm` package was used.

**7. FTS5 contentless indexes with the verse id as rowid.**
Why: the text is stored once (`texts`); the index only needs to point at it. Keeps databases smaller and lets a scope be an efficient rowid range.
Cost: highlighting cannot come from the index, so the browser highlights with a pattern built from the query (`highlightRegex`).

**8. Tamil vowel signs are remapped to private-use characters in the index only.**
Why: SQLite's tokenizer treats Tamil vowel signs and the pulli as separators and splits "அன்பு" into fragments, which gave false matches (found by testing: the whole-word query matched three unrelated verses). Remapping them to letters-like characters in the index keeps words whole. The stored text is untouched, which the CC BY-SA license also wants.

**9. Tamil search matches stems (prefix) rather than exact words.**
Why: Tamil is agglutinative (அன்பு, அன்பை, அன்புக்கு, அன்பினால்). Dropping the final vowel sign and matching as a prefix finds the inflected forms with few false hits.
Trade-off: favours finding more; "அன்பு" also returns compounds such as "அன்பளிப்பு".

**10. A sound index for Tamil typed in English letters.**
Why: many people type Tamil in English letters ("anbu", "thevan"). A lossy key (voiced and voiceless sounds merged: g/k, d/t, b/p; th/dh to t; zh to l; long vowels shortened) is computed for both typed text and Tamil words. Optional ("Also match Tamil typed in English letters"), because it adds noise for English words.

**11. Old-English verb forms are folded by a generated map, not by rules.**
Why: the KJV, ASV, YLT, Darby, Webster and Geneva are full of -eth and -est forms ("whosoever believeth"). A map is only made for words absent from the modern texts whose base word exists, which keeps "earnest", "forest", "faith" and "breath" intact. Three bad entries were found by reading the list and blocked by name.

**12. A bare book name ("Job", "Mark", "Acts") is a keyword search, not a reference.**
Why: they are also ordinary words and names in verses. Only inputs with a chapter ("Job 1", "John 3:16") open a passage; the book is offered as a shortcut.

**13. Search covers the versions being shown (up to four), not every installed version.**
Why: each loaded version costs memory in the browser (7 to 21 MB); this keeps phones safe. Changing versions is one tap.

## The app

**14. No framework; plain ES modules and a small `h()` DOM helper.**
Why: the app is small, loads fast, and there is nothing to build for the browser. `h()` never uses innerHTML for text, so verse text and search input cannot inject markup.

**15. All addresses are relative, and the service worker finds its own folder.**
Why: GitHub Pages serves a project from a sub-folder (`/ThroughChrist-crochetbible/`); root-based addresses (`/js/app.mjs`) would break. Found and fixed before publishing, and tested under a sub-folder.

**16. The Books icon in the bottom bar opens the book and chapter picker directly.**
Why (requested): reaching any chapter in one tap. The picker leads with "Continue reading", filters by English or Tamil name, and marks the current chapter.

**17. Tap a verse to select it (not to leave the chapter).**
Why: reading flow. Selected verses get a bar with Picture, Copy, Save, Highlight and Note; the small picture beside each verse opens its full picture.

**18. Readers can edit each verse's picture.**
Why (requested "make edits"): choose place, hour, mood and figures, or shuffle the layout. Stored on the device as an override, applied everywhere, and removable ("Back to the original").

**19. Personal data stays on the device, with a backup file.**
Why: no accounts, no server. `exportData`/`importData` move saved verses, highlights, notes and picture edits; restoring merges and refuses files that are not Crochet Bible backups.

**20. Motion is optional.**
Why: the stitching reveal and idle motion can be switched off (and follow the system "reduce motion" setting), for comfort and battery.

**20b. The crocheting plays once per verse, then the finished picture is simply there.**
Why (requested "I don't want them to load every time"): a 4-second reveal on every visit gets tiring. By default each verse is crocheted the first time it is opened; the device remembers which verses it has shown (a capped list of up to 4,000), and afterwards the finished picture appears instantly with only the gentle idle motion. "Watch again" replays it whenever wanted, even with the animation off.
Settings offer **First time only** (default), **Every time**, **Off**. A device's own "reduce motion" setting is always respected.
Instead considered: a faster reveal (still tiring); replacing it with a small decorative loop (loses the link to the verse's own picture); playing it only from a button (people would never see it).

**20c. The reveal was redrawn to be easier to see and to feel like real crochet.**
Why (requested "more visible and relatable"): a faint ghost of the finished pattern shows what is being made, the working row is lit, each new stitch pops out and glints, a visible ball of yarn feeds the thread, the hook is larger with a loop on its tip, and "Row 12 of 32" says where the work is.

## Publishing

**21. GitHub Pages, deployed by GitHub Actions, built from source.**
Why: free hosting; the Bible texts are downloaded during the build so the repository stays small (about 0.5 MB of source); the tests run before every publish, so a broken change is never live.

**21b. The service worker revalidates every file with the server.**
Why: GitHub Pages sends `cache-control: max-age=600`, so for ten minutes after an update a browser could use some new and some old files (found on the live site: a new settings screen with old text). `fetch(req, { cache: 'no-cache' })` asks the server each time and gets a small "not modified" answer when nothing changed, so every load is consistent and updates appear at once.

**22. The repository is public.**
Why: the free GitHub plan cannot serve Pages from a private repository. The owner first chose private, then chose public after seeing this. Alternatives offered: host elsewhere (Vercel) or upgrade GitHub.

**23. Commits use GitHub's private "no-reply" email.**
Why: the first commit carried a real email address, which a public repository would show to everyone. With the owner's approval the single commit was rewritten and force-pushed before the repository was made public; this project now commits with the no-reply address.

**24. The documentation is checked by a test.**
Why: `docs/FILES.md` is generated from the code plus notes, and `pipeline/docs.test.mjs` fails if a file has no note or the generated file is stale, so "what is used and where" cannot drift.

## Not done (on purpose, for now)

- A native iPhone app: the web app comes first (it installs to the home screen and works offline). The data files, scene descriptions and `core/` code are designed to be reused by a native app.
- Hand-drawn pictures; Douay-Rheims; the old Tamil Union Version ([DATA-SOURCES.md](DATA-SOURCES.md)).
