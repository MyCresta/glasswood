// The Watch view: the reading glass over the forest. The artwork under and over
// the glass is pre-drawn (assets/); this module draws everything that changes:
// burrow glows and tags, tonight's routes, barricades, creatures and arrows.
import { NODES } from '../data/web.js';
import { SPAWNS, ENEMIES, archeryStats } from '../data/village.js';
import { WEB, EDGE, routeForSpawn, edgeKey } from '../sim/web.js';
import { activeSpawns } from '../sim/battle.js';

const NS = 'http://www.w3.org/2000/svg';
export const LENS = { x: 630, y: 410, r: 350 };
const S = 10.4;
export const T = (x, z) => [LENS.x + x * S, LENS.y + z * S];
const TOWER_TOP = T(0, 0);

export const svgEl = (tag, attrs = {}, parent) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
};
export const f1 = (n) => Math.round(n * 10) / 10;

function pathD(pts) {
  return pts.map(([x, z], i) => { const [X, Y] = T(x, z); return `${i ? 'L' : 'M'}${f1(X)} ${f1(Y)}`; }).join(' ');
}

export class WatchView {
  constructor(root, { onEdge, onEdgeHover, onSpawn, onFx } = {}) {
    this.root = root;
    this.onFx = onFx;
    this.onEdge = onEdge;
    this.onEdgeHover = onEdgeHover;
    this.onSpawn = onSpawn;
    svgEl('image', { href: 'assets/watch.webp', x: 280, y: 60, width: 700, height: 700 }, root);
    this.live = svgEl('g', { 'clip-path': 'url(#lensclip)' }, root);
    this.nightTint = svgEl('circle', { 'pointer-events': 'none', cx: LENS.x, cy: LENS.y, r: LENS.r, fill: '#1a1450', opacity: 0 }, this.live);
    this.glows = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.routes = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.oldRoutes = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.edges = svgEl('g', {}, this.live);
    this.barricades = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.range = svgEl('circle', { cx: LENS.x, cy: LENS.y, r: 0, fill: 'none', stroke: '#ffd27a', 'stroke-opacity': 0.45, 'stroke-width': 1.5, 'stroke-dasharray': '2 6', 'stroke-linecap': 'round', opacity: 0, 'pointer-events': 'none' }, this.live);
    this.creatures = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.arrows = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.fireflies = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.puffLayer = svgEl('g', { 'pointer-events': 'none',}, this.live);
    this.tags = svgEl('g', {}, root);
    this.sprites = new Map();
    this.arrowEls = new Map();
    this.routeKey = null;
    this.t = 0;
    this.buildEdges();
    this.buildFireflies();
  }

  // Invisible fat strokes along every path, for clicking and hovering.
  buildEdges() {
    for (const e of WEB) {
      if (e.a === 'c' || e.b === 'c') continue;
      const d = pathD(e.pts);
      const hit = svgEl('path', { d, class: 'edge-hit', 'data-key': e.key }, this.edges);
      const hint = svgEl('path', { d, class: 'edge-hint', fill: 'none', stroke: '#ffe08a', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '1 7', opacity: 0, 'pointer-events': 'none' }, this.edges);
      hit.addEventListener('click', () => this.onEdge?.(e.key));
      hit.addEventListener('pointerenter', () => { hint.setAttribute('opacity', 1); this.onEdgeHover?.(e.key); });
      hit.addEventListener('pointerleave', () => { hint.setAttribute('opacity', 0); this.onEdgeHover?.(null); });
      const title = svgEl('title', {}, hit);
      title.textContent = 'Block or open this path';
    }
  }

