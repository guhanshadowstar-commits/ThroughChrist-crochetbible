// Crochet sprite library. Each entry draws a small figure from primitives, then gets a dark
// outline and a shaded lower edge (see draw.mjs). Sizes are in stitches.
//
// Biblical figures of God and Christ are never drawn as people: they are shown through symbols
// (light, cross, lamb, crown, dove), which the scene writer chooses.
import { sprite } from './draw.mjs';

const S = sprite;

// ---------- people ----------
export function person({ robe = 'b', skin = 'f', hair = 'M', staff = false, crown = false, halo = false, kid = false, arms = false } = {}) {
  const h = kid ? 11 : 15;
  return S(9, h, (g) => {
    g.circle(4.5, 2.4, 2.3, skin);
    g.ellipse(4.5, 1.5, 2.7, 1.5, hair);
    g.set(3, 3, 'k'); g.set(6, 3, 'k');
    g.poly([[3, 5], [6, 5], [8.6, h - 0.2], [0.4, h - 0.2]], robe);
    g.rect(3, kid ? 7 : 8, 3, 1, 'y'); // sash
    if (arms) { g.rect(0, 5, 1, 3, robe); g.rect(8, 5, 1, 3, robe); g.set(0, 4, skin); g.set(8, 4, skin); }
    else { g.set(1, h - 6, skin); g.set(7, h - 6, skin); }
    if (staff) g.line(8, 0, 8, h - 1, 'm');
    if (crown) { g.rect(2, 0, 5, 1, 'g'); g.set(2, -1, 'g'); g.set(4, -1, 'y'); g.set(6, -1, 'g'); }
    if (halo) g.ellipse(4.5, -0.5, 3, 1, 'y');
  });
}

// ---------- animals ----------
const lambF = (f = 0) => S(15, 11, (g) => {
  g.ellipse(6.5, 5.2, 6, 4, 'w');
  g.circle(3, 2.8, 1.8, 'w'); g.circle(7, 2, 2, 'w'); g.circle(10, 3.2, 1.6, 'w');
  const hy = 4.6 + f * 1.4; // the head dips as the lamb grazes
  g.ellipse(12.8, hy, 2.2, 2.4, 'A');
  g.rect(10, 2 + Math.round(f * 1.4), 2, 2, 'A');
  g.set(13, Math.round(hy - 0.6), 'w'); g.set(14, Math.round(hy + 0.4), 'p');
  g.rect(3, 8, 2, 3, 'A'); g.rect(6, 8, 2, 3, 'A'); g.rect(9, 8, 2, 3, 'A');
  g.set(4, 5, 'c'); g.set(8, 6, 'c'); g.set(6, 4, 'c');
});
const lamb = () => lambF(0);

const sheepSmall = () => S(10, 8, (g) => {
  g.ellipse(4.5, 3.6, 4.2, 3, 'w');
  g.ellipse(8.6, 3.4, 1.6, 1.8, 'A');
  g.rect(2, 6, 1, 2, 'A'); g.rect(6, 6, 1, 2, 'A');
  g.set(9, 3, 'w');
});

const doveF = (f = 0) => S(15, 11, (g) => {
  g.ellipse(7.5, 6.2, 4.4, 2.4, 'w');
  g.circle(11.8, 4.4, 1.9, 'w');
  g.set(13, 4, 'k'); g.set(14, 5, 'o'); g.set(13, 5, 'o');
  if (f === 0) { g.poly([[3, 6], [6, 0], [10, 6]], 'w'); g.line(6, 1, 7, 5, 'c'); } // wing up
  else { g.poly([[3, 6.5], [6.5, 10.5], [10, 6.5]], 'w'); g.line(6.5, 9, 7, 7, 'c'); } // wing down
  g.poly([[3.4, 6.5], [0, 9.5], [1, 6]], 'w');
  g.set(5, 8, 'c'); g.set(7, 8, 'c');
});
const dove = () => doveF(0);

