// Opens the built data files in Node using node:sqlite (CLI, tests, dev server).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Bible } from '../core/bible.mjs';

export const DEFAULT_DATA_DIR = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'dist', 'data',
);

const adapt = (db) => ({
  all: (sql, params = []) => db.prepare(sql).all(...params),
  close: () => db.close(),
});

/** @param {{versions?: string[]}} [opts] load only these versions (default: all in the manifest) */
export function openBible(dir = DEFAULT_DATA_DIR, opts = {}) {
  const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const bible = new Bible(adapt(new DatabaseSync(path.join(dir, manifest.core.file), { readOnly: true })));
  for (const v of manifest.versions) {
    if (opts.versions && !opts.versions.includes(v.id)) continue;
    bible.addShard(v.id, adapt(new DatabaseSync(path.join(dir, v.file), { readOnly: true })));
  }
  bible.manifest = manifest;
  bible.close = () => {
    for (const db of bible.shards.values()) db.close();
    bible.core.close();
  };
  return bible;
}

export const dataExists = (dir = DEFAULT_DATA_DIR) => {
  try { readFileSync(path.join(dir, 'manifest.json')); return true; } catch { return false; }
};
