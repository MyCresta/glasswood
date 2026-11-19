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
const WIDE_CX = 660;                         // wide screens frame the desk here, whatever the view

// Each glass: how big it sits on the desk (k), where its centre lands, where it
// slides in from, and its content planes (finest last), each drawn at `mag` times
// the globe with `anchor` being the village in that plane's own coordinates.
const RIGS = {
  watch: { k: 0.86, at: [622, 404], from: [300, 360], c: [LENS.x, LENS.y], mag: R_WATCH },
  hearth: { k: 0.88, at: [646, 420], from: [-260, -420], c: [HEARTH.cx, HEARTH.cy], mag: R_HEARTH },
};
const FRAME = {
  wilds: [GLOBE.x - 392, GLOBE.y - 392, 784, 800],
  watch: [622 - 332, 404 - 332, 664, 680],
  hearth: [646 - 395, 420 - 360, 790, 740],
};
const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (t) => Math.max(0, Math.min(1, t));

class Rig {
  constructor(name, main, top, globeHref) {
    const d = RIGS[name];
    this.d = d;
    this.name = name;
    this.g = svgEl('g', { class: `rig ${name}`, opacity: 0, visibility: 'hidden' }, main);
    const shape = name === 'watch'
      ? svgEl('circle', { cx: d.c[0], cy: d.c[1], r: LENS.r })
      : svgEl('ellipse', { cx: d.c[0], cy: d.c[1], rx: HEARTH.rx, ry: HEARTH.ry });
    const clip = svgEl('clipPath', { id: `rigclip-${name}` }, main.querySelector('defs'));
    clip.append(shape);
    this.inner = svgEl('g', { 'clip-path': `url(#rigclip-${name})` }, this.g);
    // plane 1: the globe's own terrain, magnified
    this.globe = svgEl('image', { href: globeHref, x: 290, y: 74, width: 700, height: 700 }, this.inner);
    this.planes = [{ el: this.globe, mag: 1, anchor: V }];
    if (name === 'hearth') {
      // plane 2: the forest map, between the globe and the village
      const wm = svgEl('image', { href: 'assets/watch.webp', x: 280, y: 60, width: 700, height: 700 }, this.inner);
      this.planes.push({ el: wm, mag: R_WATCH, anchor: [LENS.x, LENS.y], fadeIn: [0.08, 0.32] });
    }
    // the last plane is the view's own content (map or village, with everything live)
    this.content = svgEl('g', {}, this.inner);
    this.planes.push({ el: this.content, mag: d.mag, anchor: d.c, fadeIn: name === 'watch' ? [0.05, 0.4] : [0.72, 0.96], live: true });
    this.top = svgEl('g', { class: `rig ${name}`, opacity: 0, visibility: 'hidden' }, top);
    const fr = name === 'watch' ? { href: 'assets/watch-frame.webp', x: 0, y: 0, width: 1440, height: 1000 } : { href: 'assets/hearth-frame.webp', x: 0, y: -360, width: 1440, height: 1260 };
    svgEl('image', fr, this.top);
    this.slide = 1;   // 1: away from the globe, 0: over it
    this.zoom = 0;    // 0: the globe as it is, 1: fully magnified
    this.apply();
  }

  // How much bigger than the globe things look through the glass at zoom z
  // (in log space, so the zoom feels even). Fully zoomed, the content is drawn
  // at its own size inside a glass that is itself k times its drawn size.
  mag(z) { return Math.exp(Math.log(this.d.mag * this.d.k) * z); }

