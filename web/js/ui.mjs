// Small UI toolkit shared by every screen: DOM builder, toast, bottom sheet, icons, verse text.
import * as data from './data.mjs';
import { settings, hasSeen } from './store.mjs';
import { t, getLang } from './i18n.mjs';
import { BOOK_BY_ID, splitRef } from '../core/books.mjs';
import { formatReference } from '../core/reference.mjs';

export const $ = (sel, el = document) => el.querySelector(sel);

/** h('div', {class:'x', onClick: fn}, child, [children]) -> element */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export const isTamilText = (s) => /[஀-௿]/.test(s);
export const vInfo = (id) => data.bible.versions().find((v) => v.id === id);
export const langClass = (id) => (vInfo(id)?.lang === 'ta' ? 'ta' : 'en');
export const bookName = (id, lang = getLang()) => (lang === 'ta' ? BOOK_BY_ID.get(id).ta : BOOK_BY_ID.get(id).en);
/** [main label, other-language label] for a verse, in the interface language. */
export function refLabels(ref) {
  const s = splitRef(ref);
  const a = getLang();
  return [formatReference(s, a), formatReference(s, a === 'ta' ? 'en' : 'ta')];
}
/** "John 3:16-18" style label for several verses of one chapter. */
export function rangeLabel(refs, lang = getLang()) {
  const sorted = [...refs].sort((a, b) => a - b);
  const first = splitRef(sorted[0]);
  const last = splitRef(sorted[sorted.length - 1]);
  const base = formatReference(first, lang);
  if (sorted.length === 1 || first.book !== last.book || first.chapter !== last.chapter) return base;
  return `${base}-${last.verse}`;
}

// ---- screen lifecycle: things to stop when the screen changes ----
let cleanups = [];
export const onLeave = (fn) => cleanups.push(fn);
export function runCleanups() { cleanups.forEach((f) => { try { f(); } catch { /* ignore */ } }); cleanups = []; }

/** The device asks for less motion (an accessibility setting). Always respected, even for "Watch again". */
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Is the crocheting animation allowed at all (not switched off, not "reduce motion")? */
export const motionOn = () => settings.motion !== 'off' && !reducedMotion();
/** Should this verse's picture be crocheted now? "first": only if it has not been shown before. */
export const shouldReveal = (ref) => motionOn() && (settings.motion === 'always' || !hasSeen(ref));
export const idleOn = () => settings.idle && !matchMedia('(prefers-reduced-motion: reduce)').matches;

export function toast(msg) {
  const el = h('div', { class: 'toast', role: 'status' }, msg);
  document.body.append(el);
  setTimeout(() => el.classList.add('out'), 1800);
  setTimeout(() => el.remove(), 2300);
}

/** Text with the searched words wrapped in <mark>. */
export function highlight(text, re) {
  if (!re) return text;
  const frag = document.createDocumentFragment();
  let last = 0, m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) {
    if (!m[0]) { re.lastIndex++; continue; }
    if (m.index > last) frag.append(text.slice(last, m.index));
    frag.append(h('mark', null, m[0]));
    last = m.index + m[0].length;
  }
  frag.append(text.slice(last));
  return frag;
}

/** The verse in every shown version. */
export function textBlocks(texts, { re = null, compact = false } = {}) {
  const ids = settings.show.filter((id) => data.bible.hasShard(id));
  return ids.map((id) => {
    const v = vInfo(id);
    const body = texts?.[id];
    return h('p', { class: `vtext ${langClass(id)}${compact ? ' compact' : ''}` },
      ids.length > 1 ? h('span', { class: 'badge', title: v.name }, v.abbr) : null,
      h('span', { class: 'vt' }, body ? highlight(body, re) : h('span', { class: 'na' }, t('notInVersion'))));
  });
}

const ICONS = {
  home: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  books: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H11v16H5.5A1.5 1.5 0 0 0 4 20.5zM20 4.5A1.5 1.5 0 0 0 18.5 3H13v16h5.5a1.5 1.5 0 0 1 1.5 1.5zM4 20.5A1.5 1.5 0 0 0 5.5 22H18.5a1.5 1.5 0 0 0 1.5-1.5',
  search: 'M10.5 3a7.5 7.5 0 1 0 4.7 13.3l4.5 4.5 1.4-1.4-4.5-4.5A7.5 7.5 0 0 0 10.5 3z',
  saved: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1L15 3.5h-4l-.4 2.6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4z',
};
export function icon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(ns, 'path');
  p.setAttribute('d', ICONS[name]);
  svg.append(p);
  return svg;
}

/**
 * Bottom sheet. `body(close)` returns the content.
 * @param {{compact?:boolean, clear?:boolean, onClose?:Function}} [o] compact = short sheet; clear = no dimmed backdrop
 */
export function openSheet(title, body, { compact = false, clear = false, onClose } = {}) {
  document.querySelector('.overlay')?.remove();
  const close = () => { overlay.remove(); document.removeEventListener('keydown', esc); onClose?.(); };
  const esc = (e) => { if (e.key === 'Escape') close(); };
  const overlay = h('div', { class: `overlay${clear ? ' clear' : ''}`, onClick: (e) => { if (e.target === overlay) close(); } },
    h('div', { class: `sheet${compact ? ' compact' : ''}`, role: 'dialog', 'aria-label': title },
      h('div', { class: 'sheet-head' }, h('strong', null, title), h('button', { class: 'btn small', type: 'button', onClick: close, 'aria-label': t('back') }, '✕')),
      body(close)));
  document.addEventListener('keydown', esc);
  document.body.append(overlay);
  return { close };
}