const fishF = (f = 0) => S(14, 8, (g) => {
  g.ellipse(6.2, 4, 5.2, 3.2, 'b');
  g.poly(f ? [[10.5, 4], [14, 2], [14, 8]] : [[10.5, 4], [14, 0], [14, 7]], 'o'); // the tail flicks
  g.set(3, 3, 'k');
  g.line(6, 2, 6, 6, 'q'); g.line(8, 2, 8, 6, 'q');
  g.rect(4, 5, 4, 1, 'S');
});
const fish = () => fishF(0);

const boat = () => S(19, 15, (g) => {
  g.poly([[0, 10], [18, 10], [15, 14], [3, 14]], 'm');
  g.rect(1, 10, 17, 1, 'M');
  g.line(9, 0, 9, 10, 'M');
  g.poly([[10, 1], [10, 9], [17, 9]], 'w');
  g.poly([[8, 2], [8, 9], [2, 9]], 'c');
  g.rect(9, -1, 3, 2, 'r');
});

const ark = () => S(22, 15, (g) => {
  g.poly([[0, 9], [21, 9], [18, 14], [3, 14]], 'm');
  g.rect(4, 4, 14, 6, 'E');
  g.poly([[3, 4], [11, -1], [19, 4]], 'M');
  g.rect(9, 6, 4, 4, 'M'); g.rect(5, 6, 2, 2, 'k'); g.rect(15, 6, 2, 2, 'k');
});

const lion = () => S(18, 13, (g) => {
  g.ellipse(6, 8, 5.6, 3, 'E');
  g.circle(13.5, 5, 4.3, 'o'); g.circle(13.5, 5.6, 2.8, 'y');
  g.set(12, 5, 'k'); g.set(15, 5, 'k'); g.set(13.5, 7, 'r');
  g.rect(2, 10, 2, 3, 'E'); g.rect(8, 10, 2, 3, 'E'); g.rect(11, 10, 2, 3, 'E');
  g.line(0, 6, 1, 3, 'E'); g.set(1, 2, 'o');
});

const camel = () => S(19, 16, (g) => {
  g.ellipse(8.5, 8, 6, 3, 'E');
  g.circle(5.5, 4.6, 2.2, 'E'); g.circle(10.5, 4.6, 2.2, 'E');
  g.poly([[13, 8], [15, 2], [17, 2], [15.5, 9]], 'E');
  g.ellipse(17, 2.2, 2, 1.4, 'E'); g.set(17, 1, 'k');
  g.rect(3, 10, 2, 6, 'm'); g.rect(6, 10, 2, 6, 'm'); g.rect(10, 10, 2, 6, 'm'); g.rect(13, 10, 2, 6, 'm');
  g.line(2, 7, 1, 11, 'm');
});

const donkey = () => S(16, 14, (g) => {
  g.ellipse(7, 6.5, 5.5, 3, 'a');
  g.poly([[11, 6], [12.5, 1], [14.5, 1.5], [13.5, 7]], 'a');
  g.ellipse(14, 2.6, 2.2, 1.7, 'a'); g.rect(12, -1, 1, 3, 'a'); g.rect(14, -1, 1, 3, 'a');
  g.set(15, 3, 'w'); g.set(13, 2, 'k');
  g.rect(3, 9, 2, 5, 'A'); g.rect(5, 9, 2, 5, 'a'); g.rect(8, 9, 2, 5, 'a'); g.rect(10, 9, 2, 5, 'A');
  g.line(1, 5, 0, 9, 'A');
});

const horse = () => S(19, 16, (g) => {
  g.ellipse(8.5, 7, 6.5, 3.2, 'm');
  g.poly([[12, 7], [14, 1], [17, 2], [15, 8]], 'm');
  g.ellipse(16.4, 2.6, 2.4, 1.6, 'm'); g.set(17, 2, 'k');
  g.line(13, 1, 12, 6, 'M'); g.line(14, 0, 13, 4, 'M');
  g.rect(3, 9, 2, 7, 'M'); g.rect(5, 9, 2, 7, 'm'); g.rect(10, 9, 2, 7, 'm'); g.rect(12, 9, 2, 7, 'M');
  g.line(2, 5, 0, 12, 'M', 2);
});

