// The picture side of a verse: scenes (with the reader's own edits applied), the verse card with
// the crocheting animation, the picture editor, and sharing a verse as an image.
import * as data from './data.mjs';
import { settings, isBookmarked, toggleBookmark, artEditOf, setArtEdit, noteOf } from './store.mjs';
import { t, getLang } from './i18n.mjs';
import { CrochetCanvas } from './crochet.mjs';
import { composeScene, describeScene } from '../core/art/compose.mjs';
import { SETTINGS, TIMES, MOODS, SPRITE_LIST } from '../core/art/spec.mjs';
import { splitRef } from '../core/books.mjs';
import { h, toast, onLeave, openSheet, textBlocks, refLabels, bookName, motionOn, idleOn, isTamilText } from './ui.mjs';
import { label, figureLabel } from './labels.mjs';

/** Fired with the verse ref whenever a picture is edited, so thumbnails repaint. */
export const artEvents = new EventTarget();

/** The picture description for a verse: the one chosen from its words, unless the reader changed it. */
export function specOf(ref) {
  const base = data.art.specFor(ref);
  const e = artEditOf(ref);
  if (!e) return { spec: base, variant: 0 };
  return {
    spec: { setting: e.setting ?? base.setting, time: e.time ?? base.time, mood: e.mood ?? base.mood, hero: e.hero ?? base.hero, props: e.props ?? base.props },
    variant: e.variant ?? 0,
  };
}
export function sceneOf(ref) {
  const { spec, variant } = specOf(ref);
  return composeScene(spec, ref, variant);
}

function cellFor(maxWidth = 640) {
  const w = Math.min(window.innerWidth - 32, maxWidth);
  return Math.max(5, Math.min(13, Math.floor(w / 50)));
}

/**
 * The verse card: picture, reference, text and actions.
 * @param {number} ref
 * @param {{autoplay?:boolean, nav?:Node|null}} [o]
 */
