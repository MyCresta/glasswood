// Paints a run's forest: the map under the reading glass, and the same map
// small on the globe. Made once per forest as a standalone SVG image, so the
// browser rasterises it once and every view can reuse it.
import { DEFS } from './defs.js';

const LX = 630, LY = 410, LR = 350, S = 10.4;
const T = (x, z) => [LX + x * S, LY + z * S];
const f1 = (n) => Math.round(n * 10) / 10;
const LEAF = ['#b4492c', '#c98a2e', '#8a3550', '#a8642a', '#6f3b5e'];
const MOSS = ['#2f5e34', '#41763a', '#244c36', '#55893e'];
const DEEP = ['#1e4430', '#24503a', '#2a5a3c', '#1a3a2a'];
// how wide each kind of path is drawn, in forest units
export const PATH_W = { trail: 0.38, path: 0.8, road: 1.55 };
const BUILD = [62, 150, 30, 240, 180, 118, 0, 315, 210, 270, 300, 330];

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distance from a point to the nearest path edge (negative on a path), using
// a coarse grid of path samples.
function openness(web) {
  const CELL = 3;
  const grid = new Map();
  const put = (x, z, hw) => {
    const k = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push([x, z, hw]);
  };
  for (const e of web.WEB) {
    const hw = PATH_W[e.w] / 2;
    for (let i = 0; i < e.pts.length; i++) {
      put(e.pts[i][0], e.pts[i][1], hw);
      if (i) put((e.pts[i][0] + e.pts[i - 1][0]) / 2, (e.pts[i][1] + e.pts[i - 1][1]) / 2, hw);
    }
  }
  const burrows = Object.entries(web.NODES).filter(([k]) => k.startsWith('s')).map(([, p]) => p);
  return (x, z) => {
    let d = Math.hypot(x, z) - 4.8;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const [px, pz, hw] of grid.get(`${cx + i},${cz + j}`) || []) d = Math.min(d, Math.hypot(x - px, z - pz) - hw);
    }
    for (const [bx, bz] of burrows) d = Math.min(d, Math.hypot(x - bx, z - bz) - 1.4);
    return d;
  };
}

function pathD(pts) {
  return pts.map(([x, z], i) => { const [X, Y] = T(x, z); return `${i ? 'L' : 'M'}${f1(X)} ${f1(Y)}`; }).join('');
}

