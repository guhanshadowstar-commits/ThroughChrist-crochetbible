// Keeps the documentation honest: every file has a note, no note describes a missing file,
// and docs/FILES.md is exactly what the generator writes today.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFilesDoc, projectFiles } from './gen-docs.mjs';
import { NOTES } from './doc-notes.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('every project file has a note in pipeline/doc-notes.mjs', () => {
  const missing = projectFiles().filter((f) => !NOTES[f]);
  assert.deepEqual(missing, [], `add a note for: ${missing.join(', ')}`);
});

test('no note describes a file that does not exist', () => {
  const files = new Set(projectFiles());
  const stale = Object.keys(NOTES).filter((f) => !files.has(f));
  assert.deepEqual(stale, [], `remove the note for: ${stale.join(', ')}`);
});

test('every note says what the file is and where it runs', () => {
  for (const [f, n] of Object.entries(NOTES)) {
    assert.ok(n.does && n.does.length > 15, `${f}: "does" is missing`);
    assert.ok(n.runs, `${f}: "runs" is missing`);
  }
});

test('docs/FILES.md is up to date (run "npm run docs" if this fails)', () => {
  const onDisk = readFileSync(path.join(ROOT, 'docs', 'FILES.md'), 'utf8');
  assert.equal(onDisk, buildFilesDoc());
});
