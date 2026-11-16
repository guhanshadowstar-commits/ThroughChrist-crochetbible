// The screens: home, reader, verse, search, saved and settings, plus the book picker.
import * as data from './data.mjs';
import {
  settings, isBookmarked, toggleBookmark, highlightOf, setHighlight, noteOf, setNote, addRecent, clearRecent, exportData, importData,
} from './store.mjs';
import { t, getLang, setLang } from './i18n.mjs';
import { thumb } from './thumbs.mjs';
import { verseOfTheDay } from './popular.mjs';
import { verseCard } from './art-view.mjs';
import { h, toast, openSheet, onLeave, textBlocks, refLabels, bookName, vInfo, langClass, rangeLabel } from './ui.mjs';
import { BOOKS, BOOK_BY_ID, refId, splitRef } from '../core/books.mjs';
import { parseReference } from '../core/reference.mjs';
import { highlightRegex } from '../core/query.mjs';
import { scopeRange } from '../core/scope.mjs';

const fire = (name) => window.dispatchEvent(new Event(name));
const rerender = () => fire('app:rerender');

let allRefsCache = null;
export const allRefs = () => (allRefsCache ??= data.bible.allRefs());

// ---------------------------------------------------------------- versions on this device
async function toggleVersion(id, on, el) {
  if (on) {
    if (settings.show.length >= 4) { toast(t('maxVersions')); return false; }
    if (!data.bible.hasShard(id)) {
      el?.classList.add('busy');
      try {
        await data.loadVersion(id, (p) => { el?.style.setProperty('--p', `${Math.round(p * 100)}%`); });
        if (!settings.installed.includes(id)) settings.installed = [...settings.installed, id];
      } catch (e) { toast(`${t('failed')}: ${e.message}`); el?.classList.remove('busy'); return false; }
      el?.classList.remove('busy');
    }
    settings.show = [...settings.show, id];
  } else {
    if (settings.show.length <= 1) { toast(t('alone')); return false; }
    settings.show = settings.show.filter((x) => x !== id);
    data.unloadVersion(id);
  }
  return true;
}

function chipRow(onChange) {
  const row = h('div', { class: 'chips' });
  const paint = () => {
    row.replaceChildren(...data.manifest.versions.map((mv) => {
      const v = vInfo(mv.id);
      const on = settings.show.includes(v.id);
      return h('button', {
        class: `chip${on ? ' on' : ''}`, type: 'button', title: v.name, 'aria-pressed': on,
        onClick: async (e) => { await toggleVersion(v.id, !on, e.currentTarget); paint(); onChange?.(); },
      }, v.abbr, settings.installed.includes(v.id) || on ? null : h('small', null, ` ↓${data.bytesLabel(mv.bytes)}`));
    }));
  };
  paint();
  return row;
}

export function versionSheet(onChange) {
  openSheet(t('versions'), () => h('div', { class: 'sheet-body' }, h('p', { class: 'note' }, t('offlineNote')), chipRow(onChange)));
}

const versionPill = (onChange) => h('button', { class: 'vpill', type: 'button', onClick: () => versionSheet(onChange) },
  settings.show.map((id) => vInfo(id).abbr).join(' · '), ' ▾');

