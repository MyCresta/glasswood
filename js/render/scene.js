// The desk at night, in two SVG layers that share one coordinate space:
//   #scene      the desk, the globe on its stand, and what is seen through each glass
//   #scene-top  the glasses themselves (rims, handles, the loupe's arm and their
//               shadows), which lie above the paper notes
// The Watch and Hearth glasses are real magnifiers: whatever is under them is the
// globe itself, enlarged. Switching views brings a glass over the globe and then
// zooms through it, from the globe to the forest map to the village.
import { DEFS } from './defs.js';
import { svgEl, WatchView, LENS } from './watch.js';
import { WildsView } from './wilds.js';
import { HearthView } from './hearth.js';
import { HEARTH } from '../data/hotspots.js';

export const GLOBE = { x: 640, y: 424, r: 350 };
const V = [GLOBE.x, GLOBE.y];               // the village, in globe coordinates
const R_WATCH = 10.4 / 2.95;                // the forest map is the globe at this magnification
const R_HEARTH = R_WATCH * 8;               // and the village close-up roughly this much more

// Each glass: how big it sits on the desk (k), where its centre lands, where it
// slides in from, and its content planes (finest last), each drawn at `mag` times
// the globe with `anchor` being the village in that plane's own coordinates.
const RIGS = {
  watch: { k: 0.94, at: [624, 406], from: [300, 360], c: [LENS.x, LENS.y], mag: R_WATCH },
  hearth: { k: 0.95, at: [642, 420], from: [-260, -420], c: [HEARTH.cx, HEARTH.cy], mag: R_HEARTH },
};
const FRAME = {
  wilds: [GLOBE.x - 392, GLOBE.y - 392, 784, 800],
  watch: [624 - 352, 406 - 352, 704, 716],
  hearth: [642 - 410, 420 - 385, 820, 780],
};
// Wide screens: the desk framed a little closer than the full artwork, so the
// globe and its glasses sit large between the two columns of notes.
const WIDE = [4, 32, 1312, 820];
const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (t) => Math.max(0, Math.min(1, t));

const NS = 'http://www.w3.org/2000/svg';
function layerSvg(stage, cls, before = null) {
  const el = document.createElementNS(NS, 'svg');
  el.setAttribute('class', cls);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  stage.insertBefore(el, before);
  return el;
}

// Big images decode the first time they are drawn, which would stall the first
// zoom; decode them up front instead.
const IMAGES = ['desk', 'globe-base', 'globe-terrain', 'watch', 'watch-frame', 'hearth-base', 'hearth-front', 'walls-0', 'hearth-frame'].map((n) => `assets/${n}.webp`);
export function preloadImages() {
  return Promise.all(IMAGES.map((src) => { const i = new Image(); i.src = src; return i.decode().catch(() => {}); }));
}

class Rig {
  // A glass and what is seen through it, each in its own SVG layer: `svg` sits
  // with the desk, `frameSvg` (rim, handle, arm, shadows) above the notes.
  constructor(name, stage, before) {
    const d = RIGS[name];
    this.d = d;
    this.name = name;
    this.svg = layerSvg(stage, `rig-svg ${name} off-stage`, before);
    this.frameSvg = layerSvg(stage, `frame-svg ${name} off-stage`, null);
    const defs = svgEl('defs', {}, this.svg);
    const clip = svgEl('clipPath', { id: `rigclip-${name}` }, defs);
    if (name === 'watch') svgEl('circle', { cx: d.c[0], cy: d.c[1], r: LENS.r }, clip);
    else svgEl('ellipse', { cx: d.c[0], cy: d.c[1], rx: HEARTH.rx, ry: HEARTH.ry }, clip);
    this.g = svgEl('g', {}, this.svg);
    this.inner = svgEl('g', { 'clip-path': `url(#rigclip-${name})` }, this.g);
    // plane 1: the globe's own terrain, magnified
    this.globe = svgEl('image', { href: 'assets/globe-terrain.webp', x: 290, y: 74, width: 700, height: 700 }, this.inner);
    this.planes = [{ el: this.globe, mag: 1, anchor: V }];
    if (name === 'hearth') {
      // plane 2: the forest map, between the globe and the village
      const wm = svgEl('image', { href: 'assets/watch.webp', x: 280, y: 60, width: 700, height: 700 }, this.inner);
      this.planes.push({ el: wm, mag: R_WATCH, anchor: [LENS.x, LENS.y], fadeIn: [0.08, 0.32], cover: 350 / 430 });
    }
    // the last plane is the view's own content (map or village, with everything live)
    this.content = svgEl('g', { class: 'live-root' }, this.inner);
    this.planes.push({ el: this.content, mag: d.mag, anchor: d.c, fadeIn: name === 'watch' ? [0.05, 0.4] : [0.86, 0.97] });
    this.top = svgEl('g', {}, this.frameSvg);
    const fr = name === 'watch' ? { href: 'assets/watch-frame.webp', x: 0, y: 0, width: 1440, height: 1000 } : { href: 'assets/hearth-frame.webp', x: 0, y: -360, width: 1440, height: 1260 };
    svgEl('image', fr, this.top);
    this.slide = 1;   // 1: away from the globe, 0: over it
    this.zoom = 0;    // 0: the globe as it is, 1: fully magnified
    this.last = {};
    this.apply();
  }

