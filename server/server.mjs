// Static file server for the Bible app (development + local use).
//   npm run serve   ->  http://localhost:4321
// Listens on 127.0.0.1 only. The app itself is static: search runs in the browser, so the same
// files can later be put on any static host (see "npm run export").
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const gz = promisify(gzip);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT ?? 4321);

// URL prefix -> folder. First match wins; "/" is the app itself.
export const MOUNTS = [
  ['/data/', path.join(ROOT, 'dist', 'data')],
  ['/core/', path.join(ROOT, 'core')],
  ['/vendor/sqlite/', path.join(ROOT, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist')],
  ['/', path.join(ROOT, 'web')],
];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm', '.db': 'application/octet-stream', '.bin': 'application/octet-stream',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.wasm', '.db', '.bin', '.svg', '.txt']);
const cache = new Map(); // file -> {mtime, size, raw, gz}

function resolveFile(urlPath) {
  for (const [prefix, dir] of MOUNTS) {
    if (!urlPath.startsWith(prefix)) continue;
    const rel = decodeURIComponent(urlPath.slice(prefix.length)) || 'index.html';
    const file = path.resolve(dir, rel);
    if (file === dir || file.startsWith(dir + path.sep)) return file; // stay inside the mount
    return null;
  }
  return null;
}

async function load(file) {
  const st = await stat(file);
  if (!st.isFile()) return null;
  const hit = cache.get(file);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return hit;
  const raw = await readFile(file);
  const entry = { mtime: st.mtimeMs, size: st.size, raw, gz: null, etag: `"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"` };
  cache.set(file, entry);
  return entry;
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      const url = new URL(req.url, 'http://localhost');
      let file = resolveFile(url.pathname);
      if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
      let entry = await load(file).catch(() => null);
      if (!entry && !path.extname(file)) entry = await load(file + '.html').catch(() => null);
      if (!entry) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }

      const ext = path.extname(file).toLowerCase();
      const headers = {
        'content-type': TYPES[ext] ?? 'application/octet-stream',
        etag: entry.etag,
        'cache-control': 'no-cache', // always revalidate; the ETag keeps it cheap
        vary: 'Accept-Encoding',
      };
      if (req.headers['if-none-match'] === entry.etag) { res.writeHead(304, headers); return res.end(); }
      let body = entry.raw;
      if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '') && entry.raw.length > 1024) {
        entry.gz ??= await gz(entry.raw, { level: 6 });
        body = entry.gz;
        headers['content-encoding'] = 'gzip';
      }
      headers['content-length'] = body.length;
      res.writeHead(200, headers);
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'content-type': 'text/plain' });
      res.end('Server error');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, '127.0.0.1', () => console.log(`Bible app: http://localhost:${PORT}`));
}
