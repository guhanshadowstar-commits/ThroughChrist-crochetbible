# Crochet Bible

> **Documentation:** [docs/](docs/README.md) explains how everything fits together ([architecture](docs/ARCHITECTURE.md)), every file and what it uses ([file reference](docs/FILES.md)), where the texts came from ([data sources](docs/DATA-SOURCES.md)), why choices were made ([decisions](docs/DECISIONS.md)), what was built and what is still open ([history](docs/HISTORY.md)), and how to work on it ([development guide](docs/DEVELOPMENT.md)).

The Bible in **English and Tamil**, with a **crochet picture stitched for every verse**. It is a web app
that installs on a phone and works offline.

- 11 open-license versions: English (WEB, KJV, BSB, ASV, YLT, BBE, Darby, Geneva, Webster) and Tamil (IRV, Biblica Open TCV)
- Read any chapter in up to four versions side by side
- Search by words in English or Tamil (or Tamil typed in English letters), or jump to a verse ("John 3:16", "யோவான் 3:16")
- Every one of the 31,133 verses has its own pixel-crochet picture, chosen from the words of the verse.
  Opening a verse shows it being crocheted stitch by stitch with a hook, and then the scene moves
  (clouds drift, stars twinkle, rain falls, flames flicker)
- Verse of the day, saved verses, share a verse as a picture, Tamil or English interface, dark mode, text size

## Run it

Needs Node 24 or newer.

```bash
npm install
npm run fetch       # download the Bible texts (once)
npm run build       # build the data files and the art pack into dist/data
npm run serve       # open http://localhost:4321
npm test            # 48 tests
```

**On an iPhone:** open the address in Safari, tap Share, then "Add to Home Screen". After a version has
downloaded, the app works without internet. (From a phone on the same Wi-Fi, use the computer's address
instead of `localhost`; to share it with anyone, host it, see below.)

## Live site

**https://guhanshadowstar-commits.github.io/ThroughChrist-crochetbible/**

Source: https://github.com/guhanshadowstar-commits/ThroughChrist-crochetbible

## Put it on the internet (GitHub Pages)

The app is a plain static site with no server code. `.github/workflows/pages.yml` builds it from source and
publishes it every time something is pushed to `main`:

1. downloads the Bible texts from eBible.org, builds the data and the pictures, and runs all the tests;
2. exports the site (`npm run export` puts it in `dist/web`);
3. deploys it to GitHub Pages at `https://<account>.github.io/<repository>/`.

So to change the live app, change the code and push to `main`. If the tests fail, nothing is published.
The site works from any folder, so it also runs on Netlify, Cloudflare Pages or your own server
(serve `.wasm` as `application/wasm`; gzip or brotli is a good idea). People download only the versions
they choose (English about 3 MB each, Tamil about 6 MB each, compressed).

## How it works

| Part | What it does |
|---|---|
| `dist/data/core.db` | Books, versions with their licenses, chapter sizes |
| `dist/data/<version>.db` | One file per version: verse text plus full-text indexes |
| `dist/data/art.bin` | A 6-number scene description for every verse (300 KB) |
| SQLite in WebAssembly | Opens those files in the browser, so search runs on the device |
| `web/sw.js` | Keeps downloaded versions and the app files for offline use |

**Search** (`core/query.mjs`, `core/bible.mjs`): English uses stemming plus a generated map of 1,146 old-English
verb forms (so *believe* finds the KJV's *believeth*). Tamil is stored untouched; for the index, vowel signs are remapped so
SQLite does not split words, and queries match word stems, so அன்பு also finds அன்பை and அன்பினால். A sound index lets
`anbu` or `thevan` find அன்பு and தேவன்.

**The pictures** (`core/art/`):
1. `concepts.mjs` lists words for about 70 figures (lamb, dove, cross, fish, boat, lion, harp, crown...),
   12 settings, times of day and moods. God and Christ are never drawn as people; they show through symbols (light, cross, lamb, crown, dove).
2. `spec.mjs` reads a verse in four English versions and picks the setting, hour, mood, one main figure and up to two more.
3. `compose.mjs` draws it from layers (sky, sun or moon, clouds, hills, ground, figures, weather), seeded by the verse
   reference, so two verses about a lamb in a meadow still differ in clouds, hills, trees, flowers and placement.
4. `web/js/crochet.mjs` renders each pixel as a yarn stitch and plays the crocheting animation.

Pictures are keyed on the verse reference, so the same picture appears in English and Tamil.

## Project layout

| Path | Purpose |
|---|---|
| `core/` | Code shared by Node and the browser: books, search, art |
| `web/` | The app (HTML, CSS, modules, service worker, icons) |
| `pipeline/` | Build tools and tests (Node only) |
| `server/server.mjs` | Small static server for local use |
| `data/raw/` | Downloaded source texts (not changed) |
| `web/dev/` | Developer pages: `/dev/sprites.html` (all figures), `/dev/scenes.html` (sample pictures; add `?random=7&n=24`) |

## Licenses

Bible texts: see [ATTRIBUTION.md](ATTRIBUTION.md). The two Tamil texts are CC BY-SA 4.0, so the Tamil text stays under that license wherever it is redistributed;
the credits are also inside the app (Settings, then Credits and licenses).

## Known limits

- **There is no native iPhone app yet.** The web app installs to the home screen and works offline,
  but it is not a SwiftUI app. A native app can reuse the same data files and scene descriptions.
- The pictures are generated, not hand-drawn. They match the main things in a verse well (a fish in Jonah 1:17,
  the ark in Genesis 6:14), but abstract verses get a symbolic picture, and verses that mention no
  picturable thing get a scene typical of their book.
- Searches across versions are limited to the versions you are showing (up to four), to keep memory use low on phones.
- Tamil prefix matching favours recall: அன்பு also returns compounds such as அன்பளிப்பு.
- The old Tamil Union Version is not included, because no openly licensed copy was found.
- The first Tamil download is about 6 MB (compressed), the largest single file.
