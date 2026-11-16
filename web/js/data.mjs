// Loads the Bible data in the browser: SQLite (WebAssembly) opens the downloaded files from memory,
// so search runs on the device and works offline once a version is downloaded.
import sqlite3InitModule from '../vendor/sqlite/index.mjs';
import { Bible } from '../core/bible.mjs';
import { decodeArt } from '../core/art/spec.mjs';

// The app may live in a sub-folder (GitHub Pages: /crochet-bible/), so every URL is built from here.
const BASE = new URL('../', import.meta.url);
const DATA = new URL('data/', BASE).pathname;

let sqlite3 = null;
export let manifest = null;
export let bible = null;
export let art = null;

async function fetchBytes(url, expectedBytes, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download ${url} (HTTP ${res.status})`);
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onProgress?.(Math.min(1, got / (expectedBytes || got)));
  }
  const out = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.length; }
  onProgress?.(1);
  return out;
}

/** Wrap a downloaded .db file as a database object with all(sql, params). */
function openBytes(bytes) {
  const db = new sqlite3.oo1.DB();
  const p = sqlite3.wasm.allocFromTypedArray(bytes);
  const rc = sqlite3.capi.sqlite3_deserialize(
    db.pointer, 'main', p, bytes.length, bytes.length,
    sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE,
  );
  if (rc) throw new Error(`SQLite could not open the file (code ${rc})`);
  return {
    all: (sql, params) => db.exec({ sql, bind: params?.length ? params : undefined, rowMode: 'object', returnValue: 'resultRows' }),
    close: () => db.close(),
  };
}

const url = (file) => `${new URL(`data/${file}`, BASE).href}?v=${encodeURIComponent(manifest.builtAt)}`;

/** Start up: SQLite, the manifest, the book list and the art pack (about 0.4 MB in all). */
export async function init(onStatus) {
  onStatus?.('engine');
  sqlite3 = await sqlite3InitModule({ print() {}, printErr() {} });
  manifest = await (await fetch(new URL('data/manifest.json', BASE), { cache: 'no-cache' })).json();
  onStatus?.('books');
  const core = openBytes(await fetchBytes(url(manifest.core.file), manifest.core.bytes));
  bible = new Bible(core);
  art = decodeArt(await fetchBytes(url(manifest.art.file), manifest.art.bytes));
  dropStaleDownloads();
  return { manifest, bible, art };
}

export const versionInfo = (id) => manifest.versions.find((v) => v.id === id);

/** Download (or read from the offline cache) and open one version. */
export async function loadVersion(id, onProgress) {
  if (bible.hasShard(id)) return;
  const v = versionInfo(id);
  const bytes = await fetchBytes(url(v.file), v.bytes, onProgress);
  bible.addShard(id, openBytes(bytes));
}

/** Free the memory of a version (the download stays on the device). */
export function unloadVersion(id) {
  const db = bible.shards.get(id);
  if (!db) return;
  bible.removeShard(id);
  db.close();
}

/** Delete a version's offline copy. */
export async function removeDownload(id) {
  unloadVersion(id);
  if (!('caches' in self)) return;
  const v = versionInfo(id);
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const req of await cache.keys()) if (new URL(req.url).pathname === `${DATA}${v.file}`) await cache.delete(req);
  }
}

/** Old builds of the data files are removed from the offline cache once a newer manifest is seen. */
async function dropStaleDownloads() {
  if (!('caches' in self)) return;
  try {
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const req of await cache.keys()) {
        const u = new URL(req.url);
        if (u.pathname.startsWith(DATA) && u.pathname !== `${DATA}manifest.json` && u.searchParams.get('v') !== manifest.builtAt) await cache.delete(req);
      }
    }
  } catch { /* cache not available */ }
}

export const bytesLabel = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`);
