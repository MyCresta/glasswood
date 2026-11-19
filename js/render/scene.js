// The desk at night: one SVG holding the wide desk, the globe, and the three
// ways of looking into it (Wilds, Watch, Hearth). Switching views slides the
// lenses in and out; the narrow-screen view crops to whatever is being looked at.
import { DEFS } from './defs.js';
import { svgEl } from './watch.js';
import { WatchView, LENS } from './watch.js';
import { WildsView } from './wilds.js';
import { HearthView } from './hearth.js';
import { HEARTH } from '../data/hotspots.js';

const GLOBE = { x: 640, y: 424, r: 350 };
// What each view frames: on wide screens the whole desk centred on it, on narrow ones just the glass.
const FRAME = {
  wilds: { cx: GLOBE.x, crop: [GLOBE.x - 400, GLOBE.y - 400, 800, 800] },
  watch: { cx: LENS.x, crop: [LENS.x - 372, LENS.y - 372, 744, 744] },
  hearth: { cx: HEARTH.cx, crop: [HEARTH.cx - 430, HEARTH.cy - 400, 860, 800] },
};

export class Scene {
  constructor(svg, handlers) {
    this.svg = svg;
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.innerHTML = `${DEFS}<defs>
      <clipPath id="lensclip"><circle cx="${LENS.x}" cy="${LENS.y}" r="${LENS.r}"/></clipPath>
      <clipPath id="hearthclip"><ellipse cx="${HEARTH.cx}" cy="${HEARTH.cy}" rx="${HEARTH.rx}" ry="${HEARTH.ry}"/></clipPath>
      <clipPath id="globeclip"><circle cx="${GLOBE.x}" cy="${GLOBE.y}" r="${GLOBE.r - 6}"/></clipPath>
      <radialGradient id="deskvig" cx=".5" cy=".5" r=".75"><stop offset=".45" stop-color="#05030a" stop-opacity="0"/><stop offset="1" stop-color="#05030a" stop-opacity=".75"/></radialGradient></defs>`;
    svgEl('image', { href: 'assets/desk.webp', x: -800, y: -400, width: 3040, height: 1700 }, svg);
    svgEl('image', { href: 'assets/globe-soft.webp', x: 0, y: 0, width: 1440, height: 900 }, svg);
    this.globe = svgEl('image', { href: 'assets/globe.webp', x: 0, y: 0, width: 1440, height: 900, class: 'layer globe' }, svg);
    this.layers = {
      wilds: svgEl('g', { class: 'layer wilds' }, svg),
      hearth: svgEl('g', { class: 'layer hearth' }, svg),
      watch: svgEl('g', { class: 'layer watch' }, svg),
    };
    this.dark = svgEl('rect', { x: -800, y: -400, width: 3040, height: 1700, fill: '#06040c', opacity: 0, 'pointer-events': 'none' }, svg);
    svgEl('rect', { x: -800, y: -400, width: 3040, height: 1700, fill: 'url(#deskvig)', 'pointer-events': 'none' }, svg);
    this.views = {
      wilds: new WildsView(this.layers.wilds, handlers),
      watch: new WatchView(this.layers.watch, handlers),
      hearth: new HearthView(this.layers.hearth, handlers),
    };
    this.view = null;
    window.addEventListener('resize', () => this.fit());
  }

  setView(name) {
    if (this.view === name) return;
    this.view = name;
    for (const [k, g] of Object.entries(this.layers)) g.classList.toggle('off', k !== name);
    this.globe.classList.toggle('off', name !== 'wilds');
    document.body.dataset.view = name;
    this.fit();
  }

  fit() {
    const f = FRAME[this.view || 'watch'];
    const narrow = window.matchMedia('(max-width: 820px), (max-aspect-ratio: 1/1)').matches;
    const vb = narrow ? f.crop : [f.cx - 720, 0, 1440, 900];
    this.svg.setAttribute('viewBox', vb.join(' '));
  }

  sync(state, preview) {
    for (const v of Object.values(this.views)) v.sync(state, preview);
  }

  frame(dt, state, alpha, nightF, reduced) {
    this.dark.setAttribute('opacity', (0.34 * nightF).toFixed(3));
    // only the visible view needs its live layer every frame; the Watch keeps
    // consuming battle effects so sounds and bursts never pile up
    this.views.watch.frame(dt, state, alpha, nightF, reduced, this.view !== 'watch');
    if (this.view === 'wilds') this.views.wilds.frame(dt, state, nightF, reduced);
    if (this.view === 'hearth') this.views.hearth.frame(dt, state, nightF, reduced);
  }
}