  buildFireflies() {
    this.flies = [];
    let s = 9;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 24; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 330;
      const el = svgEl('circle', { r: 6, fill: 'url(#gl)' }, this.fireflies);
      this.flies.push({ el, x: LENS.x + Math.cos(a) * d, y: LENS.y + Math.sin(a) * d, ph: r() * 10 });
    }
  }

  // Things that change with the game state but not every frame.
  sync(state, preview = null) {
    const n = state.battle ? state.battle.n : state.night;
    const open = new Set(activeSpawns(n).map((s) => s.id));
    const key = `${n}|${state.barricades.join(',')}|${state.phase}|${preview || ''}`;
    if (key !== this.routeKey) {
      this.routeKey = key;
      this.drawGlowsAndTags(open, n);
      this.drawBarricades(state.barricades, preview);
      this.drawRoutes(state, open, preview);
    }
    const st = archeryStats(state.buildings.archery.level);
    this.range.setAttribute('r', st.range * S);
  }

  drawGlowsAndTags(open, n) {
    this.glows.replaceChildren();
    this.tags.replaceChildren();
    for (const sp of SPAWNS) {
      const [X, Y] = T(...NODES[sp.node]);
      const isOpen = open.has(sp.id);
      if (isOpen) svgEl('circle', { cx: X, cy: Y, r: 40, fill: 'url(#vg)', class: 'burrow-glow' }, this.glows);
      // a pinned paper tag, inside the glass
      const label = isOpen ? sp.name : `${sp.name}, night ${sp.opens}`;
      const w = label.length * 8.4 + 24;
      // keep the whole tag inside the glass: start just below the burrow, then
      // pull it towards the middle until every corner fits
      let tx = X, ty = Y + 16;
      for (let i = 0; i < 12; i++) {
        let far = 0;
        for (const [cx, cy] of [[tx - w / 2, ty], [tx + w / 2, ty], [tx - w / 2, ty + 25], [tx + w / 2, ty + 25]]) far = Math.max(far, Math.hypot(cx - LENS.x, cy - LENS.y));
        const over = far - (LENS.r - 16);
        if (over <= 0) break;
        const d = Math.hypot(tx - LENS.x, ty + 11 - LENS.y) || 1;
        tx -= ((tx - LENS.x) / d) * (over + 1); ty -= ((ty + 11 - LENS.y) / d) * (over + 1);
      }
      const pin = Math.max(-w / 2 + 8, Math.min(w / 2 - 8, X - tx));
      const g = svgEl('g', { class: 'hit', transform: `translate(${f1(tx)} ${f1(ty)}) rotate(${(sp.node.charCodeAt(1) % 3) - 1})`, role: 'button', tabindex: 0, 'aria-label': `${sp.name}: ${isOpen ? 'open' : `opens on night ${sp.opens}`}` }, this.tags);
      svgEl('rect', { x: -w / 2, y: 0, width: w, height: 25, fill: isOpen ? '#cdb184' : '#9d8866', stroke: '#5a4428', 'stroke-width': 0.8 }, g);
      svgEl('circle', { cx: pin, cy: 0, r: 4.5, fill: '#9e3426', stroke: '#5c1520' }, g);
      const t = svgEl('text', { x: 0, y: 18, 'text-anchor': 'middle', 'font-family': 'Kalam, cursive', 'font-size': 15.5, fill: '#23170f' }, g);
      t.textContent = label;
      g.addEventListener('click', () => this.onSpawn?.(sp.id));
    }
  }

  drawBarricades(list, preview) {
    this.barricades.replaceChildren();
    const keys = [...list];
    if (preview && !keys.includes(preview)) keys.push(preview);
    for (const k of keys) {
      const e = EDGE.get(k);
      if (!e) continue;
      const mid = e.pts[Math.floor(e.pts.length / 2)];
      const prev = e.pts[Math.floor(e.pts.length / 2) - 1];
      const [X, Y] = T(...mid);
      const [PX, PY] = T(...prev);
      const ang = (Math.atan2(Y - PY, X - PX) * 180) / Math.PI + 90;
      const ghost = k === preview && !list.includes(k);
      const g = svgEl('g', { transform: `translate(${f1(X)} ${f1(Y)}) rotate(${f1(ang)}) scale(1.25)`, opacity: ghost ? 0.6 : 1, filter: 'url(#lift)' }, this.barricades);
      svgEl('rect', { x: -13, y: -3.5, width: 26, height: 7, rx: 2, fill: '#a07a4e', stroke: '#2a1d1c', 'stroke-width': 1.2 }, g);
      svgEl('path', { d: 'M-9 -9 L-3 9 M9 -9 L3 9', stroke: '#5a3e22', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
    }
  }

  // Tonight's routes as dotted gold; with a preview, the old routes as red dashes.
  drawRoutes(state, open, preview) {
    this.routes.replaceChildren();
    this.oldRoutes.replaceChildren();
    this.routeDots = [];
    if (state.phase === 'night') return;
    const blocked = preview && !state.barricades.includes(preview) ? [...state.barricades, preview] : state.barricades;
    for (const sp of SPAWNS) {
      if (!open.has(sp.id)) continue;
      const r = routeForSpawn(blocked, sp);
      if (!r) continue;
      const path = svgEl('path', { d: pathD(r.pts), fill: 'none' }, this.routes);
      const len = path.getTotalLength();
      this.routeDots.push({ path, len });
      if (preview) {
        const old = routeForSpawn(state.barricades, sp);
        if (old && Math.abs(old.len - r.len) > 0.5) svgEl('path', { d: pathD(old.pts), fill: 'none', stroke: '#e0603e', 'stroke-width': 3, 'stroke-dasharray': '3 7', 'stroke-linecap': 'round', opacity: 0.8 }, this.oldRoutes);
      }
    }
    for (const rd of this.routeDots) {
      rd.dots = [];
      const n = Math.floor(rd.len / 11);
      for (let i = 0; i < n; i++) rd.dots.push(svgEl('circle', { r: 2.3, fill: '#ffe08a' }, this.routes));
    }
  }

  frame(dt, state, alpha, nightF, reducedMotion, hidden = false) {
    this.t += dt;
    if (hidden) { this.drawFx(state.battle, dt); return; }
    this.nightTint.setAttribute('opacity', (0.32 * nightF).toFixed(3));
    this.range.setAttribute('opacity', state.battle ? 1 : 0);
    // marching dots along tonight's routes
    if (this.routeDots?.length) {
      const off = reducedMotion ? 0 : (this.t * 14) % 11;
      for (const rd of this.routeDots) {
        rd.dots.forEach((d, i) => {
          const p = rd.path.getPointAtLength(Math.min(rd.len, i * 11 + off));
          d.setAttribute('cx', f1(p.x)); d.setAttribute('cy', f1(p.y));
        });
      }
    }
    for (const f of this.flies) {
      const k = reducedMotion ? 0 : this.t;
      f.el.setAttribute('cx', f1(f.x + Math.sin(k * 0.4 + f.ph) * 12));
      f.el.setAttribute('cy', f1(f.y + Math.cos(k * 0.33 + f.ph * 2) * 9));
      f.el.setAttribute('opacity', (0.35 + 0.65 * Math.max(0, Math.sin(k * 1.3 + f.ph))).toFixed(2));
    }
    for (const g of this.glows.children) g.setAttribute('opacity', (0.75 + 0.25 * Math.sin(this.t * 1.6)).toFixed(2));
    this.drawCreatures(state.battle, alpha);
    this.drawFx(state.battle, dt);
  }

  // Little bursts: gold rising where a creature fell, splinters where walls were hit.
  drawFx(b, dt) {
    this.puffs ||= [];
    if (b) {
      if (this.fxNight !== b.n) { this.fxNight = b.n; this.seenFx = 0; }
      for (const f of b.fx) {
        if (f.id <= this.seenFx) continue;
        this.seenFx = f.id;
        this.onFx?.(f.kind);
        const [X, Y] = T(f.x, f.z);
        if (f.kind === 'death') for (let i = 0; i < 4; i++) this.puffs.push({ x: X + (Math.random() - 0.5) * 10, y: Y - 8, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20, life: 1.1, c: '#ffd27a', r: 2.6 });
        else if (f.kind === 'wall') for (let i = 0; i < 3; i++) this.puffs.push({ x: X, y: Y - 4, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, life: 0.5, c: '#a07a4e', r: 2 });
        else if (f.kind === 'hit') this.puffs.push({ x: X, y: Y - 10, vx: 0, vy: -10, life: 0.25, c: '#f3e2bf', r: 3 });
      }
    } else this.seenFx = 0;
    this.puffs = this.puffs.filter((p) => (p.life -= dt) > 0).slice(-120);
    while (this.puffLayer.childElementCount < this.puffs.length) svgEl('circle', {}, this.puffLayer);
    while (this.puffLayer.childElementCount > this.puffs.length) this.puffLayer.lastChild.remove();
    this.puffs.forEach((p, i) => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 30 * dt;
      const el = this.puffLayer.children[i];
      el.setAttribute('cx', f1(p.x)); el.setAttribute('cy', f1(p.y)); el.setAttribute('r', p.r); el.setAttribute('fill', p.c); el.setAttribute('opacity', Math.min(1, p.life * 2).toFixed(2));
    });
  }

  drawCreatures(b, alpha) {
    const seen = new Set();
    if (b) {
      for (const e of b.enemies) {
        seen.add(e.id);
        let sp = this.sprites.get(e.id);
        if (!sp) {
          const g = svgEl('g', {}, this.creatures);
          svgEl('circle', { cx: 0, cy: -6, r: 15, fill: 'url(#eg)' }, g);
          const body = svgEl('g', {}, g);
          const sym = e.type === 'wolf' ? ['wolf', 36, 22] : ['gob', 28, 28];
          svgEl('use', { href: `#${sym[0]}`, x: -sym[1] / 2, y: -sym[2] + 2, width: sym[1], height: sym[2] }, body);
          const barBg = svgEl('rect', { x: -12, y: -36, width: 24, height: 4, rx: 2, fill: '#2a1414', opacity: 0 }, g);
          const bar = svgEl('rect', { x: -12, y: -36, width: 24, height: 4, rx: 2, fill: '#e0603e', opacity: 0 }, g);
          sp = { g, body, bar, barBg, flip: 1 };
          this.sprites.set(e.id, sp);
        }
        const x = e.px + (e.x - e.px) * alpha;
        const z = e.pz + (e.z - e.pz) * alpha;
        const [X, Y] = T(x, z);
        const dx = e.x - e.px;
        if (Math.abs(dx) > 1e-4) sp.flip = dx < 0 ? -1 : 1;
        const bob = e.state === 'attack' ? Math.max(0, Math.sin(this.t * 9 + X)) * -2 : -Math.abs(Math.sin(this.t * e.speed * 6 + X)) * 1.5;
        sp.g.setAttribute('transform', `translate(${f1(X)} ${f1(Y + bob)})`);
        sp.body.setAttribute('transform', `scale(${sp.flip} 1)`);
        const frac = Math.max(0, e.hp / e.max);
        const hurt = frac < 0.999;
        sp.bar.setAttribute('opacity', hurt ? 1 : 0);
        sp.barBg.setAttribute('opacity', hurt ? 1 : 0);
        sp.bar.setAttribute('width', f1(24 * frac));
      }
    }
    for (const [id, sp] of this.sprites) if (!seen.has(id)) { sp.g.remove(); this.sprites.delete(id); }
    // arrows: a short pale stroke flying from the tower
    const shots = new Set();
    if (b) {
      for (const s of b.shots) {
        shots.add(s.id);
        let el = this.arrowEls.get(s.id);
        if (!el) { el = svgEl('path', { stroke: '#f3e2bf', 'stroke-width': 2.2, 'stroke-linecap': 'round' }, this.arrows); this.arrowEls.set(s.id, el); }
        const x = s.px + (s.x - s.px) * alpha, z = s.pz + (s.z - s.pz) * alpha;
        const [X, Y] = T(x, z);
        const [LX, LY] = T(s.lx, s.lz);
        const d = Math.hypot(LX - X, LY - Y) || 1;
        const ux = (LX - X) / d, uy = (LY - Y) / d;
        el.setAttribute('d', `M${f1(X - ux * 7)} ${f1(Y - uy * 7)} L${f1(X + ux * 7)} ${f1(Y + uy * 7)}`);
      }
    }
    for (const [id, el] of this.arrowEls) if (!shots.has(id)) { el.remove(); this.arrowEls.delete(id); }
  }
}

export { TOWER_TOP, edgeKey, ENEMIES };