  apply() {
    const { k, at, from, c } = this.d;
    const s = ease(this.slide);
    const ax = at[0] + from[0] * s - k * c[0], ay = at[1] + from[1] * s - k * c[1];
    const tf = `translate(${ax.toFixed(2)} ${ay.toFixed(2)}) scale(${k})`;
    this.g.setAttribute('transform', tf);
    this.top.setAttribute('transform', tf);
    const shown = this.slide < 0.999;
    const op = shown ? clamp01((1 - this.slide) * 2.2).toFixed(3) : 0;
    for (const el of [this.g, this.top]) {
      el.setAttribute('opacity', op);
      el.setAttribute('visibility', shown ? 'visible' : 'hidden');
    }
    // where the village appears on the desk: under the glass's centre once zoomed in
    const S = this.mag(this.zoom);
    const u = ease(this.zoom);
    const cx = at[0] + from[0] * s, cy = at[1] + from[1] * s;
    const P = [V[0] + (cx - V[0]) * u, V[1] + (cy - V[1]) * u];
    for (const p of this.planes) {
      const sc = S / (p.mag * k);
      const tx = (P[0] - ax) / k - sc * p.anchor[0], ty = (P[1] - ay) / k - sc * p.anchor[1];
      const near = Math.abs(sc - 1) < 1e-4 && Math.abs(tx) < 0.01 && Math.abs(ty) < 0.01;
      p.el.setAttribute('transform', near ? '' : `matrix(${sc.toFixed(5)} 0 0 ${sc.toFixed(5)} ${tx.toFixed(2)} ${ty.toFixed(2)})`);
      if (p.fadeIn) {
        const o = clamp01((this.zoom - p.fadeIn[0]) / (p.fadeIn[1] - p.fadeIn[0]));
        p.el.setAttribute('opacity', o.toFixed(3));
        p.el.setAttribute('visibility', o > 0.001 ? 'visible' : 'hidden');
      }
    }
    this.g.classList.toggle('settled', this.slide === 0 && this.zoom === 1);
  }
}

export class Scene {
  constructor(svg, handlers) {
    this.svg = svg;
    this.topSvg = document.getElementById('scene-top');
    for (const el of [svg, this.topSvg]) el.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = `${DEFS}<defs>
      <clipPath id="lensclip"><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r}"/></clipPath>
      <clipPath id="hearthclip"><ellipse cx="${HEARTH.cx}" cy="${HEARTH.cy}" rx="${HEARTH.rx}" ry="${HEARTH.ry}"/></clipPath>
      <radialGradient id="deskvig" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#05030a" stop-opacity="0"/><stop offset="1" stop-color="#05030a" stop-opacity=".75"/></radialGradient></defs>`;
    svgEl('image', { href: 'assets/desk.webp', x: -800, y: -400, width: 3040, height: 1700 }, svg);
    svgEl('image', { href: 'assets/globe-base.webp', x: 0, y: 0, width: 1440, height: 900 }, svg);
    this.terrain = svgEl('image', { href: 'assets/globe-terrain.webp', x: 290, y: 74, width: 700, height: 700 }, svg);
    this.globeNight = svgEl('circle', { cx: GLOBE.x, cy: GLOBE.y, r: GLOBE.r, fill: '#140f3a', opacity: 0, 'pointer-events': 'none' }, svg);
    this.wildsLayer = svgEl('g', { class: 'layer wilds' }, svg);
    svgEl('image', { href: 'assets/globe-glass.svg', x: 0, y: 0, width: 1440, height: 900, 'pointer-events': 'none' }, svg);
    this.rigs = {
      hearth: new Rig('hearth', svg, this.topSvg, 'assets/globe-terrain.webp'),
      watch: new Rig('watch', svg, this.topSvg, 'assets/globe-terrain.webp'),
    };
    this.dark = svgEl('rect', { x: -800, y: -400, width: 3040, height: 1700, fill: '#06040c', opacity: 0, 'pointer-events': 'none' }, svg);
    svgEl('rect', { x: -800, y: -400, width: 3040, height: 1700, fill: 'url(#deskvig)', 'pointer-events': 'none' }, svg);
    this.topDark = 0;
    this.views = {
      wilds: new WildsView(this.wildsLayer, handlers),
      watch: new WatchView(this.rigs.watch.content, handlers),
      hearth: new HearthView(this.rigs.hearth.content, handlers),
    };
    this.view = null;
    this.anim = null;
    window.addEventListener('resize', () => this.fit());
  }