const eagleF = (f = 0) => S(21, 12, (g) => {
  if (f === 0) {
    g.poly([[0, 3], [9, 5], [9, 10], [3, 8]], 'm');
    g.poly([[20, 3], [11, 5], [11, 10], [17, 8]], 'm');
  } else {
    g.poly([[0, 9], [9, 4], [9, 9], [3, 11]], 'm');
    g.poly([[20, 9], [11, 4], [11, 9], [17, 11]], 'm');
  }
  g.ellipse(10, 7, 2.4, 3.8, 'M');
  g.circle(10, 2.8, 1.8, 'w'); g.set(11, 3, 'y'); g.set(12, 3, 'y'); g.set(10, 2, 'k');
  g.rect(8, 10, 4, 2, 'w');
});
const eagle = () => eagleF(0);

const serpentF = (f = 0) => S(13, 14, (g) => {
  g.line(2, 12, 10, 10, 'n', 2);
  g.line(10, 10, 3, 7 + f, 'n', 2);
  g.line(3, 7 + f, 9, 4, 'n', 2);
  g.circle(10, 3, 2, 'n'); g.set(10, 2, 'y'); g.set(11, 2, 'k');
  g.set(12, 4, 'r'); g.set(12, 5, 'r'); if (f) { g.set(13, 5, 'r'); g.set(13, 6, 'r'); } // the tongue flicks
  g.set(5, 11, 'l'); g.set(6, 8, 'l'); g.set(7, 5, 'l');
});
const serpent = () => serpentF(0);

const bird = (color = 'M', f = 0) => S(7, 4, (g) => {
  if (f === 0) { g.poly([[0, 0], [3, 3], [3.5, 1]], color); g.poly([[7, 0], [4, 3], [3.5, 1]], color); }
  else { g.poly([[0, 3], [3, 0.5], [3.5, 2.5]], color); g.poly([[7, 3], [4, 0.5], [3.5, 2.5]], color); }
}, { outline: false, shade: false });

// ---------- plants ----------
const tree = () => S(15, 19, (g) => {
  g.rect(6, 10, 3, 9, 'm'); g.rect(6, 10, 1, 9, 'M');
  g.circle(7.5, 5, 5, 'n'); g.circle(3.5, 8, 3.4, 'N'); g.circle(11.5, 8, 3.4, 'n'); g.circle(7.5, 3, 3, 'l');
  g.set(5, 4, 'N'); g.set(9, 6, 'N'); g.set(11, 7, 'l');
});
const palm = () => S(15, 20, (g) => {
  g.line(7, 19, 8, 7, 'm', 2);
  g.line(8, 7, 1, 4, 'n', 2); g.line(8, 7, 14, 4, 'n', 2); g.line(8, 7, 3, 0, 'N', 2); g.line(8, 7, 13, 0, 'N', 2);
  g.set(8, 8, 'M'); g.set(9, 9, 'o');
});
const cedar = () => S(13, 20, (g) => {
  g.rect(5, 15, 3, 5, 'm');
  g.poly([[6, 0], [11, 7], [1, 7]], 'N');
  g.poly([[6, 4], [12, 12], [0, 12]], 'n');
  g.poly([[6, 9], [13, 16], [-1, 16]], 'N');
});
const flower = (petal = 'p') => S(9, 13, (g) => {
  g.line(4, 5, 4, 12, 'n');
  g.poly([[4, 10], [0, 8], [2, 11.5]], 'n'); g.poly([[5, 8], [9, 6], [7.5, 9.5]], 'n');
  g.circle(1.9, 3, 1.5, petal); g.circle(6.1, 3, 1.5, petal); g.circle(4, 0.9, 1.5, petal); g.circle(4, 5.1, 1.5, petal);
  g.circle(4, 3, 1.3, 'y');
});
const wheat = () => S(13, 17, (g) => {
  for (const x of [3, 6.5, 10]) { g.line(x, 6, x, 16, 'e'); g.ellipse(x, 3.6, 1.5, 3.4, 'y'); g.set(x, 2, 'g'); g.set(x, 5, 'g'); }
  g.rect(2, 12, 9, 2, 'r');
});
const grapes = () => S(12, 15, (g) => {
  g.line(5, 0, 5, 3, 'N'); g.poly([[6, 1], [11, 0], [10, 4]], 'n');
  let y = 3;
  for (const n of [4, 3, 2, 1]) {
    for (let i = 0; i < n; i++) g.circle(6 - n + i * 2 + 1, y + 1, 1.2, i % 2 ? 'v' : 'V');
    y += 3;
  }
  g.set(5, 4, 'p'); g.set(3, 7, 'p');
});
const sprout = () => S(9, 10, (g) => {
  g.line(4, 9, 4, 3, 'N');
  g.poly([[4, 4], [0, 2], [2, 6]], 'l'); g.poly([[5, 3], [9, 0], [8, 5]], 'n');
  g.rect(1, 9, 7, 1, 'M');
});