export function verseCard(ref, { autoplay = true, nav = null } = {}) {
  let scene = sceneOf(ref);
  const canvas = h('canvas', { class: 'art', role: 'img', 'aria-label': describeScene(specOf(ref).spec) });
  const cc = new CrochetCanvas(canvas, { cell: cellFor() });
  cc.setScene(scene);
  onLeave(() => cc.stop());

  const total = scene.w * scene.h;
  const bar = h('div', { class: 'bar' });
  const count = h('span', { class: 'count' });
  const progress = h('div', { class: 'progress', 'aria-hidden': 'true' }, bar, count);
  const replayBtn = h('button', { class: 'btn primary', type: 'button' });
  let stitching = false;

  const setIdle = () => {
    stitching = false;
    replayBtn.textContent = t('watchAgain');
    progress.classList.add('done');
    count.textContent = `${total.toLocaleString()} ${t('stitches')}`;
    bar.style.width = '100%';
  };
  const start = (opts = {}) => {
    if (!motionOn()) { cc.finish({ idle: idleOn() }); setIdle(); return; }
    stitching = true;
    progress.classList.remove('done');
    replayBtn.textContent = t('skip');
    cc.reveal({
      speed: settings.speed, idle: idleOn(), ...opts,
      onProgress: (d) => { bar.style.width = `${(d / total) * 100}%`; count.textContent = `${d.toLocaleString()} / ${total.toLocaleString()} ${t('stitches')}`; },
      onDone: setIdle,
    });
  };
  const finishNow = () => { cc.finish({ idle: idleOn() }); setIdle(); };
  replayBtn.addEventListener('click', () => { if (stitching) finishNow(); else start(); });
  canvas.addEventListener('click', () => { if (stitching) finishNow(); });
  if (autoplay) start(); else { cc.finish({ idle: idleOn() }); setIdle(); }

  const [main, other] = refLabels(ref);
  const textsWrap = h('div', { class: 'texts' });
  const noteBox = h('blockquote', { class: 'note-view' });
  const fill = () => {
    textsWrap.replaceChildren(...textBlocks(data.bible.textsFor([ref], settings.show).get(ref)));
    const n = noteOf(ref);
    noteBox.textContent = n;
    noteBox.hidden = !n;
  };
  fill();

  const starBtn = h('button', { class: 'btn', type: 'button' });
  const paintStar = () => {
    const on = isBookmarked(ref);
    starBtn.setAttribute('aria-pressed', on);
    starBtn.textContent = `${on ? '★' : '☆'} ${on ? t('unsave') : t('save')}`;
  };
  paintStar();
  starBtn.addEventListener('click', () => { toggleBookmark(ref); paintStar(); starBtn.classList.add('pop'); setTimeout(() => starBtn.classList.remove('pop'), 400); });

  const copyBtn = h('button', { class: 'btn', type: 'button', onClick: async () => {
    const texts = data.bible.textsFor([ref], settings.show).get(ref);
    const body = settings.show.map((id) => texts[id]).filter(Boolean).join('\n\n');
    try { await navigator.clipboard.writeText(`${main}\n${body}`); toast(t('copied')); } catch { toast(t('failed')); }
  } }, t('copy'));
  const shareBtn = h('button', { class: 'btn', type: 'button', onClick: () => shareImage(ref, sceneOf(ref), main, data.bible.textsFor([ref], settings.show).get(ref)) }, t('share'));

  /** Redraw after the picture was edited. */
  const refresh = () => {
    scene = sceneOf(ref);
    canvas.setAttribute('aria-label', describeScene(specOf(ref).spec));
    cc.setScene(scene);
    start({ duration: 1500 });
  };
  const editBtn = h('button', { class: 'btn', type: 'button', onClick: () => openPictureEditor(ref, refresh) }, `✎ ${t('editPicture')}`);

  const s = splitRef(ref);
  return h('section', { class: 'verse-card' },
    h('div', { class: 'art-wrap' }, canvas, progress),
    h('div', { class: 'ref-line' }, h('h2', null, main), h('span', { class: 'alt' }, other)),
    textsWrap, noteBox,
    h('div', { class: 'actions' }, replayBtn, starBtn, editBtn, copyBtn, shareBtn),
    h('div', { class: 'actions secondary' },
      h('a', { class: 'link', href: `#/read/${s.book}/${s.chapter}/${s.verse}` }, `${t('openChapter')} · ${bookName(s.book)} ${s.chapter}`),
      nav));
}

/** Choose the place, hour, mood and figures of a verse's picture, or shuffle the layout. */
export function openPictureEditor(ref, onChange) {
  const lang = getLang();
  const commit = (patch) => {
    const { spec, variant } = specOf(ref);
    setArtEdit(ref, { setting: spec.setting, time: spec.time, mood: spec.mood, hero: spec.hero, props: spec.props, variant, ...patch });
    artEvents.dispatchEvent(new CustomEvent('change', { detail: ref }));
    onChange();
  };
  openSheet(t('editPicture'), (close) => {
    const { spec } = specOf(ref);
    const field = (text, options, value, onPick) => h('label', { class: 'field' }, h('span', null, text),
      h('select', { onChange: (e) => onPick(e.target.value) },
        options.map(([v, l]) => h('option', { value: v, selected: v === value }, l))));
    const figures = SPRITE_LIST.filter((n) => n !== 'spark').map((n) => [n, figureLabel(n, lang)]);
    const optional = [['', '—'], ...figures];
    const setProp = (i, v) => {
      const props = [...specOf(ref).spec.props];
      props[i] = v || undefined;
      commit({ props: props.filter(Boolean) });
    };
    return h('div', { class: 'sheet-body editor' },
      h('p', { class: 'note' }, t('editHint')),
      h('div', { class: 'fields' },
        field(t('place'), SETTINGS.map((v) => [v, label('setting', v, lang)]), spec.setting, (v) => commit({ setting: v })),
        field(t('timeOfDay'), TIMES.map((v) => [v, label('time', v, lang)]), spec.time, (v) => commit({ time: v })),
        field(t('mood'), MOODS.map((v) => [v, label('mood', v, lang)]), spec.mood, (v) => commit({ mood: v })),
        field(t('mainFigure'), figures, spec.hero, (v) => commit({ hero: v })),
        field(t('alsoShow'), optional, spec.props[0] ?? '', (v) => setProp(0, v)),
        field(`${t('alsoShow')} 2`, optional, spec.props[1] ?? '', (v) => setProp(1, v))),
      h('div', { class: 'actions' },
        h('button', { class: 'btn primary', type: 'button', onClick: () => commit({ variant: (specOf(ref).variant || 0) + 1 }) }, `⟳ ${t('shuffle')}`),
        h('button', { class: 'btn', type: 'button', onClick: () => { setArtEdit(ref, null); artEvents.dispatchEvent(new CustomEvent('change', { detail: ref })); onChange(); close(); } }, t('resetPicture'))));
  }, { compact: true, clear: true });
}

