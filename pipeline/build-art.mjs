// Writes dist/data/art.bin: one scene spec for every verse, read from the English texts.
//   node pipeline/build-art.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { openBible, DEFAULT_DATA_DIR } from './node-bible.mjs';
import { makeSpec, encodeSpecs, SETTINGS, MOODS, TIMES } from '../core/art/spec.mjs';

// Several versions give a steadier reading than one (a word one translation skips shows up in another).
const READERS = ['en-kjv', 'en-web', 'en-asv', 'en-bsb'];

export function buildArt(dir = DEFAULT_DATA_DIR) {
  const bible = openBible(dir, { versions: READERS });
  const refs = bible.allRefs();
  const entries = [];
  const tally = { setting: {}, time: {}, mood: {}, hero: {} };
  const batch = 400;
  for (let i = 0; i < refs.length; i += batch) {
    const chunk = refs.slice(i, i + batch);
    const texts = bible.textsFor(chunk, READERS);
    for (const ref of chunk) {
      const t = Object.values(texts.get(ref));
      // a verse missing from every English version (rare) is read from book defaults only
      const spec = makeSpec(ref, t.length ? t : ['']);
      entries.push({ ref, spec });
      for (const k of ['setting', 'time', 'mood', 'hero']) tally[k][spec[k]] = (tally[k][spec[k]] ?? 0) + 1;
    }
  }
  bible.close();

  const bytes = encodeSpecs(entries);
  const file = path.join(dir, 'art.bin');
  writeFileSync(file, bytes);

  const manifestFile = path.join(dir, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
  manifest.art = { file: 'art.bin', bytes: bytes.length, gzipBytes: gzipSync(bytes).length, verses: entries.length };
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));

  console.log(`art.bin: ${entries.length} verse scenes, ${(bytes.length / 1024).toFixed(0)} KB (${(manifest.art.gzipBytes / 1024).toFixed(0)} KB gzipped)`);
  const top = (o, n = 8) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${k} ${v}`).join(', ');
  console.log('settings:', top(tally.setting, 12));
  console.log('times:', top(tally.time), '| moods:', top(tally.mood));
  console.log('heroes:', top(tally.hero, 14));
  return { entries, tally };
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildArt();
