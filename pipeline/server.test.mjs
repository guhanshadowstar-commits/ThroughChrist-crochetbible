// The static server must serve the app and nothing outside its folders.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from '../server/server.mjs';

let server, base;
test.before(async () => {
  server = createServer();
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

test('serves the app shell, modules and the wasm engine with the right types', async () => {
  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.match(await home.text(), /Crochet Bible/);
  const mod = await fetch(`${base}/core/bible.mjs`);
  assert.equal(mod.status, 200);
  assert.match(mod.headers.get('content-type'), /javascript/);
  const wasm = await fetch(`${base}/vendor/sqlite/sqlite3.wasm`);
  assert.equal(wasm.headers.get('content-type'), 'application/wasm');
  assert.equal((await fetch(`${base}/sw.js`)).status, 200);
  assert.equal((await fetch(`${base}/manifest.webmanifest`)).status, 200);
});

test('refuses to escape its folders', async () => {
  for (const p of ['/../package.json', '/..%2fpackage.json', '/core/../../package.json', '/%2e%2e/%2e%2e/etc/hosts', '/data/../../README.md']) {
    const r = await fetch(`${base}${p}`);
    assert.ok([400, 404].includes(r.status), `${p} -> ${r.status}`);
    assert.doesNotMatch(await r.text(), /bible-app-data|Phase 1/);
  }
  assert.equal((await fetch(`${base}/nope.txt`)).status, 404);
});

test('compresses large files and supports revalidation', async () => {
  const r = await fetch(`${base}/js/app.mjs`, { headers: { 'accept-encoding': 'gzip' } });
  assert.equal(r.headers.get('content-encoding'), 'gzip');
  const etag = r.headers.get('etag');
  assert.ok(etag);
  const again = await fetch(`${base}/js/app.mjs`, { headers: { 'if-none-match': etag } });
  assert.equal(again.status, 304);
  assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
});