// ---------------------------------------------------------------- book and chapter picker
/** The sheet behind the book icon in the bottom bar. */
export function bookPicker() {
  const last = settings.lastRead;
  openSheet(t('chooseBook'), (close) => {
    const wrap = h('div', { class: 'sheet-body picker' });
    const filter = h('input', { type: 'search', class: 'picker-filter', placeholder: t('filterBooks'), autocomplete: 'off', 'aria-label': t('filterBooks') });
    const body = h('div');
    const go = (book, chapter) => { close(); location.hash = `#/read/${book}/${chapter}`; };

    const showChapters = (book) => {
      const n = data.bible.chapterCount(book);
      body.replaceChildren(
        h('button', { class: 'btn small', type: 'button', onClick: showBooks }, `‹ ${t('back')}`),
        h('h3', null, `${bookName(book)} · ${t('chapter')}`),
        h('div', { class: 'grid chapters' }, Array.from({ length: n }, (_, i) =>
          h('button', { class: `cell${book === last.book && i + 1 === last.chapter ? ' now' : ''}`, type: 'button', onClick: () => go(book, i + 1) }, i + 1))));
    };
    function showBooks() {
      const q = filter.value.trim().toLowerCase();
      const match = (b) => !q || b.en.toLowerCase().includes(q) || b.ta.includes(q) || b.usfm.toLowerCase().startsWith(q);
      const sections = [['OT', t('oldTestament')], ['NT', t('newTestament')]].map(([tm, label]) => {
        const list = BOOKS.filter((b) => b.testament === tm && match(b));
        return list.length ? [h('h3', null, label), h('div', { class: 'grid books' }, list.map((b) =>
          h('button', { class: `cell${b.id === last.book ? ' now' : ''}`, type: 'button', onClick: () => showChapters(b.id) }, bookName(b.id), h('small', null, b.chapters ?? data.bible.chapterCount(b.id)))))] : [];
      }).flat();
      body.replaceChildren(...(sections.length ? sections : [h('p', { class: 'note' }, t('noResults'))]));
    }
    filter.addEventListener('input', showBooks);
    filter.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = filter.value.trim().toLowerCase();
      const hits = BOOKS.filter((b) => b.en.toLowerCase().includes(q) || b.ta.includes(q));
      if (hits.length === 1) showChapters(hits[0].id);
    });
    wrap.append(
      h('button', { class: 'continue', type: 'button', onClick: () => go(last.book, last.chapter) },
        h('span', null, t('continueReading')), h('strong', null, `${bookName(last.book)} ${last.chapter}`), ' ›'),
      filter, body);
    showBooks();
    return wrap;
  });
}

// ---------------------------------------------------------------- notes and highlights
export function openNoteEditor(ref, after) {
  const [label] = refLabels(ref);
  openSheet(`${t('note')} · ${label}`, (close) => {
    const box = h('textarea', { class: 'note-input', rows: 5, placeholder: t('noteHint'), 'aria-label': t('note') }, noteOf(ref));
    setTimeout(() => box.focus(), 50);
    return h('div', { class: 'sheet-body' }, box,
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onClick: () => { setNote(ref, box.value); close(); after?.(); } }, t('saveNote')),
        noteOf(ref) ? h('button', { class: 'btn', type: 'button', onClick: () => { setNote(ref, ''); close(); after?.(); } }, t('deleteNote')) : null));
  }, { compact: true });
}

const HL_COLORS = [1, 2, 3, 4];
function openHighlightPicker(refs, after) {
  openSheet(t('highlight'), (close) => h('div', { class: 'sheet-body' },
    h('div', { class: 'hl-row' },
      HL_COLORS.map((c) => h('button', { class: `hl-dot hl${c}`, type: 'button', 'aria-label': `${t('highlight')} ${c}`, onClick: () => { setHighlight(refs, c); close(); after?.(); } })),
      h('button', { class: 'btn small', type: 'button', onClick: () => { setHighlight(refs, 0); close(); after?.(); } }, t('clearHighlight')))), { compact: true });
}

// ---------------------------------------------------------------- home
export function homeView() {
  const ref = verseOfTheDay();
  const last = settings.lastRead;
  const randomRef = () => allRefs()[Math.floor(Math.random() * allRefs().length)];
  const q = h('input', { type: 'search', placeholder: t('searchPlaceholder'), autocomplete: 'off', 'aria-label': t('search') });
  return h('div', { class: 'page home' },
    h('form', { class: 'searchbar', onSubmit: (e) => { e.preventDefault(); if (q.value.trim()) location.hash = `#/search?q=${encodeURIComponent(q.value.trim())}`; } },
      q, h('button', { class: 'btn primary', type: 'submit' }, t('searchGo'))),
    h('p', { class: 'kicker' }, t('verseOfDay')),
    verseCard(ref, { autoplay: true }),
    h('div', { class: 'row-cards' },
      h('a', { class: 'tile', href: `#/read/${last.book}/${last.chapter}` }, h('span', { class: 'tile-k' }, t('continueReading')), h('strong', null, `${bookName(last.book)} ${last.chapter}`)),
      h('button', { class: 'tile', type: 'button', onClick: () => { location.hash = `#/verse/${randomRef()}`; } }, h('span', { class: 'tile-k' }, '✦'), h('strong', null, t('surprise'))),
      h('button', { class: 'tile', type: 'button', onClick: bookPicker }, h('span', { class: 'tile-k' }, t('books')), h('strong', null, t('chooseBook'))),
      h('a', { class: 'tile', href: '#/saved' }, h('span', { class: 'tile-k' }, '★'), h('strong', null, t('saved')))),
    h('p', { class: 'note' }, t('pictureNote')));
}

