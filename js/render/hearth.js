// Hearth: the tilted loupe over the village. The village itself is pre-drawn
// (assets/hearth.webp); this layer makes its buildings selectable and darkens
// the glass at night.
import { svgEl, f1 } from './watch.js';
import { HOTSPOTS, HEARTH } from '../data/hotspots.js';
import { BUILDINGS } from '../data/village.js';

export class HearthView {
  constructor(root, { onBuilding } = {}) {
    this.root = root;
    this.onBuilding = onBuilding;
    svgEl('image', { href: 'assets/hearth.webp', x: 0, y: 0, width: 1440, height: 900 }, root);
    const live = svgEl('g', { 'clip-path': 'url(#hearthclip)' }, root);
    this.tint = svgEl('ellipse', { cx: HEARTH.cx, cy: HEARTH.cy, rx: HEARTH.rx, ry: HEARTH.ry, fill: '#140f3a', opacity: 0, 'pointer-events': 'none' }, live);
    this.marks = svgEl('g', {}, live);
    this.hits = svgEl('g', {}, live);
    this.label = svgEl('g', { 'pointer-events': 'none', opacity: 0 }, root);
    this.labelRect = svgEl('rect', { height: 24, fill: '#d9bf8c', stroke: '#5a4428', 'stroke-width': 0.8 }, this.label);
    this.labelText = svgEl('text', { y: 17, 'text-anchor': 'middle', 'font-family': 'Kalam, cursive', 'font-size': 15, fill: '#23170f' }, this.label);
    svgEl('circle', { cx: 0, cy: 0, r: 4.5, fill: '#9e3426', stroke: '#5c1520' }, this.label);
    this.selected = null;
    for (const [id, spots] of Object.entries(HOTSPOTS)) {
      for (const [x, y, hw, hh] of spots) {
        const r = svgEl('rect', { x: x - hw, y: y - hh, width: hw * 2, height: hh + 8, fill: 'transparent', class: 'hit', role: 'button', tabindex: 0, 'aria-label': BUILDINGS[id]?.name || id }, this.hits);
        r.addEventListener('click', () => this.onBuilding?.(id));
        r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onBuilding?.(id); } });
        r.addEventListener('pointerenter', () => this.showLabel(id, x, y - hh - 6));
        r.addEventListener('focus', () => this.showLabel(id, x, y - hh - 6));
        r.addEventListener('pointerleave', () => this.label.setAttribute('opacity', 0));
        r.addEventListener('blur', () => this.label.setAttribute('opacity', 0));
      }
    }
  }

  showLabel(id, x, y) {
    const name = BUILDINGS[id]?.name || id;
    const w = name.length * 7.8 + 24;
    this.labelRect.setAttribute('x', -w / 2);
    this.labelRect.setAttribute('width', w);
    this.labelText.textContent = name;
    this.label.setAttribute('transform', `translate(${f1(x)} ${f1(Math.max(70, y - 24))})`);
    this.label.setAttribute('opacity', 1);
  }

  select(id) {
    this.selected = id;
    this.marks.replaceChildren();
    for (const [x, y, hw] of HOTSPOTS[id] || []) {
      svgEl('ellipse', { cx: x, cy: y - 4, rx: hw * 1.05, ry: hw * 0.42, fill: 'none', stroke: '#ffe08a', 'stroke-width': 3, 'stroke-dasharray': '9 6' }, this.marks);
    }
  }

  sync() {}

  frame(dt, state, nightF, reduced) {
    this.t = (this.t || 0) + dt;
    this.tint.setAttribute('opacity', (0.32 * nightF).toFixed(3));
    if (!reduced) for (const m of this.marks.children) m.setAttribute('stroke-dashoffset', f1(-this.t * 12));
  }
}
