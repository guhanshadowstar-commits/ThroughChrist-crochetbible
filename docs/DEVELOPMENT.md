# Development guide

How to run, test, change and publish the project.

## Requirements

- **Node 24 or newer** (uses the built-in `node:sqlite`, `node:test` and `fetch`).
- The `unzip` command (present on macOS and Linux) for `npm run fetch`.
- About 400 MB of disk for downloads and builds (all recreated by the commands below).

## First time

```bash
npm install          # one dependency: @sqlite.org/sqlite-wasm
npm run fetch        # download the 11 Bible texts into data/raw (once)
npm run build        # dist/data: core.db, one database per version, manifest.json, art.bin
npm test             # all tests
npm run serve        # http://localhost:4321
```

## Commands

| Command | What it does | Script |
|---|---|---|
| `npm run fetch` | Download the texts | `pipeline/fetch-sources.mjs` |
| `npm run build` | Build data and the art pack | `pipeline/build-data.mjs`, `pipeline/build-art.mjs` |
| `npm run build:art` | Rebuild only `art.bin` (after changing `core/art/concepts.mjs` or `spec.mjs`) | `pipeline/build-art.mjs` |
| `npm run serve` | Local server on port 4321 (`PORT=…` to change) | `server/server.mjs` |
| `npm test` | Run every test | `node --test pipeline/*.test.mjs` |
| `npm run search -- "love"` | Search from the terminal (`--lang ta`, `--versions`, `--show`, `--any`, `--tanglish`) | `pipeline/cli.mjs` |
| `npm run export` | Make the static site in `dist/web` | `pipeline/export-web.mjs` |
| `npm run icons` | Redraw the app icons | `pipeline/make-icons.mjs` |
| `npm run docs` | Regenerate `docs/FILES.md` | `pipeline/gen-docs.mjs` |

Developer pages (served by `npm run serve`, not in the published site): `/dev/sprites.html` (all figures; `?only=lamb,dove`) and
`/dev/scenes.html` (sample pictures; `?random=7&n=24`, `?refs=1001001,43003016`, `?reveal=1`).

## Where to change things

| I want to… | Change this, then |
|---|---|
| Add or remove a Bible text | `pipeline/versions.mjs` → `npm run fetch && npm run build && node pipeline/gen-attribution.mjs`; if archaic English changes, `node pipeline/gen-archaic.mjs` |
| Change what picture a verse gets | `core/art/concepts.mjs` (words and weights; `_soft` for weak hints) → `npm run build:art` |
| Add a crochet figure | `core/art/sprites.mjs` (draw it, add to `SPRITES`, animated ones to `ANIMATED` and `FPS`), add a Tamil name in `web/js/labels.mjs`, add words in `concepts.mjs`, check `/dev/sprites.html` → `npm run build:art` |
| Change how a scene looks | `core/art/compose.mjs` (layers, settings), `core/art/palette.mjs` (colours) |
| Change the stitch look or the animation | `web/js/crochet.mjs` |
| Change interface text | `web/js/i18n.mjs` (English **and** Tamil: a test checks both have the same entries) |
| Change a screen | `web/js/views.mjs`; styles in `web/css/app.css` |
| Change search behaviour | `core/query.mjs`, `core/english.mjs`, `core/tamil.mjs`, `core/bible.mjs`; indexing in `pipeline/build-data.mjs` (then rebuild) |
| Add a file | Add its note to `pipeline/doc-notes.mjs`, then `npm run docs` |

## Tests

`npm test` runs six groups. Tests that need the built data skip themselves with a clear message if `dist/data` is missing.

| File | Covers |
|---|---|
| `pipeline/text-utils.test.mjs` | Books, references, Tamil and English text helpers, query syntax |
| `pipeline/database.test.mjs` | Data integrity and search against the built files |
| `pipeline/art.test.mjs` | Figures, scene writer, composer, `art.bin`, animation |
| `pipeline/features.test.mjs` | Scopes, variants, saved data, backup, interface text, verse of the day |
| `pipeline/server.test.mjs` | The local server, including path-escape attempts |
| `pipeline/docs.test.mjs` | Every file has a note; `docs/FILES.md` is current |

## Publishing (GitHub)

The site is built and published by `.github/workflows/pages.yml` on every push to `main`.

1. Make the change and run `npm test` (and `npm run docs` if files were added or changed).
2. Commit. With GitHub Desktop: choose the repository `ThroughChrist-crochetbible`, write a summary, **Commit to main**, then **Push origin** (menu Repository, Push).
   The commit email for this project is GitHub's no-reply address (set in this repository's git config) so no personal email is published.
3. Watch the run at the repository's Actions tab. About a minute later the live site updates:
   https://guhanshadowstar-commits.github.io/ThroughChrist-crochetbible/
4. If a test fails the run stops and nothing is published.

One-time setup already done: repository public; Settings, Pages, Source set to **GitHub Actions**.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `no such module: fts5` | The SQLite build lacks full-text search (`sql.js` does). Use `@sqlite.org/sqlite-wasm`. |
| App shows old files after an update | The service worker serves the cache while offline and revalidates online. Hard reload (Cmd+Shift+R) or clear site data. Data files refresh themselves through `?v=<builtAt>`. |
| Offline does not work on the very first visit | The service worker installs on the first visit and caches from the second. Reload once. |
| Workflow fails at "configure-pages" | Pages is not enabled with source "GitHub Actions" (or the repository is private on a free plan). |
| Workflow fails at tests | A test caught a problem. Open the failed step's log. If it is the docs test, run `npm run docs` and commit. |
| Blank page in a sub-folder | An address starting with `/` somewhere. All addresses in `web/` must be relative. |
| Tamil search finds too much | Tamil matches word stems on purpose (see DECISIONS.md, entry 9). |
| `npm run build` says "Missing … run npm run fetch" | The texts are not downloaded yet. |
| Browser pane shows a blank page while testing | The pane is hidden; page scripts still work, screenshots do not. |
