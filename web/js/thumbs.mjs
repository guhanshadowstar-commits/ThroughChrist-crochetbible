// Small crochet pictures for lists (reader, search results, saved). Drawn lazily as they scroll
// into view and as flat colour blocks (a stitch texture would be mush at this size).
import { W, H, describeScene } from '../core/art/compose.mjs';
import { sceneOf, specOf, artEvents } from './art-view.mjs';

const SCALE = 3;
const cache = new Map(); // ref -> painted canvas, so scrolling back is instant
const live = new Set();  // thumbnails currently on screen, repainted when a picture is edited
let observer;

function paint(canvas, ref) {
  let src = cache.get(ref);
  if (!src) {
    const scene = sceneOf(ref);
    const f = scene.frame(0);
    src = document.createElement('canvas');
    src.width = W * SCALE; src.height = H * SCALE;
    const c = src.getContext('2d');
    for (let i = 0; i < f.length; i++) {
      const [r, g, b] = scene.rgb[f[i]];
      c.fillStyle = `rgb(${r},${g},${b})`;
      c.fillRect((i % W) * SCALE, Math.floor(i / W) * SCALE, SCALE, SCALE);
    }
    if (cache.size > 400) cache.delete(cache.keys().next().value);
    cache.set(ref, src);
  }
  canvas.setAttribute('aria-label', describeScene(specOf(ref).spec));
  canvas.getContext('2d').drawImage(src, 0, 0);
}

artEvents.addEventListener('change', (e) => {
  cache.delete(e.detail);
  for (const c of live) if (c.isConnected && c.__ref === e.detail) paint(c, e.detail);
});

/** @returns {HTMLCanvasElement} a thumbnail that paints itself when it becomes visible */
export function thumb(ref, cls = 'thumb') {
  const c = document.createElement('canvas');
  c.width = W * SCALE; c.height = H * SCALE;
  c.className = cls;
  c.setAttribute('role', 'img');
  c.__ref = ref;
  live.add(c);
  if (!('IntersectionObserver' in window)) { paint(c, ref); return c; }
  observer ??= new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      observer.unobserve(e.target);
      paint(e.target, e.target.__ref);
    }
  }, { rootMargin: '200px' });
  observer.observe(c);
  return c;
}