// ---------- things ----------
const cross = () => S(11, 17, (g) => {
  g.rect(4, 0, 3, 17, 'm'); g.rect(0, 4, 11, 3, 'm');
  g.rect(6, 0, 1, 17, 'M'); g.rect(0, 6, 11, 1, 'M');
  g.set(5, 1, 'E'); g.set(1, 5, 'E');
});
const heart = () => S(13, 12, (g) => {
  g.circle(3.8, 3.8, 3.6, 'r'); g.circle(9.2, 3.8, 3.6, 'r');
  g.poly([[0.3, 5], [12.7, 5], [6.5, 12]], 'r');
  g.set(2, 2, 'p'); g.set(3, 1, 'p'); g.set(2, 3, 'p');
});
const crown = () => S(13, 9, (g) => {
  g.poly([[0, 8], [0, 1], [3.5, 4], [6.5, 0], [9.5, 4], [13, 1], [13, 8]], 'g');
  g.rect(0, 6, 13, 3, 'y'); g.set(6, 2, 'r'); g.set(3, 7, 'b'); g.set(9, 7, 'b'); g.set(6, 7, 'r');
});
const throne = () => S(13, 17, (g) => {
  g.rect(2, 0, 9, 11, 'g'); g.rect(4, 2, 5, 7, 'r');
  g.rect(0, 9, 13, 3, 'y'); g.rect(1, 12, 3, 5, 'g'); g.rect(9, 12, 3, 5, 'g');
  g.set(6, 1, 'w'); g.set(6, 5, 'y');
});
const cup = () => S(9, 11, (g) => {
  g.poly([[0, 0], [8, 0], [7, 5], [4, 6.5], [1, 5]], 'a');
  g.rect(1, 1, 7, 2, 'R');
  g.rect(3.5, 6, 2, 3, 'a'); g.rect(1, 9, 7, 2, 'a');
  g.set(1, 0, 'w');
});
const bread = () => S(14, 8, (g) => {
  g.ellipse(4.5, 4.5, 4.4, 2.8, 'E'); g.ellipse(9.5, 4, 4.2, 2.9, 'e');
  g.set(3, 3, 'e'); g.set(5, 4, 'e'); g.set(9, 2, 'E'); g.set(11, 3, 'E');
});
const jar = () => S(9, 12, (g) => {
  g.rect(3, 0, 3, 2, 'm');
  g.ellipse(4.5, 6.5, 4.2, 4.6, 'E'); g.rect(3, 1, 3, 2, 'E');
  g.rect(1, 5, 7, 1, 'M'); g.set(3, 8, 'e');
});
const lampSprite = (f = 0) => S(13, 10, (g) => {
  g.ellipse(5.5, 7, 5, 2.6, 'g');
  g.poly([[9.5, 6], [13, 4], [12, 7]], 'g');
  g.rect(3, 8, 5, 2, 'y');
  g.poly([[12, 3.5], [13, 0 + f], [14, 3.5]], f ? 'o' : 'y'); g.set(13, 2, f ? 'y' : 'o');
});
const candle = (f = 0) => S(7, 15, (g) => {
  g.rect(2, 6, 3, 9, 'c'); g.rect(4, 6, 1, 9, 'e'); g.rect(0, 14, 7, 1, 'g');
  g.set(3, 5, 'k');
  g.poly([[3, 4.5], [2, 2.5], [3, 0 + f], [4, 2.5]], 'y'); g.set(3, 3, 'o'); g.set(3, 2 + f, 'w');
});
const flameSprite = (f = 0) => S(9, 12, (g) => {
  g.poly([[4, 11], [0.5, 8], [2, 4], [4, 0 + f], [6, 4], [7.5, 8]], 'o');
  g.poly([[4, 11], [1.8, 8.5], [4, 3 + f], [6.2, 8.5]], 'y');
  g.set(4, 9, 'w'); g.set(4, 8, 'w');
}, { shade: false });
const book = () => S(17, 12, (g) => {
  g.poly([[0, 1], [8, 3], [8, 11], [0, 9]], 'w'); g.poly([[17, 1], [9, 3], [9, 11], [17, 9]], 'c');
  g.rect(0, 0, 17, 1, 'm');
  for (const y of [4, 6, 8]) { g.line(2, y - 1, 6, y, 'a'); g.line(11, y, 15, y - 1, 'a'); }
  g.rect(8, 2, 1, 10, 'M');
});
const scroll = () => S(15, 11, (g) => {
  g.rect(2, 1, 11, 9, 'c'); g.rect(0, 0, 2, 11, 'e'); g.rect(13, 0, 2, 11, 'e');
  for (const y of [3, 5, 7]) g.line(4, y, 11, y, 'a');
  g.rect(2, 9, 11, 1, 'e');
});
const tablets = () => S(13, 14, (g) => {
  g.poly([[0, 14], [0, 3], [3, 0], [6, 3], [6, 14]], 'a'); g.poly([[7, 14], [7, 3], [10, 0], [13, 3], [13, 14]], 'a');
  for (const y of [5, 7, 9, 11]) { g.line(1, y, 5, y, 'A'); g.line(8, y, 12, y, 'A'); }
});
const sword = () => S(7, 19, (g) => {
  g.rect(3, 0, 1, 12, 'w'); g.rect(2, 1, 1, 11, 'a'); g.set(3, -1, 'w');
  g.rect(0, 12, 7, 2, 'g'); g.rect(3, 14, 1, 4, 'm'); g.set(3, 18, 'g');
});
const shield = () => S(13, 15, (g) => {
  g.poly([[0, 0], [13, 0], [13, 8], [6.5, 15], [0, 8]], 'b');
  g.rect(5.5, 1, 2, 11, 'y'); g.rect(1, 4, 11, 2, 'y');
});
const helmet = () => S(11, 10, (g) => {
  g.ellipse(5.5, 5, 5, 4.6, 'a'); g.rect(0, 5, 11, 5, 'a'); g.rect(3, 6, 5, 2, 'k'); g.rect(5, 0, 1, 3, 'r');
});
const door = () => S(13, 18, (g) => {
  g.poly([[0, 18], [0, 6], [2, 2], [6.5, 0], [11, 2], [13, 6], [13, 18]], 'm');
  g.rect(2, 7, 9, 11, 'M'); g.rect(6, 7, 1, 11, 'm'); g.set(5, 13, 'g'); g.set(8, 13, 'g');
});
const key = () => S(7, 15, (g) => {
  g.circle(3, 3, 2.8, 'g'); g.circle(3, 3, 1, 'y'); g.rect(2, 6, 2, 9, 'g'); g.rect(4, 11, 2, 1, 'g'); g.rect(4, 13, 2, 1, 'g');
});
const anchor = () => S(13, 17, (g) => {
  g.rect(5.5, 2, 2, 14, 'A'); g.rect(3, 5, 7, 1, 'A'); g.circle(6.5, 1.5, 1.4, 'a');
  g.line(0, 10, 4, 15, 'A', 2); g.line(13, 10, 9, 15, 'A', 2); g.rect(4, 15, 5, 2, 'A');
});
const trumpet = () => S(19, 9, (g) => {
  g.rect(0, 3, 11, 2, 'g'); g.poly([[10, 4], [18, 0], [18, 9]], 'y'); g.circle(1, 4, 1.4, 'g'); g.rect(4, 2, 1, 4, 'g');
});
const harp = () => S(13, 17, (g) => {
  g.line(1, 16, 1, 3, 'g', 2); g.line(1, 2, 10, 0, 'g', 2); g.line(11, 1, 11, 11, 'g', 2);
  g.line(1, 16, 12, 12, 'g', 2);
  for (const x of [3, 5, 7, 9]) g.line(x, 2 - Math.round((x - 3) / 4), x, 13 - Math.round((x - 3) / 3), 'w');
});
const hands = () => S(11, 15, (g) => {
  g.poly([[2, 14], [2, 5], [5.5, 0], [9, 5], [9, 14]], 'f');
  g.line(5.5, 1, 5.5, 10, 'F'); g.ellipse(2.4, 8, 1.2, 2.4, 'f'); g.ellipse(8.6, 8, 1.2, 2.4, 'f');
  g.rect(0, 11, 11, 4, 'w'); g.line(1, 11, 10, 11, 'c');
});
const hand = () => S(9, 12, (g) => {
  g.rect(1, 5, 7, 7, 'f'); for (let i = 0; i < 4; i++) g.rect(1 + i * 2, 0 + (i === 0 || i === 3 ? 2 : 0), 1, 6, 'f');
  g.rect(0, 6, 1, 3, 'f'); g.rect(0, 10, 9, 2, 'w');
});
const eye = () => S(15, 9, (g) => {
  g.ellipse(7, 4, 7, 3.6, 'w'); g.circle(7, 4, 2.6, 'b'); g.circle(7, 4, 1.2, 'k'); g.set(6, 3, 'w');
  g.line(1, 0, 3, 1, 'k'); g.line(13, 0, 11, 1, 'k'); g.line(7, -1, 7, 0, 'k');
});
const scales = () => S(17, 14, (g) => {
  g.rect(8, 0, 2, 12, 'g'); g.rect(1, 2, 15, 1, 'g'); g.rect(5, 12, 8, 2, 'g');
  g.line(1, 3, 0, 7, 'a'); g.line(1, 3, 4, 7, 'a'); g.rect(0, 7, 5, 1, 'y');
  g.line(16, 3, 13, 7, 'a'); g.line(16, 3, 17, 7, 'a'); g.rect(13, 7, 5, 1, 'y');
});
const well = () => S(15, 15, (g) => {
  g.rect(2, 8, 11, 7, 'a'); g.rect(2, 8, 11, 2, 'A'); g.line(4, 12, 6, 12, 'A'); g.line(9, 13, 11, 13, 'A');
  g.rect(2, 0, 1, 9, 'm'); g.rect(12, 0, 1, 9, 'm'); g.poly([[0, 1], [7.5, -2], [15, 1]], 'M');
  g.line(7, 3, 7, 7, 'e'); g.rect(6, 7, 3, 2, 'E');
});
const rock = () => S(13, 8, (g) => {
  g.ellipse(6, 5, 6, 3.4, 'a'); g.ellipse(4.5, 3, 3, 2.4, 'a'); g.set(7, 5, 'A'); g.set(3, 3, 'w');
});
const altar = (f = 0) => S(15, 14, (g) => {
  g.rect(1, 8, 13, 6, 'a'); g.rect(0, 7, 15, 2, 'w'); g.line(2, 11, 5, 11, 'A'); g.line(8, 12, 12, 12, 'A');
  g.poly([[7.5, 7], [4.5, 5], [5.5, 2], [7.5, 0 + f], [9.5, 2], [10.5, 5]], 'o'); g.poly([[7.5, 7], [6, 5], [7.5, 3 + f], [9, 5]], 'y');
});
const tomb = () => S(19, 15, (g) => {
  g.ellipse(9.5, 15, 9.5, 14, 'a'); g.ellipse(9.5, 15, 5, 8, 'x'); g.circle(13, 11, 4.6, 'A'); g.circle(13, 11, 3, 'a');
  g.set(12, 10, 'w');
});
const net = () => S(15, 12, (g) => {
  g.poly([[0, 0], [14, 0], [11, 11], [3, 11]], 'S');
  for (let x = 1; x < 14; x += 3) g.line(x, 0, 3 + (x - 1) * 0.65, 11, 'a');
  for (const y of [3, 6, 9]) g.line(1 + y * 0.25, y, 13 - y * 0.25, y, 'a');
  g.line(0, 0, 14, 0, 'm');
}, { shade: false });
const coins = () => S(13, 8, (g) => {
  g.ellipse(4, 5.5, 3.8, 2, 'g'); g.ellipse(9.5, 5.5, 3.5, 2, 'y'); g.ellipse(6.5, 3, 3.4, 1.8, 'y'); g.set(6, 2, 'w');
});
const gem = () => S(9, 9, (g) => {
  g.poly([[0, 3], [2, 0], [7, 0], [9, 3], [4.5, 9]], 's'); g.line(0, 3, 9, 3, 'S'); g.set(3, 1, 'w');
});
const spear = () => S(5, 19, (g) => { g.rect(2, 4, 1, 15, 'm'); g.poly([[2.5, -1], [0.5, 4], [4.5, 4]], 'a'); });
const bow = () => S(9, 17, (g) => {
  g.line(3, 0, 7, 8, 'm', 2); g.line(7, 8, 3, 16, 'm', 2); g.line(3, 0, 3, 16, 'w'); g.line(1, 8, 8, 8, 'M'); g.poly([[8, 6.5], [9, 8], [8, 9.5]], 'a');
});
const chains = () => S(17, 9, (g) => {
  for (let i = 0; i < 4; i++) {
    if (i % 2 === 0) g.ellipse(2.4 + i * 4, 4.5, 2.6, 2, 'a'); else g.ellipse(2.4 + i * 4, 4.5, 1.6, 3.2, 'A');
    g.set(2 + i * 4, 4, 'k');
  }
  g.rect(0, 0, 2, 9, 'A');
}, { shade: false });
const spark = () => S(5, 5, (g) => { g.line(2, 0, 2, 4, 'y'); g.line(0, 2, 4, 2, 'y'); g.set(2, 2, 'w'); }, { outline: false, shade: false });
const apple = () => S(9, 9, (g) => { g.circle(3.5, 5, 3.6, 'r'); g.circle(6, 5, 3, 'r'); g.line(4.5, 0, 4.5, 2, 'M'); g.set(6, 1, 'n'); g.set(2, 4, 'p'); });

