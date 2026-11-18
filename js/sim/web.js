// The path web: geometry of each path, routes to the village, and the rule
// that barricades may never seal the village off.
import { NODES, EDGES } from '../data/web.js';
import { SPAWNS, WALL_R } from '../data/village.js';

export const edgeKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const SAMPLES = 8; // per half of an edge

// Same curve the design uses: Catmull-Rom through [a, mid, b], as cubic Béziers.
function sampleCurve(P) {
  const out = [P[0]];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let k = 1; k <= SAMPLES; k++) {
      const t = k / SAMPLES, u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  return out;
}

function polyLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

// Every edge with its sampled points (from a to b) and length.
export const WEB = EDGES.map(([a, b, mid]) => {
  const pts = sampleCurve([NODES[a], mid, NODES[b]]);
  return { key: edgeKey(a, b), a, b, mid, pts, len: polyLength(pts) };
});
export const EDGE = new Map(WEB.map((e) => [e.key, e]));
const ADJ = new Map();
for (const e of WEB) {
  if (!ADJ.has(e.a)) ADJ.set(e.a, []);
  if (!ADJ.has(e.b)) ADJ.set(e.b, []);
  ADJ.get(e.a).push(e);
  ADJ.get(e.b).push(e);
}

export function spawnNode(spawn) { return spawn.node; }

// Shortest distance from every node to the village centre, avoiding blocked edges.
export function buildField(blocked = []) {
  const shut = new Set(blocked);
  const dist = new Map([['c', 0]]);
  const next = new Map();
  const done = new Set();
  const queue = [['c', 0]];
  while (queue.length) {
    let bi = 0;
    for (let i = 1; i < queue.length; i++) if (queue[i][1] < queue[bi][1]) bi = i;
    const [u, du] = queue.splice(bi, 1)[0];
    if (done.has(u)) continue;
    done.add(u);
    for (const e of ADJ.get(u) || []) {
      if (shut.has(e.key)) continue;
      const v = e.a === u ? e.b : e.a;
      const nd = du + e.len;
      if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); next.set(v, u); queue.push([v, nd]); }
    }
  }
  return { dist, next, blocked: [...shut].sort() };
}

let cached = null;
export function fieldFor(blocked = []) {
  const key = [...blocked].sort().join(',');
  if (!cached || cached.key !== key) cached = { key, field: buildField(blocked) };
  return cached.field;
}

// The nodes and points an enemy walks from a node to the walls.
export function routeFrom(field, start) {
  if (!isFinite(field.dist.get(start) ?? Infinity)) return null;
  const nodes = [start];
  const pts = [NODES[start]];
  let u = start;
  while (u !== 'c') {
    const v = field.next.get(u);
    const e = EDGE.get(edgeKey(u, v));
    const seg = e.a === u ? e.pts : [...e.pts].reverse();
    for (let i = 1; i < seg.length; i++) pts.push(seg[i]);
    nodes.push(v);
    u = v;
  }
  // stop at the wall instead of the centre
  let cut = pts.findIndex(([x, z]) => Math.hypot(x, z) <= WALL_R + 0.6);
  if (cut < 0) cut = pts.length - 1;
  const walk = pts.slice(0, cut + 1);
  return { nodes, pts: walk, len: polyLength(walk) };
}

export function routeForSpawn(blocked, spawn) {
  return routeFrom(fieldFor(blocked), spawn.node);
}

// Can this edge take a barricade, given the ones already placed?
export function canBlock(barricades, key, max) {
  const e = EDGE.get(key);
  if (!e) return { ok: false, reason: 'There is no path there.' };
  if (barricades.includes(key)) return { ok: false, reason: 'That path is already blocked.' };
  if (e.a === 'c' || e.b === 'c') return { ok: false, reason: 'That is inside the walls.' };
  if (barricades.length >= max) return { ok: false, reason: `All ${max} barricades are in use. Take one up first.` };
  const field = buildField([...barricades, key]);
  const sealed = SPAWNS.filter((s) => !isFinite(field.dist.get(s.node) ?? Infinity));
  if (sealed.length) {
    const names = sealed.map((s) => s.name).join(', ');
    return { ok: false, reason: `That would seal the village off from ${names}. There must always be a way in.`, sealed: sealed.map((s) => s.id) };
  }
  return { ok: true, field };
}

// How much longer each burrow's route becomes with a set of barricades.
export function routeLengths(blocked) {
  const field = fieldFor(blocked);
  const out = {};
  for (const s of SPAWNS) out[s.id] = routeFrom(field, s.node)?.len ?? Infinity;
  return out;
}