// ---------------------------------------------------------------- one verse, full screen
export function verseView(ref) {
  if (!data.art.has(ref)) return h('div', { class: 'page' }, h('p', null, t('failed')));
  const refs = allRefs();
  let lo = 0, hi = refs.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (refs[mid] < ref) lo = mid + 1; else hi = mid; }
  const prev = refs[lo - 1], next = refs[lo + 1];
  const go = (r) => { if (r) location.hash = `#/verse/${r}`; };
  const nav = h('div', { class: 'pn' },
    h('button', { class: 'btn', type: 'button', disabled: !prev, onClick: () => go(prev) }, `‹ ${t('prev')}`),
    h('button', { class: 'btn', type: 'button', disabled: !next, onClick: () => go(next) }, `${t('next')} ›`));
  const key = (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'ArrowLeft') go(prev);
    if (e.key === 'ArrowRight') go(next);
  };
  document.addEventListener('keydown', key);
  onLeave(() => document.removeEventListener('keydown', key));
  const card = verseCard(ref, { autoplay: true, nav });
  // swipe sideways to move to the next or previous verse
  let sx = 0, sy = 0;
  card.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  card.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 45) go(dx < 0 ? next : prev);
  }, { passive: true });
  return h('div', { class: 'page verse-page' }, card);
}