// ---------- places ----------
export function house(roof = 'R', wall = 'e') {
  return S(15, 14, (g) => {
    g.rect(1, 6, 13, 8, wall); g.poly([[0, 7], [7.5, 0], [15, 7]], roof);
    g.rect(6, 9, 3, 5, 'M'); g.rect(2, 8, 2, 2, 'S'); g.rect(11, 8, 2, 2, 'S');
  });
}
const tent = () => S(17, 12, (g) => {
  g.poly([[8.5, 0], [17, 12], [0, 12]], 'c'); g.poly([[8.5, 5], [12, 12], [5, 12]], 'M'); g.line(8.5, 0, 8.5, 5, 'e');
  g.line(3, 8, 6, 3, 'e');
});
const tower = () => S(9, 19, (g) => {
  g.rect(0, 4, 9, 15, 'a'); for (const x of [0, 3, 6]) g.rect(x, 1, 3, 3, 'a');
  g.rect(3, 13, 3, 6, 'M'); g.set(4, 7, 'k'); g.set(4, 10, 'k');
});
const wall = () => S(24, 15, (g) => {
  g.rect(0, 5, 24, 10, 'e');
  for (let x = 0; x < 24; x += 4) g.rect(x, 3, 2, 3, 'e');
  g.rect(9, 7, 6, 8, 'M'); g.poly([[9, 8], [12, 5], [15, 8]], 'M');
  g.line(2, 9, 6, 9, 'E'); g.line(17, 11, 22, 11, 'E'); g.line(3, 12, 7, 12, 'E');
});
const temple = () => S(27, 20, (g) => {
  g.poly([[0, 6], [13.5, 0], [27, 6]], 'g'); g.rect(1, 6, 25, 2, 'y');
  for (const x of [3, 8, 13, 18, 23]) g.rect(x, 8, 2, 8, 'w');
  g.rect(0, 16, 27, 2, 'c'); g.rect(-0.5, 18, 28, 2, 'a'); g.rect(11, 10, 5, 6, 'M');
});
const gate = () => S(17, 18, (g) => {
  g.rect(0, 4, 4, 14, 'a'); g.rect(13, 4, 4, 14, 'a'); g.rect(0, 1, 17, 4, 'a');
  g.poly([[4, 18], [4, 8], [8.5, 4], [13, 8], [13, 18]], 'M');
  for (const x of [0, 4, 8, 12]) g.rect(x, -1, 2, 2, 'a');
});