// The forest as SVG markup, in the Watch's coordinates (lens at 630,410).
export function forestMarkup(web) {
  const r = rng(web.forest.seed ^ 0x2f00d);
  const open = openness(web);
  const ponds = web.ponds;
  const o = [];
  o.push(`<circle cx="${LX}" cy="${LY}" r="${LR + 20}" fill="#2a1d1c"/>`);
  // fallen leaves on the forest floor
  for (let i = 0; i < 900; i++) {
    const x = (r() - 0.5) * 72, z = (r() - 0.5) * 72;
    if (open(x, z) < 0.15) continue;
    const [X, Y] = T(x, z);
    o.push(`<use href="#leaf" x="-10" y="-5" width="20" height="10" fill="${LEAF[Math.floor(r() * 5)]}" opacity="${(0.5 + r() * 0.35).toFixed(2)}" transform="translate(${X | 0} ${Y | 0}) rotate(${(r() * 360) | 0}) scale(${(0.5 + r() * 0.6).toFixed(2)})"/>`);
  }
  // paths: dark borders first, then the worn earth, roads widest
  const order = ['trail', 'path', 'road'];
  const edges = web.WEB.filter((e) => e.a !== 'c' && e.b !== 'c');
  const BORDER = { trail: ['#3f3122', 2.5], path: ['#6e5840', 4], road: ['#5e4a34', 5] };
  const FILL = { trail: '#7d6748', path: '#a88d68', road: '#c2a87c' };
  for (const w of order) for (const e of edges) if (e.w === w) o.push(`<path d="${pathD(e.pts)}" fill="none" stroke="${BORDER[w][0]}" stroke-width="${f1(PATH_W[w] * S + BORDER[w][1])}" stroke-linecap="round" stroke-linejoin="round"/>`);
  for (const w of order) for (const e of edges) if (e.w === w) {
    const d = pathD(e.pts);
    o.push(`<path d="${d}" fill="none" stroke="${FILL[w]}" stroke-width="${f1(PATH_W[w] * S)}" stroke-linecap="round" stroke-linejoin="round"/>`);
    // roads: paving stones along the middle
    if (w === 'road') o.push(`<path d="${d}" fill="none" stroke="#d8c39a" stroke-width="${f1(PATH_W.road * S * 0.5)}" stroke-dasharray="5 4" stroke-linecap="butt"/>`);
  }
  // the clearing round the village
  o.push(`<circle cx="${LX}" cy="${LY}" r="${5 * S + 3}" fill="#a88d68"/><circle cx="${LX}" cy="${LY}" r="${4.4 * S}" fill="#4f6e3a"/>`);
  for (const [px, pz, pr] of ponds) {
    const [X, Y] = T(px, pz);
    o.push(`<circle cx="${f1(X)}" cy="${f1(Y)}" r="${f1(pr * S + 3)}" fill="#5a4636"/><circle cx="${f1(X)}" cy="${f1(Y)}" r="${f1(pr * S)}" fill="url(#puddle)"/>`);
  }
  // trees, back to front
  const trees = [];
  for (let z = -36; z < 36; z += 1.02) for (let x = -36; x < 36; x += 1.02) {
    const px = x + (r() - 0.5) * 0.85, pz = z + (r() - 0.5) * 0.85, a = r(), b = r();
    if (Math.hypot(px, pz) > 36) continue;
    if (open(px, pz) <= 0.3) continue;
    if (ponds.some(([lx, lz, lr]) => Math.hypot(px - lx, pz - lz) < lr + 0.6)) continue;
    trees.push([px, pz, a, b]);
  }
  trees.sort((p, q) => p[1] - q[1]);
  for (const [x, z, a, b] of trees) {
    const [X, Y] = T(x, z);
    if (b < 0.62) {
      const rad = S * (0.55 + a * 0.45);
      const c = Math.hypot(x, z) < 24 ? MOSS[Math.floor(a * 4)] : DEEP[Math.floor(a * 4)];
      o.push(`<circle cx="${f1(X)}" cy="${f1(Y)}" r="${f1(rad)}" fill="${c}" filter="url(#lift)"/><circle cx="${f1(X - rad * 0.3)}" cy="${f1(Y - rad * 0.3)}" r="${f1(rad * 0.42)}" fill="#8fc45a" opacity=".2"/>`);
    } else if (b < 0.84) {
      const rad = S * (0.85 + a * 0.45);
      o.push(`<g filter="url(#lift)"><circle cx="${f1(X)}" cy="${f1(Y)}" r="${f1(rad)}" fill="#1e4430"/><circle cx="${f1(X - rad * 0.25)}" cy="${f1(Y - rad * 0.3)}" r="${f1(rad * 0.6)}" fill="#2f6440"/><circle cx="${f1(X - rad * 0.35)}" cy="${f1(Y - rad * 0.4)}" r="${f1(rad * 0.25)}" fill="#55893e" opacity=".6"/></g>`);
    } else if (b < 0.92) {
      const rad = S * (0.35 + a * 0.3), red = a < 0.7;
      if (!red) o.push(`<circle cx="${f1(X)}" cy="${f1(Y)}" r="${f1(rad * 2)}" fill="url(#vg)"/>`);
      o.push(`<circle cx="${f1(X)}" cy="${f1(Y)}" r="${f1(rad)}" fill="${red ? '#c43d36' : '#7b55c9'}" stroke="#2a0f14" stroke-width="1" filter="url(#lift)"/>`);
    }
  }
  // the village
  const R = 3 * S, col = ['#c4553b', '#2f8f8a', '#d9a23a', '#7b4a9a', '#3f6fb0'];
  o.push(`<circle cx="${LX}" cy="${LY}" r="${R + 8}" fill="#9c9893" filter="url(#lift)"/>`);
  BUILD.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180, rr = (i === 7 ? 3.2 : 5.15) * 0.4;
    const [X, Y] = T(Math.cos(a) * rr, Math.sin(a) * rr);
    o.push(`<circle cx="${f1(X)}" cy="${f1(Y)}" r="10" fill="url(#eg)"/><g transform="translate(${f1(X)} ${f1(Y)}) rotate(${deg + 90})"><rect x="-5" y="-3.5" width="10" height="7" fill="${col[i % 5]}" stroke="#1d1712"/></g>`);
  });
  for (let k = 0; k < 36; k++) { const t = (k / 36) * Math.PI * 2; o.push(`<circle cx="${f1(LX + Math.cos(t) * R)}" cy="${f1(LY + Math.sin(t) * R)}" r="2" fill="#5a3e22"/>`); }
  o.push(`<circle cx="${LX}" cy="${LY}" r="50" fill="url(#eg)"/><circle cx="${LX}" cy="${LY}" r="10" fill="#b9b3aa" stroke="#2c2620" stroke-width="1.4"/><circle cx="${LX}" cy="${LY}" r="6.5" fill="#c4553b" stroke="#2c2620"/><circle cx="${LX}" cy="${LY}" r="2.2" fill="#ffe08a"/>`);
  // burrows: a dark hole under a root arch
  for (const [k, p] of Object.entries(web.NODES)) {
    if (!k.startsWith('s')) continue;
    const [X, Y] = T(...p);
    o.push(`<path d="M${f1(X - 16)} ${f1(Y - 5)} q7 -11 16 -6 q11 -5 16 6" stroke="#4a2e1e" stroke-width="4.5" fill="none" stroke-linecap="round"/><ellipse cx="${f1(X)}" cy="${f1(Y + 2)}" rx="10" ry="7" fill="#0d070a"/>`);
  }
  return o.join('');
}

