// Hearth: the tilted loupe over the village, drawn in layers so it changes as
// the village grows: the ground, the walls, each building at its current stage
// (ruin, restored, grown), the villagers at their posts, and the trees in front.
import { svgEl, f1 } from './watch.js';
import { HOTSPOTS, HEARTH, SPRITES, FEET, VILLAGERS } from '../data/hotspots.js';
import { BUILDINGS } from '../data/village.js';
import { build, buildingStage } from '../sim/build.js';
import { CARD, FAMILIES } from '../data/cards.js';

const FULL = { x: 236, y: 56, width: 800, height: 748 };
// defenders stand on the tower, in two rows when there are many
const POSTS = [[-12, 0], [12, 0], [-28, 4], [28, 4], [0, 6], [-40, 10], [40, 10], [-20, 14], [20, 14], [0, 18]];
const COLORS = { archer: 0, axe: 1, hunter: 6, crossbow: 2, mage: 3, witch: 5 };

export class HearthView {
  constructor(root, { onBuilding } = {}) {
    this.root = root;
    this.onBuilding = onBuilding;
    svgEl('image', { href: 'assets/hearth-base.webp', ...FULL }, root);
    this.walls = svgEl('image', { href: 'assets/walls-0.webp', ...FULL }, root);
    this.world = svgEl('g', {}, root);
    this.sprites = {};
    // buildings and villagers are drawn back to front
    this.order = Object.keys(SPRITES).sort((a, b) => FEET[a][1] - FEET[b][1]);
    for (const id of this.order) {
      const [x, y, w, h] = SPRITES[id];
      const g = svgEl('g', { class: 'bsprite' }, this.world);
      g.style.transformOrigin = `${FEET[id][0]}px ${FEET[id][1]}px`;
      this.sprites[id] = { g, img: svgEl('image', { href: `assets/b-${id}-0.webp`, x, y, width: w, height: h }, g), stage: -1 };
    }
    this.people = svgEl('g', { 'pointer-events': 'none' }, root);
    svgEl('image', { href: 'assets/hearth-front.webp', ...FULL, 'pointer-events': 'none' }, root);
    const live = svgEl('g', { 'clip-path': 'url(#hearthclip)' }, root);
    this.tint = svgEl('ellipse', { cx: HEARTH.cx, cy: HEARTH.cy, rx: HEARTH.rx, ry: HEARTH.ry, fill: '#140f3a', opacity: 0, 'pointer-events': 'none' }, live);
    this.dust = svgEl('g', { 'pointer-events': 'none' }, live);
    this.marks = svgEl('g', {}, live);
    this.tags = svgEl('g', { 'pointer-events': 'none' }, live);
    this.hits = svgEl('g', {}, live);
    this.puffs = [];
    this.selected = null;
    for (const [id, spots] of Object.entries(HOTSPOTS)) {
      for (const [x, y, hw, hh] of spots) {
        const r = svgEl('rect', { x: x - hw, y: y - hh, width: hw * 2, height: hh + 8, fill: 'transparent', class: 'hit', role: 'button', tabindex: 0, 'aria-label': BUILDINGS[id]?.name || id }, this.hits);
        r.addEventListener('click', () => this.onBuilding?.(id));
        r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.onBuilding?.(id); } });
      }
    }
  }

  select(id) {
    this.selected = id;
    this.marks.replaceChildren();
    for (const [x, y, hw] of HOTSPOTS[id] || []) {
      svgEl('ellipse', { cx: x, cy: y - 2, rx: hw * 1.1, ry: hw * 0.42, fill: 'none', stroke: '#ffe08a', 'stroke-width': 3, 'stroke-dasharray': '9 6' }, this.marks);
    }
  }

  sync(state) {
    // each building at the stage its level calls for
    const b = build(state);
    for (const id of this.order) {
      const s = this.sprites[id];
      const st = buildingStage(b, id);
      if (st !== s.stage) { s.stage = st; s.img.setAttribute('href', `assets/b-${id}-${st}.webp`); }
    }
    const ws = buildingStage(b, 'walls');
    if (ws !== this.wallStage) { this.wallStage = ws; this.walls.setAttribute('href', `assets/walls-${ws}.webp`); }
    this.syncPeople(state);
    this.syncTags(state);
  }

  // every defender card is a figure on the tower
  syncPeople(state) {
    const defs = state.cards.filter((id) => CARD[id]?.family === 'defender');
    const st = buildingStage(build(state), 'archery');
    const key = `${defs.join(',')}|${st}`;
    if (key === this.peopleKey) return;
    this.peopleKey = key;
    this.people.replaceChildren();
    const [fx, fy] = FEET.archery;
    const lift = [62, 78, 100][st];
    defs.slice(0, POSTS.length).map((id, i) => [id, POSTS[i]]).sort((a, b) => a[1][1] - b[1][1]).forEach(([id, [dx, dy]]) => {
      const g = svgEl('g', { transform: `translate(${f1(fx + dx)} ${f1(fy - lift + dy)})` }, this.people);
      g.innerHTML = VILLAGERS[COLORS[id] ?? 0];
      svgEl('title', {}, g).textContent = CARD[id].name;
    });
  }

  // a small paper tag at the foot of each building: its level, or that it is a ruin
  syncTags(state) {
    const counts = build(state).counts;
    const num = (id) => BUILDINGS[id].families.reduce((a, f) => a + counts[f], 0);
    const key = Object.keys(HOTSPOTS).map((id) => `${id}${num(id)}`).join('|');
    if (key === this.tagKey) return;
    this.tagKey = key;
    this.tags.replaceChildren();
    for (const [id, spots] of Object.entries(HOTSPOTS)) {
      const [x, y] = spots[0];
      const name = BUILDINGS[id]?.name || id;
      const lv = num(id);
      const ruin = false;
      const w = name.length * 7.6 + 46;
      const g = svgEl('g', { transform: `translate(${f1(x)} ${f1(y + 10)}) rotate(${id.length % 2 ? -1.5 : 1.5})`, opacity: ruin ? 0.85 : 1 }, this.tags);
      svgEl('rect', { x: -w / 2 + 1.5, y: 2, width: w, height: 22, fill: '#000', opacity: 0.35 }, g);
      svgEl('rect', { x: -w / 2, y: 0, width: w, height: 22, fill: ruin ? '#a99470' : '#d9bf8c', stroke: '#5a4428', 'stroke-width': 0.8 }, g);
      svgEl('circle', { cx: -w / 2 + 13, cy: 11, r: 8.5, fill: ruin ? '#6a5a44' : '#9e3426', stroke: ruin ? '#3a2e20' : '#5c1520' }, g);
      const n = svgEl('text', { x: -w / 2 + 13, y: 15, 'text-anchor': 'middle', 'font-family': 'Fraunces, Georgia, serif', 'font-size': 11.5, 'font-weight': 600, fill: '#f6e2c0' }, g);
      n.textContent = lv;
      const t = svgEl('text', { x: -w / 2 + 27, y: 16, 'font-family': 'Kalam, cursive', 'font-size': 14, fill: '#23170f' }, g);
      t.textContent = name;
    }
  }

  // The moment a building is finished: dust rises, and the new drawing settles in.
  celebrate(id) {
    const s = this.sprites[id];
    if (s) { s.g.classList.remove('pop'); void s.g.getBBox(); s.g.classList.add('pop'); }
    const [x, y] = FEET[id] || [];
    if (x === undefined) return;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const c = svgEl('circle', { cx: x, cy: y, r: 6, fill: '#d8c8a8', opacity: 0.8 }, this.dust);
      this.puffs.push({ c, x, y, vx: Math.cos(a) * (30 + (k % 3) * 14), vy: Math.sin(a) * 12 - 18, t: 0 });
    }
  }

  frame(dt, state, nightF, reduced) {
    this.t = (this.t || 0) + dt;
    this.tint.setAttribute('opacity', (0.1 * nightF).toFixed(3));
    if (!reduced) for (const m of this.marks.children) m.setAttribute('stroke-dashoffset', f1(-this.t * 12));
    for (const p of this.puffs) {
      p.t += dt;
      const k = p.t / 1.1;
      p.c.setAttribute('cx', f1(p.x + p.vx * p.t));
      p.c.setAttribute('cy', f1(p.y + p.vy * p.t));
      p.c.setAttribute('r', f1(6 + 16 * k));
      p.c.setAttribute('opacity', Math.max(0, 0.8 * (1 - k)).toFixed(2));
    }
    this.puffs = this.puffs.filter((p) => (p.t < 1.1 ? true : (p.c.remove(), false)));
  }
}
