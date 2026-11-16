// Downloads the raw Bible texts (eBible.org verse-per-line files) into data/raw/<id>/.
//   npm run fetch
// Each translation gets its own folder; files already present are skipped.
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERSIONS } from './versions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const v of VERSIONS) {
  const dir = path.join(ROOT, 'data', 'raw', v.source);
  if (existsSync(path.join(dir, `${v.source}_vpl.txt`))) {
    console.log(`= ${v.id}: already downloaded`);
    continue;
  }
  mkdirSync(dir, { recursive: true });
  const url = `https://ebible.org/Scriptures/${v.source}_vpl.zip`;
  console.log(`> ${v.id}: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const zip = path.join(dir, '_vpl.zip');
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  // -n: never overwrite; unzip also refuses paths that escape the target folder
  execFileSync('unzip', ['-q', '-n', zip, '-d', dir]);
  rmSync(zip);
}
console.log('Done. Next: npm run build');