/** A shareable PNG: the picture, the reference and the verse text on a cream card. */
export async function shareImage(ref, scene, labelText, texts) {
  const tmp = document.createElement('canvas');
  const cc = new CrochetCanvas(tmp, { cell: 14 });
  cc.setScene(scene); cc.showStill();
  const Wd = 1080, pad = 48, innerW = Wd - pad * 2;
  const lines = [];
  const measure = document.createElement('canvas').getContext('2d');
  const wrap = (text, font) => {
    measure.font = font;
    const out = []; let cur = '';
    for (const word of text.split(/\s+/)) {
      const next = cur ? `${cur} ${word}` : word;
      if (measure.measureText(next).width > innerW && cur) { out.push(cur); cur = word; } else cur = next;
    }
    if (cur) out.push(cur);
    return out;
  };
  for (const id of settings.show) {
    const txt = texts?.[id];
    if (!txt) continue;
    const ta = isTamilText(txt);
    const font = ta ? '34px "Noto Sans Tamil","Tamil Sangam MN",sans-serif' : '36px Georgia,"Iowan Old Style",serif';
    for (const l of wrap(txt, font)) lines.push({ text: l, font, h: ta ? 54 : 50 });
    lines.push({ text: '', font, h: 22 });
  }
  const artH = Math.round((innerW * tmp.height) / tmp.width);
  const textH = lines.reduce((n, l) => n + l.h, 0);
  const out = document.createElement('canvas');
  out.width = Wd; out.height = pad + artH + 40 + 56 + 20 + textH + 60 + pad;
  const c = out.getContext('2d');
  c.fillStyle = '#fbf5ea'; c.fillRect(0, 0, out.width, out.height);
  c.drawImage(cc.fabric, pad, pad, innerW, artH);
  let y = pad + artH + 70;
  c.fillStyle = '#b94a30'; c.font = 'bold 44px system-ui,sans-serif'; c.fillText(labelText, pad, y);
  y += 30;
  c.fillStyle = '#3b2b25';
  for (const l of lines) { y += l.h; c.font = l.font; if (l.text) c.fillText(l.text, pad, y - 14); }
  c.fillStyle = '#9a8573'; c.font = '26px system-ui,sans-serif';
  c.fillText(t('appName'), pad, out.height - pad + 6);
  const blob = await new Promise((res) => out.toBlob(res, 'image/png'));
  const file = new File([blob], `${labelText.replace(/[^\w஀-௿]+/g, '-')}.png`, { type: 'image/png' });
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: labelText }); return; }
  } catch (e) { if (e?.name === 'AbortError') return; }
  const a = h('a', { href: URL.createObjectURL(blob), download: file.name });
  document.body.append(a); a.click(); a.remove();
  toast(t('shared'));
}
