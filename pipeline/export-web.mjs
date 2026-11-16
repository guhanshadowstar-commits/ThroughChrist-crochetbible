// Packs the app as a plain static site in dist/web, ready for any static host
// (GitHub Pages, Netlify, Cloudflare Pages, an S3 bucket...). There is no server code: search runs in the browser.
//   npm run export
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'web');
const DATA = path.join(ROOT, 'dist', 'data');
const SQLITE = path.join(ROOT, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist');

if (!existsSync(path.join(DATA, 'manifest.json'))) throw new Error('Run "npm run build" first.');

rmSync(OUT, { recursive: true, force: true });
cpSync(path.join(ROOT, 'web'), OUT, { recursive: true, filter: (src) => !src.includes(`${path.sep}web${path.sep}dev`) });
cpSync(path.join(ROOT, 'core'), path.join(OUT, 'core'), { recursive: true });
mkdirSync(path.join(OUT, 'vendor', 'sqlite'), { recursive: true });
for (const f of ['index.mjs', 'sqlite3.wasm']) cpSync(path.join(SQLITE, f), path.join(OUT, 'vendor', 'sqlite', f));
cpSync(DATA, path.join(OUT, 'data'), { recursive: true });

writeFileSync(path.join(OUT, '.nojekyll'), ''); // GitHub Pages: serve files exactly as they are

const size = (dir) => readdirSync(dir, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(dir, e.name)) : statSync(path.join(dir, e.name)).size), 0);
console.log(`Exported to ${OUT}`);
console.log(`  app + code: ${((size(OUT) - size(path.join(OUT, 'data'))) / 1048576).toFixed(1)} MB   Bible data: ${(size(path.join(OUT, 'data')) / 1048576).toFixed(1)} MB (people download only the versions they pick)`);
console.log('Host it with gzip or brotli on, and serve .wasm as application/wasm and .mjs as text/javascript.');