// ---------- registry ----------
const PEOPLE = {
  man: () => person({ robe: 'b', skin: 'f', hair: 'M' }),
  man2: () => person({ robe: 'o', skin: 'F', hair: 'k' }),
  man3: () => person({ robe: 'N', skin: 'j', hair: 'k' }),
  woman: () => person({ robe: 'P', skin: 'f', hair: 'm', arms: true }),
  woman2: () => person({ robe: 't', skin: 'F', hair: 'k' }),
  child: () => person({ robe: 'y', skin: 'f', hair: 'm', kid: true }),
  king: () => person({ robe: 'R', skin: 'F', hair: 'k', crown: true }),
  priest: () => person({ robe: 'w', skin: 'f', hair: 'a', arms: true }),
  shepherd: () => person({ robe: 'e', skin: 'F', hair: 'M', staff: true }),
  prophet: () => person({ robe: 'v', skin: 'f', hair: 'a', staff: true }),
  warrior: () => person({ robe: 'A', skin: 'f', hair: 'k', staff: true }),
};

export const SPRITES = {
  lamb, sheep: sheepSmall, dove, fish, boat, ark, lion, camel, donkey, horse, eagle, serpent,
  tree, palm, cedar, flower: () => flower('p'), lily: () => flower('w'), wheat, grapes, sprout, apple,
  cross, heart, crown, throne, cup, bread, jar, book, scroll, tablets, sword, shield, helmet, door, key, anchor,
  trumpet, harp, hands, hand, eye, scales, well, rock, tomb, net, coins, gem, spear, bow, chains, spark,
  house: () => house(), tent, tower, wall, temple, gate,
  ...PEOPLE,
  angel: () => S(17, 19, (g) => {
    g.poly([[0, 3], [7, 6], [7, 14], [2, 11]], 'w'); g.poly([[16, 3], [9, 6], [9, 14], [14, 11]], 'w');
    g.line(2, 5, 6, 8, 'c'); g.line(14, 5, 10, 8, 'c'); g.line(3, 7, 6, 10, 'c'); g.line(13, 7, 10, 10, 'c');
    g.poly([[6, 7], [11, 7], [13, 19], [4, 19]], 'w'); g.circle(8.5, 4.6, 2.4, 'f'); g.ellipse(8.5, 3, 2.8, 1.5, 'y');
    g.set(7, 5, 'k'); g.set(10, 5, 'k'); g.ellipse(8.5, 0.5, 3.2, 1, 'y');
  }),
};

