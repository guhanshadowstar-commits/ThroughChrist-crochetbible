// Try the database from the terminal:
//   npm run search -- "love one another"
//   npm run search -- "அன்பு" --limit 5
//   npm run search -- anbu --lang ta            (Tamil typed in English letters)
//   npm run search -- "John 3:16" --show en-kjv,ta-irv,ta-tcv
import { openBible } from './node-bible.mjs';
import { highlightRegex } from '../core/query.mjs';
import { DEFAULT_VERSION } from '../core/bible.mjs';
import { parseReference } from '../core/reference.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = args[i + 1];
  args.splice(i, v && !v.startsWith('--') ? 2 : 1);
  return v && !v.startsWith('--') ? v : true;
};
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : null);

const lang = flag('lang', 'all');
const versions = list(flag('versions'));
const show = list(flag('show')) ?? Object.values(DEFAULT_VERSION);
const limit = Number(flag('limit', 10));
const any = Boolean(flag('any'));
const tanglish = Boolean(flag('tanglish'));
const query = args.join(' ').trim();

if (!query) {
  console.log('Usage: npm run search -- "<words or reference>" [--lang en|ta|all] [--versions a,b] [--show a,b] [--limit N] [--any] [--tanglish]');
  process.exit(1);
}

const bible = openBible();
const bold = (s) => `\x1b[1;33m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
const mark = (text, re) => (re ? text.replace(re, (m) => bold(m)) : text);

// A bare book name ("Job", "Mark", "Acts") is also an ordinary word, so it stays a keyword search;
// only inputs with a chapter number ("Job 1", "John 3:16") open a passage.
const asRef = parseReference(query);
const ref = asRef && asRef.chapter !== null ? bible.lookup(query, { show }) : null;
if (ref?.error) {
  console.log(ref.error);
} else if (ref) {
  console.log(bold(`${ref.reference.label.en}  /  ${ref.reference.label.ta}`));
  for (const v of ref.verses) {
    for (const id of show) if (v.texts[id]) console.log(`  ${dim(`${v.verse} [${id}]`)} ${v.texts[id]}`);
  }
} else {
  const t0 = performance.now();
  const r = bible.search(query, { lang, versions, show, limit, any, tanglish });
  const ms = (performance.now() - t0).toFixed(1);
  const re = highlightRegex(query);
  console.log(dim(`${r.total} verses match ${JSON.stringify(query)} in ${ms} ms  ${r.plans.map((p) => `[${p.table}: ${p.match}]`).join(' ')}`));
  for (const hit of r.results) {
    console.log(`\n${bold(hit.label.en)}  ${dim('/')}  ${bold(hit.label.ta)}  ${dim(`(matched in ${hit.matchedVersions.join(', ')})`)}`);
    // Show the chosen versions; if none of them matched, also show the first version that did.
    const ids = show.some((id) => hit.matchedVersions.includes(id)) ? show : [...show, hit.matchedVersions[0]];
    for (const id of ids) if (hit.texts[id]) console.log(`  ${dim(`[${id}]`)} ${mark(hit.texts[id], re)}`);
  }
}
bible.close();