  // How much bigger than the globe things look through the glass at zoom z
  // (in log space, so the zoom feels even). Fully zoomed, the content is drawn
  // at its own size inside a glass that is itself k times its drawn size.
  mag(z) { return Math.exp(Math.log(this.d.mag * this.d.k) * z); }
  zoomFor(worldMag) { return Math.log(worldMag) / Math.log(this.d.mag * this.d.k); }

  set(el, key, attr, val) {
    if (this.last[key] === val) return;
    this.last[key] = val;
    if (val === '') el.removeAttribute(attr); else el.setAttribute(attr, val);
  }

  apply() {
    const { k, at, from, c } = this.d;
    const s = ease(this.slide);
    const shown = this.slide < 0.999;
    this.svg.classList.toggle('off-stage', !shown);
    this.frameSvg.classList.toggle('off-stage', !shown);
    if (!shown) return;
    const ax = at[0] + from[0] * s - k * c[0], ay = at[1] + from[1] * s - k * c[1];
    const tf = `translate(${ax.toFixed(1)} ${ay.toFixed(1)}) scale(${k})`;
    this.set(this.g, 'g', 'transform', tf);
    this.set(this.top, 't', 'transform', tf);
    const op = clamp01((1 - this.slide) * 2.2).toFixed(2);
    this.set(this.svg, 'op', 'opacity', op);
    this.set(this.frameSvg, 'op2', 'opacity', op);
    // where the village appears on the desk: under the glass's centre once zoomed in
    const S = this.mag(this.zoom);
    const u = ease(this.zoom);
    const cx = at[0] + from[0] * s, cy = at[1] + from[1] * s;
    const P = [V[0] + (cx - V[0]) * u, V[1] + (cy - V[1]) * u];
    // each plane's scale and opacity; a plane hidden under an opaque one that
    // already fills the whole glass is not drawn at all
    const st = this.planes.map((p) => {
      const sc = S / (p.mag * k);
      const o = p.fadeIn ? clamp01((this.zoom - p.fadeIn[0]) / (p.fadeIn[1] - p.fadeIn[0])) : 1;
      return { sc, o, fills: o >= 1 && sc * (p.cover || 1) >= 0.999 };
    });
    this.planes.forEach((p, i) => {
      const { sc, o } = st[i];
      const covered = st.slice(i + 1).some((q) => q.fills);
      const vis = o > 0.001 && !covered;
      this.set(p.el, `v${i}`, 'visibility', vis ? 'visible' : 'hidden');
      if (!vis) return;
      const tx = (P[0] - ax) / k - sc * p.anchor[0], ty = (P[1] - ay) / k - sc * p.anchor[1];
      const near = Math.abs(sc - 1) < 1e-4 && Math.abs(tx) < 0.05 && Math.abs(ty) < 0.05;
      this.set(p.el, `m${i}`, 'transform', near ? '' : `matrix(${sc.toFixed(5)} 0 0 ${sc.toFixed(5)} ${tx.toFixed(2)} ${ty.toFixed(2)})`);
      this.set(p.el, `o${i}`, 'opacity', o >= 1 ? '' : o.toFixed(3));
    });
    this.svg.classList.toggle('settled', this.slide === 0 && this.zoom === 1);
  }
}