// ---------------------------------------------------------------- reader
export function readView(book, chapter, flash) {
  const max = data.bible.chapterCount(book);
  if (!max || chapter < 1 || chapter > max) return h('div', { class: 'page' }, h('p', null, t('failed')));
  settings.lastRead = { book, chapter };
  let prev = null, next = null;
  if (chapter > 1) prev = [book, chapter - 1]; else if (book > 1) prev = [book - 1, data.bible.chapterCount(book - 1)];
  if (chapter < max) next = [book, chapter + 1]; else if (book < 66) next = [book + 1, 1];
  const go = (p) => { if (p) location.hash = `#/read/${p[0]}/${p[1]}`; };

  const selected = new Set();
  const rows = new Map(); // ref -> row element
  const list = h('div', { class: 'verses' });
  const bar = h('div', { class: 'selbar', hidden: true, role: 'toolbar', 'aria-label': t('selected') });

  const markRow = (ref) => {
    const row = rows.get(ref);
    if (!row) return;
    const hl = highlightOf(ref);
    row.className = `verse${selected.has(ref) ? ' sel' : ''}${hl ? ` hl${hl}` : ''}${ref === flashRef ? ' flash' : ''}`;
    const num = row.querySelector('.vnum');
    num.querySelector('i')?.remove();
    const marks = `${isBookmarked(ref) ? '★' : ''}${noteOf(ref) ? '✎' : ''}`;
    if (marks) num.append(h('i', null, marks));
  };
  const flashRef = flash ? refId(book, chapter, flash) : null;

  const paintBar = () => {
    bar.hidden = selected.size === 0;
    if (!selected.size) return;
    const refs = [...selected].sort((a, b) => a - b);
    const allSaved = refs.every(isBookmarked);
    const single = refs.length === 1;
    bar.replaceChildren(
      h('span', { class: 'selcount' }, rangeLabel(refs)),
      h('button', { class: 'btn small', type: 'button', onClick: () => { location.hash = `#/verse/${refs[0]}`; } }, `🧶 ${t('picture')}`),
      h('button', { class: 'btn small', type: 'button', onClick: async () => {
        const texts = data.bible.textsFor(refs, settings.show);
        const body = refs.map((r) => {
          const parts = settings.show.map((id) => texts.get(r)[id]).filter(Boolean);
          return `${refs.length > 1 ? `${splitRef(r).verse} ` : ''}${parts.join('\n')}`;
        }).join('\n');
        try { await navigator.clipboard.writeText(`${rangeLabel(refs)}\n${body}`); toast(t('copied')); } catch { toast(t('failed')); }
      } }, t('copy')),
      h('button', { class: 'btn small', type: 'button', onClick: () => { refs.forEach((r) => { if (allSaved ? isBookmarked(r) : !isBookmarked(r)) toggleBookmark(r); markRow(r); }); paintBar(); } }, allSaved ? `★ ${t('unsave')}` : `☆ ${t('save')}`),
      h('button', { class: 'btn small', type: 'button', onClick: () => openHighlightPicker(refs, () => { refs.forEach(markRow); }) }, `🖍 ${t('highlight')}`),
      single ? h('button', { class: 'btn small', type: 'button', onClick: () => openNoteEditor(refs[0], () => { markRow(refs[0]); }) }, `✎ ${t('note')}`) : null,
      h('button', { class: 'btn small ghost', type: 'button', onClick: () => { const old = [...selected]; selected.clear(); old.forEach(markRow); paintBar(); }, 'aria-label': t('clear') }, '✕'));
  };

  const toggle = (ref) => { if (selected.has(ref)) selected.delete(ref); else selected.add(ref); markRow(ref); paintBar(); };

  const paint = () => {
    const verses = data.bible.chapter(book, chapter, settings.show);
    rows.clear();
    list.style.setProperty('--n', settings.show.length);
    list.classList.toggle('parallel', settings.show.length > 1);
    list.replaceChildren(...verses.map((v) => {
      const row = h('div', { id: `v${v.verse}`, role: 'button', tabindex: 0, 'aria-label': `${t('chapter')} ${chapter}:${v.verse}`,
        onClick: (e) => { if (!e.target.closest('.thumbbtn')) toggle(v.ref); },
        onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(v.ref); } } },
      h('span', { class: 'vnum' }, v.verse),
      h('div', { class: 'vbody' }, textBlocks(v.texts)),
      settings.pictures ? h('a', { class: 'thumbbtn', href: `#/verse/${v.ref}`, 'aria-label': t('picture') }, thumb(v.ref)) : null);
      rows.set(v.ref, row);
      markRow(v.ref);
      return row;
    }));
    selected.clear(); paintBar();
  };
  paint();
  if (flash) requestAnimationFrame(() => document.getElementById(`v${flash}`)?.scrollIntoView({ block: 'center' }));
  onLeave(() => bar.remove());
  document.body.append(bar);

  const key = (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'ArrowLeft' && e.altKey) go(prev);
    if (e.key === 'ArrowRight' && e.altKey) go(next);
    if (e.key === 'Escape' && selected.size) { const old = [...selected]; selected.clear(); old.forEach(markRow); paintBar(); }
  };
  document.addEventListener('keydown', key);
  onLeave(() => document.removeEventListener('keydown', key));

  return h('div', { class: 'page read' },
    h('div', { class: 'read-head' },
      h('button', { class: 'btn', type: 'button', disabled: !prev, onClick: () => go(prev), 'aria-label': t('prev') }, '‹'),
      h('button', { class: 'btn title-btn', type: 'button', onClick: bookPicker },
        h('strong', null, `${bookName(book)} ${chapter}`), h('span', { class: 'alt' }, bookName(book, getLang() === 'ta' ? 'en' : 'ta')), ' ▾'),
      h('button', { class: 'btn', type: 'button', disabled: !next, onClick: () => go(next), 'aria-label': t('next') }, '›')),
    h('div', { class: 'row small tools' }, versionPill(paint), h('span', { class: 'hint' }, t('tapToSelect'))),
    list,
    h('div', { class: 'read-foot' },
      h('button', { class: 'btn', type: 'button', disabled: !prev, onClick: () => go(prev) }, `‹ ${t('prev')}`),
      h('button', { class: 'btn', type: 'button', disabled: !next, onClick: () => go(next) }, `${t('next')} ›`)));
}

