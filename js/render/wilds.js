// The Wilds: the bare globe. Only the places the village has discovered show,
// each with its landmark and a small paper tag.
import { svgEl, f1 } from './watch.js';
import { LOCATIONS } from '../data/world.js';
import { MARKERS } from '../data/places-art.js';

const G = { x: 640, y: 424, s: 2.95 };
export const WT = (x, z) => [G.x + x * G.s, G.y + z * G.s];

export class WildsView {
  constructor(root, { onPlace } = {}) {
    this.root = root;
    this.onPlace = onPlace;
    this.tint = svgEl('circle', { cx: G.x, cy: G.y, r: 344, fill: '#140f3a', opacity: 0, 'pointer-events': 'none' }, root);
    this.marks = svgEl('g', { 'pointer-events': 'none' }, root);
    this.rings = svgEl('g', { 'pointer-events': 'none' }, root);
    this.tags = svgEl('g', {}, root);
    this.selected = null;
  }

  sync(state) {
    const name = state.village.name;
    const known = LOCATIONS.filter((l) => l.found <= state.best);
    const key = `${name}|${this.selected}|${known.length}`;
    if (key === this.key) return;
    this.key = key;
    this.tags.replaceChildren();
    this.rings.replaceChildren();
    this.marks.innerHTML = known.map((l) => MARKERS[l.id] || '').join('');
    for (const l of known) {
      const [X, Y] = WT(...l.pos);
      const label = l.kind === 'home' ? name : l.name;
      const sel = this.selected === l.id;
      if (sel) svgEl('circle', { cx: X, cy: Y, r: 18, fill: 'none', stroke: '#ffe08a', 'stroke-width': 2.2, 'stroke-dasharray': '6 4' }, this.rings);
      const w = label.length * 6.4 + 14;
      const g = svgEl('g', { class: 'hit', transform: `translate(${f1(X)} ${f1(Y + 11)})`, role: 'button', tabindex: 0, 'aria-label': label }, this.tags);
      svgEl('circle', { cx: 0, cy: -11, r: 14, fill: 'transparent' }, g);
      svgEl('rect', { x: -w / 2 + 1, y: 1.5, width: w, height: 17, fill: '#000', opacity: 0.3 }, g);
      svgEl('rect', { x: -w / 2, y: 0, width: w, height: 17, rx: 1.5, fill: sel ? '#e8d09c' : l.kind === 'home' ? '#dcc290' : '#ccb283', stroke: '#5a4428', 'stroke-width': 0.7 }, g);
      const t = svgEl('text', { x: 0, y: 12.5, 'text-anchor': 'middle', 'font-family': "'Alegreya Sans', sans-serif", 'font-size': 12, 'font-weight': 600, fill: '#23170f' }, g);
      t.textContent = label;
      const pick = () => this.onPlace?.(l.id);
      g.addEventListener('click', pick);
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    }
  }

  select(id) { this.selected = id; this.key = null; }

  frame(dt, state, nightF) {
    this.tint.setAttribute('opacity', (0.3 * nightF).toFixed(3));
  }
}