export class Scene {
  constructor(svg, handlers) {
    this.svg = svg;
    const stage = svg.parentElement;
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = `${DEFS}<defs>
      <clipPath id="lensclip"><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r}"/></clipPath>
      <clipPath id="hearthclip"><ellipse cx="${HEARTH.cx}" cy="${HEARTH.cy}" rx="${HEARTH.rx}" ry="${HEARTH.ry}"/></clipPath>
      <radialGradient id="deskvig" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#05030a" stop-opacity="0"/><stop offset="1" stop-color="#05030a" stop-opacity=".75"/></radialGradient></defs>`;
    svgEl('image', { href: 'assets/desk.webp', x: -800, y: -400, width: 3040, height: 1700 }, svg);
    svgEl('image', { href: 'assets/globe-base.webp', x: 0, y: 0, width: 1440, height: 900 }, svg);
    svgEl('image', { href: 'assets/globe-terrain.webp', x: 290, y: 74, width: 700, height: 700 }, svg);
    svgEl('image', { href: 'assets/globe-glass.svg', x: 0, y: 0, width: 1440, height: 900 }, svg);
    // the tags of the Wilds fade on their own layer
    this.wildsSvg = layerSvg(stage, 'wilds-svg', null);
    this.wildsLayer = svgEl('g', {}, this.wildsSvg);
    // night and the vignette over everything on the desk (but under the notes)
    this.shadeSvg = layerSvg(stage, 'shade-svg', null);
    this.dark = svgEl('rect', { x: -800, y: -400, width: 3040, height: 1700, fill: '#06040c', opacity: 0 }, this.shadeSvg);
    svgEl('rect', { x: -800, y: -400, width: 3040, height: 1700, fill: 'url(#deskvig)' }, this.shadeSvg);
    this.rigs = {
      hearth: new Rig('hearth', stage, this.shadeSvg),
      watch: new Rig('watch', stage, this.shadeSvg),
    };
    this.stage = stage;
    this.svgs = [...stage.querySelectorAll(':scope > svg')];
    this.nightKey = -1;
    this.views = {
      wilds: new WildsView(this.wildsLayer, handlers),
      watch: new WatchView(this.rigs.watch.content, handlers),
      hearth: new HearthView(this.rigs.hearth.content, handlers),
    };
    this.view = null;
    this.anim = null;
    this.onStep = handlers.onStep;
    window.addEventListener('resize', () => this.fit());
    this.zoomInput(stage);
  }

