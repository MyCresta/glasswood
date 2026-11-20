// The path web of a run's forest: geometry of each path, routes to the
// village by creature size, and the rule that barricades may never seal the
// village off, for any size of creature that can come from a burrow.
import { SPAWNS, WALL_R } from '../data/village.js';
import { generateForest, WIDTH, ROAD_BURROWS } from './forest.js';

export const ROAD_SPAWNS = ROAD_BURROWS;

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

// Which widths each size of creature can walk.
export const SIZES = { small: 0, medium: 1, large: 2 };
export const SIZE_NAMES = { small: 'small creatures', medium: 'wolves', large: 'bosses' };

export function makeWeb(forest) {
  const NODES = forest.nodes;
  const WEB = forest.edges.map(([a, b, mid, w]) => {
    const pts = sampleCurve([NODES[a], mid, NODES[b]]);
    return { key: edgeKey(a, b), a, b, mid, pts, len: polyLength(pts), w: w || 'path', wi: WIDTH[w || 'path'] };
  });
  const EDGE = new Map(WEB.map((e) => [e.key, e]));
  const ADJ = new Map();
  for (const e of WEB) {
    if (!ADJ.has(e.a)) ADJ.set(e.a, []);
    if (!ADJ.has(e.b)) ADJ.set(e.b, []);
    ADJ.get(e.a).push(e);
    ADJ.get(e.b).push(e);
  }
  // the sizes that can come from each burrow (bosses only from road burrows)
  const sizesFor = (spawn) => (ROAD_BURROWS.includes(spawn.node) ? ['small', 'medium', 'large'] : ['small', 'medium']);

  // Shortest distance from every node to the village centre, for one size of
  // creature, avoiding blocked edges.
  function buildField(blocked = [], size = 'small') {
    const shut = new Set(blocked);
    const min = SIZES[size];
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
        if (shut.has(e.key) || e.wi < min) continue;
        const v = e.a === u ? e.b : e.a;
        const nd = du + e.len;
        if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); next.set(v, u); queue.push([v, nd]); }
      }
    }
    return { dist, next, size };
  }

  const cache = new Map();
  function fieldFor(blocked = [], size = 'small') {
    const k = `${size}:${[...blocked].sort().join(',')}`;
    if (!cache.has(k)) { if (cache.size > 60) cache.clear(); cache.set(k, buildField(blocked, size)); }
    return cache.get(k);
  }

  function routeFrom(field, start) {
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
    let cut = pts.findIndex(([x, z]) => Math.hypot(x, z) <= WALL_R + 0.6);
    if (cut < 0) cut = pts.length - 1;
    const walk = pts.slice(0, cut + 1);
    return { nodes, pts: walk, len: polyLength(walk) };
  }

  const routeForSpawn = (blocked, spawn, size = 'small') => routeFrom(fieldFor(blocked, size), spawn.node);

  function canBlock(barricades, key, max) {
    const e = EDGE.get(key);
    if (!e) return { ok: false, reason: 'There is no path there.' };
    if (barricades.includes(key)) return { ok: false, reason: 'That path is already blocked.' };
    if (e.a === 'c' || e.b === 'c') return { ok: false, reason: 'That is inside the walls.' };
    if (barricades.length >= max) return { ok: false, reason: `All ${max} barricades are in use. Take one up first.` };
    const blocked = [...barricades, key];
    for (const size of ['small', 'medium', 'large']) {
      const field = buildField(blocked, size);
      const sealed = SPAWNS.filter((s) => sizesFor(s).includes(size) && !isFinite(field.dist.get(s.node) ?? Infinity));
      if (sealed.length) {
        const names = sealed.map((s) => s.name).join(', ');
        return { ok: false, reason: `That would seal the village off from ${names} for ${SIZE_NAMES[size]}. There must always be a way in.`, sealed: sealed.map((s) => s.id), size };
      }
    }
    return { ok: true };
  }

  function routeLengths(blocked, size = 'small') {
    const field = fieldFor(blocked, size);
    const out = {};
    for (const s of SPAWNS) out[s.id] = routeFrom(field, s.node)?.len ?? Infinity;
    return out;
  }

  return { forest, NODES, WEB, EDGE, ADJ, ponds: forest.ponds, sizesFor, buildField, fieldFor, routeFrom, routeForSpawn, canBlock, routeLengths };
}

// The web of a run, made once per seed.
let current = null;
export function webForSeed(seed) {
  if (!current || current.forest.seed !== seed) current = makeWeb(generateForest(seed));
  return current;
}
export const webFor = (state) => webForSeed(state.seed);