/** Animated sprites: lists of frames (frame 0 is the still picture). */
export const ANIMATED = {
  lamb: [lambF(0), lambF(1)],
  dove: [doveF(0), doveF(1)],
  fish: [fishF(0), fishF(1)],
  eagle: [eagleF(0), eagleF(1)],
  serpent: [serpentF(0), serpentF(1)],
  lamp: [lampSprite(0), lampSprite(1)],
  candle: [candle(0), candle(1)],
  flame: [flameSprite(0), flameSprite(1)],
  altar: [altar(0), altar(1)],
};

const cache = new Map();
/** @returns {import('./draw.mjs').Grid} */
export function getSprite(name) {
  if (ANIMATED[name]) return ANIMATED[name][0];
  if (!cache.has(name)) {
    const make = SPRITES[name];
    if (!make) throw new Error(`Unknown sprite "${name}"`);
    cache.set(name, make());
  }
  return cache.get(name);
}
export const getFrames = (name) => ANIMATED[name] ?? [getSprite(name)];
export const BIRD = bird;
/** Frames per second for animated figures (flames flicker fast, a grazing lamb slowly). */
export const FPS = { lamb: 1.4, dove: 3, fish: 3, eagle: 2, serpent: 2.5, lamp: 3, candle: 4, flame: 5, altar: 4 };
export const SPRITE_NAMES = [...new Set([...Object.keys(SPRITES), ...Object.keys(ANIMATED)])];