  // Scroll the mouse wheel (or pinch) over the desk to go Wilds, Watch, Hearth
  // and back. Small trackpad scrolls add up; one step per gesture.
  zoomInput(stage) {
    let acc = 0, idle = 0, lock = 0;
    const step = (dir) => {
      const now = performance.now();
      if (now < lock) return;
      lock = now + 700;
      this.onStep?.(dir);
    };
    stage.addEventListener('wheel', (e) => {
      if (e.target.closest?.('#overlay')) return;
      e.preventDefault();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      clearTimeout(idle);
      idle = setTimeout(() => { acc = 0; }, 220);
      acc += d;
      if (Math.abs(acc) >= 60) { step(acc < 0 ? 1 : -1); acc = 0; }
    }, { passive: false });
    const pts = new Map();
    let base = 0;
    const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
    stage.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; pts.set(e.pointerId, e); if (pts.size === 2) base = dist(); });
    stage.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, e);
      if (pts.size !== 2 || !base) return;
      const r = dist() / base;
      if (r > 1.3 || r < 0.77) { step(r > 1 ? 1 : -1); base = dist(); }
    });
    const up = (e) => { pts.delete(e.pointerId); base = 0; };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
  }

  // Bring the right glass over the globe and zoom through it.
  setView(name, instant = false) {
    if (this.view === name) return;
    const prev = this.view;
    this.view = name;
    this.wildsSvg.classList.toggle('off', name !== 'wilds');
    document.body.dataset.view = name;
    this.fit();
    const reduced = instant || document.body.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    const inc = this.rigs[name];
    const out = prev && this.rigs[prev] && this.rigs[prev].slide < 0.999 ? this.rigs[prev] : null;
    // the glass coming in is laid on top of the one going away
    if (inc) {
      this.stage.insertBefore(inc.svg, this.shadeSvg);
      this.stage.append(inc.frameSvg);
    }
    // From one glass to the other, meet at the same magnification instead of
    // zooming all the way out to the globe and back in.
    let meet = 0;
    if (inc && out) {
      const wm = Math.min(out.mag(out.zoom), inc.d.mag * inc.d.k);
      meet = inc.slide > 0.5 ? clamp01(inc.zoomFor(wm)) : inc.zoom;
      if (inc.slide > 0.5) inc.zoom = name === 'watch' ? 1 : meet;
    }
    const plan = {};
    for (const [k, r] of Object.entries(this.rigs)) {
      const from = { slide: r.slide, zoom: r.zoom };
      if (k === name) plan[k] = { from, slide: 0, zoom: 1 };
      else if (r === out && inc) plan[k] = { from, slide: 1, zoom: name === 'watch' ? clamp01(out.zoomFor(inc.d.mag * inc.d.k)) : out.zoom };
      else plan[k] = { from, slide: 1, zoom: 0 };
    }
    if (reduced || !prev) {
      for (const [k, r] of Object.entries(this.rigs)) { r.slide = plan[k].slide; r.zoom = plan[k].zoom; r.apply(); }
      this.anim = null;
      return;
    }
    // the first frame after a switch also rebuilds notes; start the clock after it
    this.anim = { t: 0, fresh: true, plan, name, swap: !!(inc && out) };
  }

  // One step of the glass animation.
  //  Wilds to a glass: it slides over the globe, then zooms in.
  //  A glass to the Wilds: it zooms back out to the plain globe, then slides off.
  //  Watch to Hearth: the loupe arrives as magnified as the reading glass was and
  //  zooms on in; the reading glass slides away underneath.
  //  Hearth to Watch: the loupe zooms out to the reading glass's magnification
  //  and lifts away, revealing the reading glass.
  stepAnim(dt) {
    const a = this.anim;
    if (!a) return;
    if (a.fresh) a.fresh = false; else a.t += Math.min(dt, 1 / 30);
    const T = a.swap ? 1.05 : 1.2;
    const t = Math.min(1, a.t / T);
    for (const [k, r] of Object.entries(this.rigs)) {
      const p = a.plan[k], f = p.from;
      if (f.slide >= 0.999 && p.slide >= 0.999) continue;
      if (k === a.name) {
        const arriving = f.slide > 0.5;
        if (a.swap && a.name === 'watch') {
          r.slide = f.slide + (p.slide - f.slide) * ease(clamp01((t - 0.35) / 0.55));
          r.zoom = 1;
        } else {
          r.slide = f.slide + (p.slide - f.slide) * clamp01(t / 0.45);
          const z0 = arriving && !a.swap ? 0.32 : 0;
          r.zoom = f.zoom + (p.zoom - f.zoom) * ease(clamp01((t - z0) / (1 - z0)));
        }
      } else if (a.swap) {
        if (a.name === 'watch') {
          // the loupe zooms out to meet the reading glass, then lifts away
          r.zoom = f.zoom + (p.zoom - f.zoom) * ease(clamp01(t / 0.5));
          r.slide = f.slide + (p.slide - f.slide) * ease(clamp01((t - 0.45) / 0.55));
        } else {
          r.slide = f.slide + (p.slide - f.slide) * ease(clamp01((t - 0.4) / 0.5));
        }
      } else {
        r.zoom = f.zoom + (p.zoom - f.zoom) * ease(clamp01(t / 0.55));
        r.slide = f.slide + (p.slide - f.slide) * clamp01((t - 0.45) / 0.55);
      }
      r.apply();
    }
    if (t >= 1) {
      for (const [k, r] of Object.entries(this.rigs)) { r.slide = a.plan[k].slide; r.zoom = a.plan[k].zoom; r.apply(); }
      this.anim = null;
    }
  }

  fit() {
    const narrow = window.matchMedia('(max-width: 820px), (max-aspect-ratio: 1/1)').matches;
    const vb = (narrow ? FRAME[this.view || 'watch'] : WIDE).join(' ');
    for (const el of this.svgs) el.setAttribute('viewBox', vb);
  }

  sync(state, preview) {
    for (const v of Object.values(this.views)) v.sync(state, preview);
  }

  frame(dt, state, alpha, nightF, reduced) {
    this.stepAnim(dt);
    const nk = Math.round(nightF * 50) / 50;
    const key = `${nk}|${this.view}`;
    if (key !== this.nightKey) {
      this.nightKey = key;
      // the village keeps its lanterns: the loupe darkens much less than the forest
      this.dark.setAttribute('opacity', ((this.view === 'hearth' ? 0.14 : 0.3) * nk).toFixed(3));
      for (const r of Object.values(this.rigs)) r.frameSvg.style.filter = nk ? `brightness(${(1 - 0.22 * nk).toFixed(2)})` : '';
    }
    // only what is visible needs its live layer every frame; the Watch keeps
    // consuming battle effects so sounds and bursts never pile up
    this.views.watch.frame(dt, state, alpha, nightF, reduced, this.rigs.watch.slide >= 0.999);
    if (this.view === 'wilds') this.views.wilds.frame(dt, state, nightF, reduced);
    if (this.rigs.hearth.slide < 0.999) this.views.hearth.frame(dt, state, nightF, reduced);
  }
}
