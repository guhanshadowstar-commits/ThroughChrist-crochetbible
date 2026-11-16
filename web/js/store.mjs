// Everything the app remembers on this device (localStorage). Reads and writes never throw:
// private windows or blocked storage just mean settings are not kept.
const KEY = 'crochet-bible:v1';

const defaults = () => ({
  uiLang: (navigator.language || 'en').toLowerCase().startsWith('ta') ? 'ta' : 'en',
  show: ['en-web', 'ta-irv'],      // versions shown, in order (also the ones searched)
  installed: [],                    // versions downloaded to this device
  textSize: 2,                      // 0..4
  motion: 'on',                     // 'on' | 'off': the crocheting reveal
  idle: true,                       // pictures keep moving once finished
  speed: 'normal',                  // 'slow' | 'normal' | 'fast'
  pictures: true,                   // small pictures beside verses in the reader
  theme: 'auto',                    // 'auto' | 'light' | 'dark'
  lastRead: { book: 43, chapter: 3 },
  bookmarks: [],                    // [{ ref, at }]
  highlights: {},                   // { ref: 1..4 }
  notes: {},                        // { ref: { text, at } }
  artEdits: {},                     // { ref: { setting, time, mood, hero, props, variant } }
  recent: [],                       // recent searches, newest first
});

let data;
function load() {
  try { data = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { data = defaults(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* storage unavailable */ } }
load();

export const settings = new Proxy({}, {
  get: (_, k) => data[k],
  set: (_, k, v) => { data[k] = v; save(); return true; },
});

// ---- saved verses ----
export const isBookmarked = (ref) => data.bookmarks.some((b) => b.ref === ref);
export function toggleBookmark(ref) {
  if (isBookmarked(ref)) data.bookmarks = data.bookmarks.filter((b) => b.ref !== ref);
  else data.bookmarks = [{ ref, at: Date.now() }, ...data.bookmarks];
  save();
  return isBookmarked(ref);
}

// ---- highlights (colour 1..4, 0 removes) ----
export const highlightOf = (ref) => data.highlights[ref] ?? 0;
export function setHighlight(refs, color) {
  for (const ref of refs) { if (color) data.highlights[ref] = color; else delete data.highlights[ref]; }
  save();
}

// ---- notes ----
export const noteOf = (ref) => data.notes[ref]?.text ?? '';
export function setNote(ref, text) {
  const t = text.trim();
  if (t) data.notes[ref] = { text: t, at: Date.now() }; else delete data.notes[ref];
  save();
}

// ---- picture edits ----
export const artEditOf = (ref) => data.artEdits[ref] ?? null;
export function setArtEdit(ref, edit) {
  if (edit) data.artEdits[ref] = edit; else delete data.artEdits[ref];
  save();
}

// ---- recent searches ----
export function addRecent(q) {
  const v = q.trim();
  if (!v) return;
  data.recent = [v, ...data.recent.filter((x) => x !== v)].slice(0, 8);
  save();
}
export function clearRecent() { data.recent = []; save(); }

// ---- backup ----
const BACKUP_KEYS = ['bookmarks', 'highlights', 'notes', 'artEdits', 'recent', 'show', 'uiLang', 'textSize', 'motion', 'idle', 'speed', 'pictures', 'theme', 'lastRead'];
export function exportData() {
  const out = { app: 'crochet-bible', version: 1, savedAt: new Date().toISOString() };
  for (const k of BACKUP_KEYS) out[k] = data[k];
  return JSON.stringify(out, null, 1);
}
/** Merge a backup into this device. Returns how many saved items it contained. */
export function importData(text) {
  const obj = JSON.parse(text);
  if (obj?.app !== 'crochet-bible') throw new Error('This is not a Crochet Bible backup.');
  const known = new Set(data.bookmarks.map((b) => b.ref));
  data.bookmarks = [...data.bookmarks, ...(obj.bookmarks ?? []).filter((b) => b && !known.has(b.ref))];
  Object.assign(data.highlights, obj.highlights ?? {});
  Object.assign(data.notes, obj.notes ?? {});
  Object.assign(data.artEdits, obj.artEdits ?? {});
  for (const k of ['uiLang', 'textSize', 'motion', 'idle', 'speed', 'pictures', 'theme']) if (obj[k] !== undefined) data[k] = obj[k];
  save();
  return (obj.bookmarks?.length ?? 0) + Object.keys(obj.highlights ?? {}).length + Object.keys(obj.notes ?? {}).length + Object.keys(obj.artEdits ?? {}).length;
}