// ---------------------------------------------------------------- search
function scopeOptions() {
  return [
    ['all', t('wholeBible')], ['ot', t('oldTestament')], ['nt', t('newTestament')],
    ...BOOKS.map((b) => [`b${b.id}`, bookName(b.id)]),
  ];
}

export function searchView(params) {
  const q0 = params.get('q') ?? '';
  const scope = params.get('scope') ?? 'all';
  const opts = { any: params.get('any') === '1', tanglish: params.get('tanglish') === '1' };
  const input = h('input', { type: 'search', value: q0, placeholder: t('searchPlaceholder'), autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search', 'aria-label': t('search') });
  const anyBox = h('input', { type: 'checkbox', checked: opts.any });
  const tangBox = h('input', { type: 'checkbox', checked: opts.tanglish });
  const scopeSel = h('select', { 'aria-label': t('scope') }, scopeOptions().map(([v, l]) => h('option', { value: v, selected: v === scope }, l)));
  const out = h('div', { class: 'results' });
  const status = h('p', { class: 'status', 'aria-live': 'polite' });
  let offset = 0;

  const submit = (q = input.value.trim()) => {
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (scopeSel.value !== 'all') p.set('scope', scopeSel.value);
    if (anyBox.checked) p.set('any', '1');
    if (tangBox.checked) p.set('tanglish', '1');
    location.hash = `#/search${p.toString() ? `?${p}` : ''}`;
  };

  const tips = () => {
    const kids = [];
    if (settings.recent.length) {
      kids.push(h('div', { class: 'recent' },
        h('div', { class: 'recent-head' }, h('h3', null, t('recent')), h('button', { class: 'link', type: 'button', onClick: () => { clearRecent(); rerender(); } }, t('clear'))),
        h('div', { class: 'chips' }, settings.recent.map((r) => h('button', { class: 'chip', type: 'button', onClick: () => { input.value = r; submit(r); } }, r)))));
    }
    kids.push(h('div', { class: 'tips' }, h('h3', null, t('tipsTitle')), h('ul', null, t('tips').map((x) => h('li', null, x)))));
    return h('div', null, kids);
  };

  const run = (more) => {
    const q = (params.get('q') ?? '').trim();
    if (!more) { offset = 0; out.replaceChildren(); }
    if (!q) { status.textContent = ''; out.append(tips()); return; }

    // "John 3:16", "Psalm 23", "யோவான் 3:16" open the passage instead of searching
    const ref = parseReference(q);
    if (ref && ref.chapter !== null && !more) {
      const found = data.bible.lookup(q, { show: settings.show });
      if (found?.error) { status.textContent = found.error; return; }
      if (found?.verses.length) {
        const first = found.verses[0];
        location.replace(found.verses.length === 1 && ref.verseStart ? `#/verse/${first.ref}` : `#/read/${ref.book}/${found.reference.chapter}${ref.verseStart ? `/${ref.verseStart}` : ''}`);
        return;
      }
    }
    const hasEnglish = settings.show.some((id) => vInfo(id).lang === 'en');
    const res = data.bible.search(q, {
      lang: hasEnglish ? 'all' : 'ta', versions: settings.show, show: settings.show, ...opts, range: scopeRange(scope), limit: 20, offset,
    });
    if (!more) addRecent(q);
    const re = highlightRegex(q);
    status.textContent = res.total ? t('results', res.total, res.truncated) : t('noResults');
    if (!more && ref && ref.chapter === null) {
      out.append(h('a', { class: 'suggest', href: `#/read/${ref.book}/1` }, `${t('openBook')}: ${bookName(ref.book)}`));
    }
    out.querySelector('.more')?.remove();
    res.results.forEach((hit, i) => {
      const [main, other] = refLabels(hit.ref);
      out.append(h('a', { class: 'hit', style: `--i:${Math.min(i, 10)}`, href: `#/verse/${hit.ref}` },
        h('div', { class: 'hit-head' }, h('strong', null, main), h('span', { class: 'alt' }, other)),
        h('div', { class: 'hit-body' }, h('div', { class: 'hit-text' }, textBlocks(hit.texts, { re })), settings.pictures ? thumb(hit.ref) : null)));
    });
    offset += res.results.length;
    if (offset < res.total && res.results.length) out.append(h('button', { class: 'btn more', type: 'button', onClick: () => run(true) }, t('showMore')));
  };

  const page = h('div', { class: 'page search' },
    h('form', { class: 'searchbar', onSubmit: (e) => { e.preventDefault(); submit(); } }, input, h('button', { class: 'btn primary', type: 'submit' }, t('searchGo'))),
    h('div', { class: 'row small opts' },
      h('label', null, t('scope'), ' ', scopeSel),
      h('label', null, anyBox, ' ', t('anyWord')), h('label', null, tangBox, ' ', t('tanglish'))),
    h('div', { class: 'row small' },
      h('span', null, `${t('searchingIn')}: `), h('strong', null, settings.show.map((id) => vInfo(id).abbr).join(' · ')),
      h('button', { class: 'link', type: 'button', onClick: () => versionSheet(() => { rerender(); }) }, t('changeVersions'))),
    status, out);
  anyBox.addEventListener('change', () => submit()); tangBox.addEventListener('change', () => submit()); scopeSel.addEventListener('change', () => submit());
  run(false);
  if (!q0) requestAnimationFrame(() => input.focus());
  return page;
}

// ---------------------------------------------------------------- saved: stars, highlights, notes
export function savedView(params) {
  const tab = ['stars', 'highlights', 'notes'].includes(params.get('tab')) ? params.get('tab') : 'stars';
  const lists = {
    stars: settings.bookmarks.map((b) => b.ref),
    highlights: Object.keys(settings.highlights).map(Number).sort((a, b) => a - b),
    notes: Object.entries(settings.notes).sort((a, b) => b[1].at - a[1].at).map(([r]) => Number(r)),
  };
  const tabs = h('div', { class: 'seg', role: 'tablist' }, [['stars', `★ ${t('saved')}`], ['highlights', `🖍 ${t('highlights')}`], ['notes', `✎ ${t('notes')}`]].map(([k, label]) =>
    h('button', { class: tab === k ? 'on' : '', type: 'button', role: 'tab', 'aria-selected': tab === k, onClick: () => { location.hash = `#/saved?tab=${k}`; } }, `${label} (${lists[k].length})`)));
  const refs = lists[tab];
  const empty = { stars: t('savedEmpty'), highlights: t('highlightsEmpty'), notes: t('notesEmpty') }[tab];
  const texts = data.bible.textsFor(refs, settings.show);
  return h('div', { class: 'page saved' }, tabs,
    refs.length ? refs.map((ref, i) => {
      const [main, other] = refLabels(ref);
      const hl = highlightOf(ref);
      return h('a', { class: `hit${hl ? ` hl${hl}` : ''}`, style: `--i:${Math.min(i, 10)}`, href: `#/verse/${ref}` },
        h('div', { class: 'hit-head' }, h('strong', null, main), h('span', { class: 'alt' }, other)),
        h('div', { class: 'hit-body' },
          h('div', { class: 'hit-text' }, textBlocks(texts.get(ref), { compact: true }),
            noteOf(ref) ? h('blockquote', { class: 'note-view' }, noteOf(ref)) : null),
          settings.pictures ? thumb(ref) : null));
    }) : h('div', { class: 'empty' }, h('div', { class: 'big' }, tab === 'notes' ? '✎' : tab === 'highlights' ? '🖍' : '☆'), h('p', null, empty)));
}

// ---------------------------------------------------------------- settings
export function settingsView() {
  const seg = (key, options, after) => h('div', { class: 'seg', role: 'group' }, options.map(([val, label]) =>
    h('button', { class: settings[key] === val ? 'on' : '', type: 'button', 'aria-pressed': settings[key] === val, onClick: () => { settings[key] = val; after?.(); rerender(); } }, label)));
  const toggle = (key, after) => seg(key, [[true, t('on')], [false, t('off')]], after);

  const rows = data.manifest.versions.map((mv) => {
    const v = vInfo(mv.id);
    const on = settings.show.includes(v.id);
    const have = settings.installed.includes(v.id);
    const barEl = h('span', { class: 'dlbar' });
    const dl = h('button', { class: 'btn small', type: 'button', onClick: async (e) => {
      const el = e.currentTarget;
      if (have && !on) { await data.removeDownload(v.id); settings.installed = settings.installed.filter((x) => x !== v.id); rerender(); return; }
      if (have && on) {
        if (settings.show.length <= 1) { toast(t('alone')); return; }
        settings.show = settings.show.filter((x) => x !== v.id);
        await data.removeDownload(v.id);
        settings.installed = settings.installed.filter((x) => x !== v.id);
        rerender(); return;
      }
      el.disabled = true; el.textContent = t('downloading');
      try {
        await data.loadVersion(v.id, (p) => { barEl.style.width = `${Math.round(p * 100)}%`; });
        settings.installed = [...settings.installed, v.id];
        data.unloadVersion(v.id);
      } catch (err) { toast(`${t('failed')}: ${err.message}`); }
      rerender();
    } }, have ? t('remove') : `${t('download')} · ${data.bytesLabel(mv.bytes)}`);
    return h('li', { class: 'vrow' },
      h('label', { class: 'vsel' },
        h('input', { type: 'checkbox', checked: on, onChange: async (e) => { await toggleVersion(v.id, e.target.checked, null); rerender(); } }),
        h('span', null, h('strong', null, `${v.abbr} `), h('span', { class: langClass(v.id) }, v.name), h('br'), h('small', null, `${v.license}${have ? ` · ${t('onDevice')}` : ''}`))),
      h('div', { class: 'dl' }, dl, h('span', { class: 'dlbar-wrap' }, barEl)));
  });
  const group = (lang, label) => [h('h4', null, label), h('ul', { class: 'vlist' }, rows.filter((_, i) => data.manifest.versions[i].lang === lang))];

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true, onChange: async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { const n = importData(await file.text()); toast(t('imported', n)); fire('app:look'); fire('app:chrome'); rerender(); }
    catch (err) { toast(`${t('failed')}: ${err.message}`); }
  } });

  return h('div', { class: 'page settings' },
    h('section', null, h('h3', null, t('language')), seg('uiLang', [['en', 'English'], ['ta', 'தமிழ்']], () => { setLang(settings.uiLang); fire('app:chrome'); })),
    h('section', null, h('h3', null, t('versions')), h('p', { class: 'note' }, t('offlineNote')), group('en', t('english')), group('ta', t('tamil'))),
    h('section', null,
      h('h3', null, t('textSize')),
      h('input', { type: 'range', min: 0, max: 4, step: 1, value: settings.textSize, 'aria-label': t('textSize'), onInput: (e) => { settings.textSize = Number(e.target.value); fire('app:look'); } }),
      h('h3', null, t('showPictures')), toggle('pictures'),
      h('h3', null, t('theme')), seg('theme', [['auto', t('auto')], ['light', t('light')], ['dark', t('dark')]], () => fire('app:look'))),
    h('section', null,
      h('h3', null, t('motion')), seg('motion', [['first', t('firstTime')], ['always', t('everyTime')], ['off', t('off')]], () => fire('app:look')),
      h('p', { class: 'note' }, t('motionHint')),
      h('h3', null, t('speed')), seg('speed', [['slow', t('slow')], ['normal', t('normal')], ['fast', t('fast')]]),
      h('h3', null, t('idleMotion')), toggle('idle')),
    h('section', null,
      h('h3', null, t('yourData')), h('p', { class: 'note' }, t('dataHint')),
      h('div', { class: 'actions' },
        h('button', { class: 'btn', type: 'button', onClick: () => {
          const blob = new Blob([exportData()], { type: 'application/json' });
          const a = h('a', { href: URL.createObjectURL(blob), download: `crochet-bible-backup-${new Date().toISOString().slice(0, 10)}.json` });
          document.body.append(a); a.click(); a.remove();
        } }, t('exportData')),
        h('button', { class: 'btn', type: 'button', onClick: () => fileInput.click() }, t('importData')), fileInput)),
    h('section', null, h('p', { class: 'note' }, t('installHint'))),
    h('section', { class: 'credits' }, h('h3', null, t('credits')),
      data.bible.versions().map((v) => h('p', null, h('strong', null, `${v.abbr}: `), v.attribution, v.notes ? h('small', null, ` ${v.notes}`) : null))));
}
