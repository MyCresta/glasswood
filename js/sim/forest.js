// A new forest for every run: rings of paths around the village, spokes
// between them, six burrows at the edge, and three widths of path.
//   trail  narrow: only small creatures (goblins)
//   path   most creatures (goblins and wolves)
//   road   wide: the only ways bosses can walk
// Units: the village walls have radius 3; the reading glass shows radius ~33.6.
// The result is plain data, the same for the same seed.
export const WIDTH = { trail: 0, path: 1, road: 2 };

function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Burrows keep their compass direction (their names say where they are);
// the paths between them and the village change every run.
export const BURROW_ANGLES = { s0: -90, s1: 180, s2: 0, s3: 140, s4: -38, s5: 88 };
// the burrows bosses can come from: they always have two roads in
export const ROAD_BURROWS = ['s0', 's2', 's3', 's5'];

const RINGS = [
  { id: 'a', r: 9, n: [10, 12], drop: 0.08, trail: 0.15 },
  { id: 'b', r: 15.5, n: [14, 16], drop: 0, trail: 0 },
  { id: 'c', r: 22, n: [17, 20], drop: 0.22, trail: 0.35 },
  { id: 'd', r: 28, n: [20, 23], drop: 0.28, trail: 0.4 },
];

const ang = (p) => Math.atan2(p[1], p[0]);
const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

