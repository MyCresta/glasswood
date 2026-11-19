// The Wilds: the bare globe, with pinned paper tags on the places inside it.
import { svgEl, f1 } from './watch.js';
import { LOCATIONS } from '../data/world.js';

const G = { x: 640, y: 424, s: 2.95 };
export const WT = (x, z) => [G.x + x * G.s, G.y + z * G.s];

export class WildsView {
  constructor(root, { onPlace } = {}) {
    this.root = root;
    this.onPlace = onPlace;
    this.tint = svgEl('circle', { cx: G.x, cy: G.y, r: 344, fill: '#140f3a', opacity: 0, 'pointer-events': 'none' }, root);
    this.rings = svgEl('g', {}, root);
    this.tags = svgEl('g', {}, root);
    this.selected = null;
    this.name = null;
  }

  sync(state) {
    const name = state.village.name;
    const key = `${name}|${this.selected}`;
    if (key === this.key) return;
    this.key = key;
    this.tags.replaceChildren();
    this.rings.replaceChildren();
    for (const l of LOCATIONS) {
      const [X, Y] = WT(...l.pos);
      const label = l.kind === 'home' ? name : l.name;
      const sel = this.selected === l.id;
      if (sel) svgEl('circle', { cx: X, cy: Y, r: 22, fill: 'none', stroke: '#ffe08a', 'stroke-width': 2.5, 'stroke-dasharray': '7 5' }, this.rings);
      const w = label.length * 7.3 + 22;
      const g = svgEl('g', { class: 'hit', transform: `translate(${f1(X)} ${f1(Y + 14)}) rotate(${(l.id.length % 3) - 1})`, role: 'button', tabindex: 0, 'aria-label': `${label}, ${l.kind === 'home' ? 'your village' : l.kind}` }, this.tags);
      svgEl('circle', { cx: 0, cy: -14, r: 16, fill: 'transparent' }, g);
      svgEl('rect', { x: -w / 2, y: 0, width: w, height: 22, fill: sel ? '#e2c894' : l.kind === 'home' ? '#d9bf8c' : '#c9ae80', stroke: '#5a4428', 'stroke-width': 0.8 }, g);
      svgEl('circle', { cx: 0, cy: 0, r: 4.5, fill: '#9e3426', stroke: '#5c1520' }, g);
      const t = svgEl('text', { x: 0, y: 16, 'text-anchor': 'middle', 'font-family': 'Kalam, cursive', 'font-size': 13.5, fill: '#23170f' }, g);
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
