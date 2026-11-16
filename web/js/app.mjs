// Crochet Bible: the app shell. Starts the data, draws the header and bottom bar, and shows the
// screen that the URL hash asks for.
import * as data from './data.mjs';
import { settings } from './store.mjs';
import { t, setLang, getLang } from './i18n.mjs';
import { $, h, icon, runCleanups, vInfo } from './ui.mjs';
import { homeView, verseView, readView, searchView, savedView, settingsView, bookPicker } from './views.mjs';

// ---------------------------------------------------------------- look
function applyLook() {
  const sizes = [15, 17, 19, 22, 26];
  const root = document.documentElement;
  root.style.setProperty('--fs', `${sizes[settings.textSize] ?? 19}px`);
  if (settings.theme === 'auto') delete root.dataset.theme; else root.dataset.theme = settings.theme;
  root.dataset.motion = settings.motion;
}

// ---------------------------------------------------------------- header and bottom bar
const TABS = [
  ['home', 'home', () => { location.hash = '#/'; }],
  ['books', 'books', () => bookPicker()],
  ['search', 'search', () => { location.hash = '#/search'; }],
  ['saved', 'saved', () => { location.hash = '#/saved'; }],
  ['settings', 'settings', () => { location.hash = '#/settings'; }],
];

function drawChrome() {
  $('#appname').textContent = t('appName');
  $('#tabs').replaceChildren(...TABS.map(([key, ic, action]) =>
    h('button', { type: 'button', 'data-tab': key, 'aria-label': t(key), onClick: action }, icon(ic), h('span', null, t(key)))));
  $('#langbtn').textContent = getLang() === 'ta' ? 'EN' : 'தமி';
  document.title = t('appName');
  markTab();
}

function markTab() {
  const hash = location.hash || '#/';
  const active = hash.startsWith('#/read') || hash.startsWith('#/verse') ? 'books'
    : hash.startsWith('#/search') ? 'search' : hash.startsWith('#/saved') ? 'saved'
      : hash.startsWith('#/settings') ? 'settings' : 'home';
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === active));
}

// ---------------------------------------------------------------- routing
function route() {
  runCleanups();
  document.querySelector('.overlay')?.remove();
  document.querySelector('.selbar')?.remove();
  const hash = location.hash || '#/';
  let page, m;
  try {
    if ((m = /^#\/read\/(\d+)\/(\d+)(?:\/(\d+))?$/.exec(hash))) page = readView(+m[1], +m[2], m[3] ? +m[3] : null);
    else if ((m = /^#\/verse\/(\d+)$/.exec(hash))) page = verseView(+m[1]);
    else if (hash.startsWith('#/search')) page = searchView(new URLSearchParams(hash.split('?')[1] ?? ''));
    else if (hash.startsWith('#/saved')) page = savedView(new URLSearchParams(hash.split('?')[1] ?? ''));
    else if (hash === '#/settings') page = settingsView();
    else if (hash.startsWith('#/read')) page = readView(settings.lastRead.book, settings.lastRead.chapter, null);
    else page = homeView();
  } catch (e) {
    console.error(e);
    page = h('div', { class: 'page' }, h('p', null, `${t('failed')}: ${e.message}`));
  }
  $('#view').dataset.wide = hash.startsWith('#/read') ? '1' : '';
  $('#view').replaceChildren(page);
  markTab();
  if (!/^#\/read\/\d+\/\d+\/\d+$/.test(hash)) window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- startup
function splash(msg, pct, note) {
  const el = $('#splash');
  el.hidden = false;
  $('#splash-msg').textContent = msg;
  $('#splash-note').textContent = note ?? '';
  $('#splash-bar').style.width = `${Math.round((pct ?? 0) * 100)}%`;
}

async function start() {
  setLang(settings.uiLang);
  applyLook();
  $('#langbtn').addEventListener('click', () => { settings.uiLang = getLang() === 'ta' ? 'en' : 'ta'; setLang(settings.uiLang); drawChrome(); route(); });
  window.addEventListener('app:rerender', route);
  window.addEventListener('app:chrome', () => { setLang(settings.uiLang); drawChrome(); });
  window.addEventListener('app:look', applyLook);
  splash(t('loading'), 0.05);
  try {
    await data.init((s) => splash(t('loading'), s === 'engine' ? 0.1 : 0.2));
    // make sure every version in the shown list is on this device
    const missing = settings.show.filter((id) => !data.bible.hasShard(id));
    const first = missing.some((id) => !settings.installed.includes(id));
    if (first) splash(t('firstRun'), 0.25, t('firstRunNote'));
    const total = missing.length || 1;
    let done = 0;
    for (const id of missing) {
      await data.loadVersion(id, (p) => splash(first ? t('firstRun') : t('loading'), 0.25 + ((done + p) / total) * 0.75, first ? `${vInfo(id).abbr} · ${data.bytesLabel(data.versionInfo(id).bytes)}` : ''));
      done++;
      if (!settings.installed.includes(id)) settings.installed = [...settings.installed, id];
    }
  } catch (e) {
    console.error(e);
    splash(`${t('failed')}: ${e.message}`, 0, '');
    $('#splash-retry').hidden = false;
    $('#splash-retry').textContent = t('retry');
    $('#splash-retry').onclick = () => location.reload();
    return;
  }
  $('#splash').hidden = true;
  drawChrome();
  window.addEventListener('hashchange', route);
  route();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();