function svgText(body, mask, px) {
  const fade = mask
    ? `<defs><radialGradient id="mf" gradientUnits="userSpaceOnUse" cx="${LX}" cy="${LY}" r="${LR}"><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="mm" maskUnits="userSpaceOnUse" x="270" y="50" width="720" height="720"><circle cx="${LX}" cy="${LY}" r="${LR}" fill="url(#mf)"/></mask></defs><g mask="url(#mm)">${body}</g>`
    : `<defs><clipPath id="lc"><circle cx="${LX}" cy="${LY}" r="${LR + 6}"/></clipPath></defs><g clip-path="url(#lc)">${body}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="280 60 700 700" width="${px}" height="${px}">${DEFS}${fade}</svg>`;
}

// Draw the SVG once into a bitmap: a vector image with thousands of trees
// would be redrawn on every frame of a zoom.
async function rasterUrl(svg, px) {
  const vec = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = vec;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = c.height = px;
    c.getContext('2d').drawImage(img, 0, 0, px, px);
    const blob = await new Promise((res) => c.toBlob(res, 'image/webp', 0.86));
    if (!blob) throw new Error('no blob');
    URL.revokeObjectURL(vec);
    return URL.createObjectURL(blob);
  } catch {
    return vec; // fall back to the vector image
  }
}

// Image URLs for a forest: `map` under the reading glass, `mini` (soft-edged)
// for the globe. Old URLs are released when the forest changes.
let made = null;
export function forestImages(web) {
  if (made?.seed === web.forest.seed) return made.ready;
  const old = made;
  const body = forestMarkup(web);
  made = { seed: web.forest.seed };
  made.ready = Promise.all([rasterUrl(svgText(body, false, 1400), 1400), rasterUrl(svgText(body, true, 480), 480)]).then(([map, mini]) => {
    if (old?.urls) { URL.revokeObjectURL(old.urls.map); URL.revokeObjectURL(old.urls.mini); }
    made.urls = { map, mini };
    return made.urls;
  });
  return made.ready;
}

// Point every forest picture on the page at this forest.
export async function paintForest(web) {
  const seed = web.forest.seed;
  const { map, mini } = await forestImages(web);
  if (made.seed !== seed) return;
  for (const el of document.querySelectorAll('image.forest-map')) if (el.getAttribute('href') !== map) el.setAttribute('href', map);
  for (const el of document.querySelectorAll('image.forest-mini')) if (el.getAttribute('href') !== mini) el.setAttribute('href', mini);
}

// Where the mini forest sits on the globe (globe scale 2.95 px per unit at 640,424).
const GK = 2.95 / S;
export const MINI_AT = { x: 640 - (LX - 280) * GK, y: 424 - (LY - 60) * GK, width: 700 * GK, height: 700 * GK };