export function generateForest(seed) {
  const r = rng(seed ^ 0x51f0e57);
  const nodes = { c: [0, 0] };
  const edges = new Map(); // key -> { a, b, w }
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const add = (a, b, w = 'path') => { if (a !== b && !edges.has(key(a, b))) edges.set(key(a, b), { a, b, w }); };
  const rings = [];

  // gates just outside the walls
  const g0 = r() * Math.PI * 2;
  const gates = [0, 1, 2, 3].map((k) => {
    const a = g0 + (k * Math.PI) / 2 + (r() - 0.5) * 0.4;
    const id = `g${k}`;
    nodes[id] = [Math.cos(a) * 5, Math.sin(a) * 5];
    add('c', id, 'road');
    return id;
  });

  // the rings
  for (const R of RINGS) {
    const n = R.n[0] + Math.floor(r() * (R.n[1] - R.n[0] + 1));
    const off = r() * Math.PI * 2;
    const ids = [];
    for (let k = 0; k < n; k++) {
      const a = off + ((k + (r() - 0.5) * 0.55) / n) * Math.PI * 2;
      const rad = R.r + (r() - 0.5) * 1.8;
      const id = `${R.id}${k}`;
      nodes[id] = [Math.cos(a) * rad, Math.sin(a) * rad];
      ids.push(id);
    }
    for (let k = 0; k < n; k++) if (r() >= R.drop) add(ids[k], ids[(k + 1) % n]);
    rings.push(ids);
  }

  // spokes: every node links inward to the nearest node of the ring inside it,
  // and some to a second one
  const nearest = (p, list, skip) => list.filter((x) => x !== skip).sort((x, y) => angDiff(ang(nodes[x]), ang(p)) - angDiff(ang(nodes[y]), ang(p)))[0];
  for (const id of rings[0]) {
    const g = nearest(nodes[id], gates);
    add(id, g);
  }
  for (let i = 1; i < rings.length; i++) {
    for (const id of rings[i]) {
      const a = nearest(nodes[id], rings[i - 1]);
      add(id, a);
      if (r() < 0.32) add(id, nearest(nodes[id], rings[i - 1], a));
    }
  }

  // the burrows, each linked to the two nearest outer nodes
  for (const [id, deg] of Object.entries(BURROW_ANGLES)) {
    const a = ((deg + (r() - 0.5) * 22) * Math.PI) / 180;
    nodes[id] = [Math.cos(a) * 32.4, Math.sin(a) * 32.4];
    const outer = rings[3].slice().sort((x, y) => angDiff(ang(nodes[x]), a) - angDiff(ang(nodes[y]), a));
    add(id, outer[0]);
    add(id, outer[1]);
  }

  // ---------- widths ----------
  const adj = () => {
    const m = new Map();
    for (const e of edges.values()) {
      if (!m.has(e.a)) m.set(e.a, []);
      if (!m.has(e.b)) m.set(e.b, []);
      m.get(e.a).push(e); m.get(e.b).push(e);
    }
    return m;
  };
  const len = (e) => Math.hypot(nodes[e.a][0] - nodes[e.b][0], nodes[e.a][1] - nodes[e.b][1]);
  // shortest path from a node to any of `goals`, avoiding edges in `avoid`
  function shortest(from, goals, avoid = new Set(), ok = () => true) {
    const A = adj();
    const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
    const q = [from];
    while (q.length) {
      q.sort((x, y) => dist.get(x) - dist.get(y));
      const u = q.shift();
      if (done.has(u)) continue;
      done.add(u);
      if (goals.has(u)) {
        const path = [];
        for (let v = u; prev.has(v); v = prev.get(v).other) path.push(prev.get(v).e);
        return path;
      }
      for (const e of A.get(u) || []) {
        if (avoid.has(e) || !ok(e)) continue;
        const v = e.a === u ? e.b : e.a;
        const d = dist.get(u) + len(e);
        if (d < (dist.get(v) ?? Infinity)) { dist.set(v, d); prev.set(v, { e, other: u }); q.push(v); }
      }
    }
    return null;
  }
  // ring b is a full loop of road, joined to the gates by four road spokes
  for (const e of edges.values()) if (e.a.startsWith('b') && e.b.startsWith('b')) e.w = 'road';
  const ringB = new Set(rings[1]);
  for (const g of gates) for (const e of shortest(g, ringB) || []) e.w = 'road';
  // each road burrow gets two separate roads in to ring b
  for (const s of ROAD_BURROWS) {
    const p1 = shortest(s, ringB) || [];
    for (const e of p1) e.w = 'road';
    for (const e of shortest(s, ringB, new Set(p1)) || []) e.w = 'road';
  }
  // some of the rest narrow to trails
  for (const e of edges.values()) {
    if (e.w !== 'path') continue;
    const ring = /^[a-d]/.test(e.a) && e.a[0] === e.b[0] ? RINGS.find((R) => R.id === e.a[0]) : null;
    const p = ring ? ring.trail : 0.22;
    if (!e.a.startsWith('s') && !e.b.startsWith('s') && r() < p) e.w = 'trail';
  }
  // every burrow must stay reachable for wolves: undo trails on its way in if not
  for (const s of Object.keys(BURROW_ANGLES)) {
    if (shortest(s, new Set(['c']), new Set(), (e) => e.w !== 'trail')) continue;
    for (const e of shortest(s, new Set(['c'])) || []) if (e.w === 'trail') e.w = 'path';
  }

  // the bend of each path
  const list = [...edges.values()].map((e) => {
    const [ax, az] = nodes[e.a], [bx, bz] = nodes[e.b];
    const L = Math.hypot(bx - ax, bz - az);
    const j = (r() - 0.5) * L * 0.28;
    const mid = [(ax + bx) / 2 + (-(bz - az) / L) * j, (az + bz) / 2 + ((bx - ax) / L) * j];
    return [e.a, e.b, mid.map((v) => Math.round(v * 1000) / 1000), e.w];
  });

  // ponds in the gaps
  const ponds = [];
  for (let t = 0; t < 60 && ponds.length < 5; t++) {
    const a = r() * Math.PI * 2, d = 8 + r() * 23, rad = 1.1 + r() * 1.3;
    const p = [Math.cos(a) * d, Math.sin(a) * d];
    const clear = list.every(([a1, b1, m]) => [nodes[a1], m, nodes[b1]].every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > rad + 1.6))
      && ponds.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > q[2] + rad + 2);
    if (clear) ponds.push([+p[0].toFixed(2), +p[1].toFixed(2), +rad.toFixed(2)]);
  }
  for (const k of Object.keys(nodes)) nodes[k] = nodes[k].map((v) => Math.round(v * 1000) / 1000);
  return { seed, nodes, edges: list, ponds };
}