  // Bring the right glass over the globe and zoom through it.
  setView(name, instant = false) {
    if (this.view === name) return;
    const prev = this.view;
    this.view = name;
    this.wildsLayer.classList.toggle('off', name !== 'wilds');
    document.body.dataset.view = name;
    this.fit();
    const reduced = instant || document.body.classList.contains('reduced-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
    // the glass coming in is laid on top of the one going away
    if (this.rigs[name]) {
      const r = this.rigs[name];
      this.svg.insertBefore(r.g, this.dark);
      this.topSvg.append(r.top);
      // arriving from the other glass, start already as magnified as that one was
      if (prev && this.rigs[prev] && this.rigs[prev].slide < 0.5 && r.slide > 0.5) r.zoom = name === 'hearth' ? Math.log(R_WATCH * RIGS.watch.k) / Math.log(R_HEARTH * RIGS.hearth.k) : 0;
    }
    const targets = {};
    for (const [k, r] of Object.entries(this.rigs)) {
      targets[k] = k === name ? { slide: 0, zoom: 1, from: { slide: r.slide, zoom: r.zoom } } : { slide: 1, zoom: k === prev && name !== 'wilds' ? r.zoom : 0, from: { slide: r.slide, zoom: r.zoom } };
    }
    if (reduced || !prev) {
      for (const [k, r] of Object.entries(this.rigs)) { r.slide = targets[k].slide; r.zoom = targets[k].zoom; r.apply(); }
      this.anim = null;
      return;
    }
    this.anim = { t: 0, targets, name };
  }

  // One step of the glass animation. Coming in: slide over the globe, then zoom.
  // Going away: zoom back out to the plain globe, then slide off.
  stepAnim(dt) {
    const a = this.anim;
    if (!a) return;
    a.t += dt;
    const T = 1.25;
    const t = Math.min(1, a.t / T);
    for (const [k, r] of Object.entries(this.rigs)) {
      const g = a.targets[k], f = g.from;
      if (k === a.name) {
        r.slide = f.slide + (g.slide - f.slide) * clamp01(t / 0.45);
        r.zoom = f.zoom + (g.zoom - f.zoom) * ease(clamp01((t - (f.slide > 0.5 ? 0.32 : 0)) / (f.slide > 0.5 ? 0.68 : 1)));
      } else if (f.slide < 0.999) {
        const toWilds = a.name === 'wilds';
        r.zoom = f.zoom + (g.zoom - f.zoom) * ease(clamp01(t / (toWilds ? 0.55 : 0.3)));
        r.slide = f.slide + (g.slide - f.slide) * clamp01((t - (toWilds ? 0.45 : 0.25)) / 0.55);
      }
      r.apply();
    }
    if (t >= 1) this.anim = null;
  }

  fit() {
    const narrow = window.matchMedia('(max-width: 820px), (max-aspect-ratio: 1/1)').matches;
    const vb = narrow ? FRAME[this.view || 'watch'] : [WIDE_CX - 720, 0, 1440, 900];
    for (const el of [this.svg, this.topSvg]) el.setAttribute('viewBox', vb.join(' '));
  }

  sync(state, preview) {
    for (const v of Object.values(this.views)) v.sync(state, preview);
  }

  frame(dt, state, alpha, nightF, reduced) {
    this.stepAnim(dt);
    this.dark.setAttribute('opacity', (0.34 * nightF).toFixed(3));
    this.globeNight.setAttribute('opacity', (0.28 * nightF).toFixed(3));
    const td = Math.round(nightF * 20) / 20;
    if (td !== this.topDark) { this.topDark = td; this.topSvg.style.filter = td ? `brightness(${(1 - 0.3 * td).toFixed(2)})` : ''; }
    // only what is visible needs its live layer every frame; the Watch keeps
    // consuming battle effects so sounds and bursts never pile up
    const watchSeen = this.rigs.watch.slide < 1;
    this.views.watch.frame(dt, state, alpha, nightF, reduced, !watchSeen);
    if (this.view === 'wilds') this.views.wilds.frame(dt, state, nightF, reduced);
    if (this.rigs.hearth.slide < 1) this.views.hearth.frame(dt, state, nightF, reduced);
  }
}
