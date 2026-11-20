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
// the burrows bosses can come from, each with a road in
export const ROAD_BURROWS = ['s0', 's2', 's5'];

// Rings of paths joined by a few spokes. Few spokes on purpose: blocking one
// sends creatures round the ring to the next, a real detour.
const RINGS = [
  { id: 'a', r: 9.5, n: 8, spokesOut: 5, drop: 0, trail: 0.2 },
  { id: 'b', r: 16, n: 11, spokesOut: 6, drop: 0, trail: 0 },
  { id: 'c', r: 22.5, n: 14, spokesOut: 7, drop: 0.12, trail: 0.3 },
  { id: 'd', r: 28.5, n: 17, drop: 0.12, trail: 0.35 },
];

const ang = (p) => Math.atan2(p[1], p[0]);
const angDiff = (a, b) => Math.abs(((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI);

function cross(p, q, r, s) {
  const d = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return d(p, q, r) * d(p, q, s) < 0 && d(r, s, p) * d(r, s, q) < 0;
}
export function bez(a, m, b, n = 10) {
  // control point so the curve passes through m
  const c = [2 * m[0] - (a[0] + b[0]) / 2, 2 * m[1] - (a[1] + b[1]) / 2];
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]);
  }
  return out;
}

export function generateForest(seed) {
  const r = rng(seed ^ 0x51f0e57);
  const nodes = { c: [0, 0] };
  const edges = new Map(); // key -> { a, b, w, mid, pts }
  const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const rings = [];
  const ringOf = {};

  // where a path between two nodes bends: ring paths follow the circle
  const midFor = (a, b, ringR) => {
    const A = nodes[a], B = nodes[b];
    if (ringR) {
      let ta = ang(A), tb = ang(B);
      if (tb - ta > Math.PI) tb -= Math.PI * 2;
      if (ta - tb > Math.PI) ta -= Math.PI * 2;
      const t = (ta + tb) / 2, rr = (Math.hypot(...A) + Math.hypot(...B)) / 2 + (r() - 0.5) * 0.8;
      return [Math.cos(t) * rr, Math.sin(t) * rr];
    }
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const j = (r() - 0.5) * L * 0.22;
    return [(A[0] + B[0]) / 2 + (-(B[1] - A[1]) / L) * j, (A[1] + B[1]) / 2 + ((B[0] - A[0]) / L) * j];
  };
  // add a path unless it would cross another or run too close alongside one at a shared node
  const add = (a, b, w = 'path', ringR = 0) => {
    if (a === b || edges.has(key(a, b))) return false;
    const mid = midFor(a, b, ringR);
    const pts = bez(nodes[a], mid, nodes[b]);
    for (const e of edges.values()) {
      const shared = [e.a, e.b].filter((n) => n === a || n === b);
      if (shared.length) {
        const n = shared[0];
        // the angle between the two paths leaving the shared node
        const p1 = n === a ? pts[2] : pts[pts.length - 3];
        const p2 = n === e.a ? e.pts[2] : e.pts[e.pts.length - 3];
        const o = nodes[n];
        if (angDiff(Math.atan2(p1[1] - o[1], p1[0] - o[0]), Math.atan2(p2[1] - o[1], p2[0] - o[0])) < 0.36) return false;
        continue;
      }
      for (let i = 1; i < pts.length; i++) for (let k = 1; k < e.pts.length; k++) if (cross(pts[i - 1], pts[i], e.pts[k - 1], e.pts[k])) return false;
    }
    edges.set(key(a, b), { a, b, w, mid, pts });
    return true;
  };

  // gates just outside the walls
  const g0 = r() * Math.PI * 2;
  const gates = [0, 1, 2, 3].map((k) => {
    const a = g0 + (k * Math.PI) / 2 + (r() - 0.5) * 0.3;
    const id = `g${k}`;
    nodes[id] = [Math.cos(a) * 5, Math.sin(a) * 5];
    add('c', id, 'road');
    return id;
  });

  for (const R of RINGS) {
    const off = r() * Math.PI * 2;
    const ids = [];
    for (let k = 0; k < R.n; k++) {
      const a = off + ((k + (r() - 0.5) * 0.4) / R.n) * Math.PI * 2;
      const rad = R.r + (r() - 0.5) * 1.6;
      const id = `${R.id}${k}`;
      nodes[id] = [Math.cos(a) * rad, Math.sin(a) * rad];
      ringOf[id] = R;
      ids.push(id);
    }
    rings.push(ids);
  }
  // spokes first (they matter most), then the rings
  const nearest = (p, list) => list.slice().sort((x, y) => angDiff(ang(nodes[x]), ang(p)) - angDiff(ang(nodes[y]), ang(p)));
  for (const id of rings[0].length ? gates : []) for (const t of nearest(nodes[id], rings[0])) if (add(id, t)) break;
  for (let i = 1; i < rings.length; i++) {
    const outer = rings[i], k = RINGS[i - 1].spokesOut;
    const start = Math.floor(r() * outer.length);
    for (let j = 0; j < k; j++) {
      const id = outer[(start + Math.round((j * outer.length) / k)) % outer.length];
      for (const t of nearest(nodes[id], rings[i - 1]).slice(0, 3)) if (add(id, t)) break;
    }
  }
  RINGS.forEach((R, i) => {
    const ids = rings[i];
    for (let k = 0; k < ids.length; k++) if (r() >= R.drop) add(ids[k], ids[(k + 1) % ids.length], 'path', R.r);
  });

  // the burrows, each linked to the nearest outer nodes
  for (const [id, deg] of Object.entries(BURROW_ANGLES)) {
    const a = ((deg + (r() - 0.5) * 18) * Math.PI) / 180;
    nodes[id] = [Math.cos(a) * 33, Math.sin(a) * 33];
    let n = 0;
    const near = rings[3].slice().sort((x, y) => Math.hypot(nodes[x][0] - nodes[id][0], nodes[x][1] - nodes[id][1]) - Math.hypot(nodes[y][0] - nodes[id][0], nodes[y][1] - nodes[id][1]));
    const dist = (t) => Math.hypot(nodes[t][0] - nodes[id][0], nodes[t][1] - nodes[id][1]);
    for (const t of near.slice(0, 5)) { if ((dist(t) < 13 || !n) && add(id, t)) n++; if (n === 2) break; }
  }

  // ---------- make sure everything joins up ----------
  const adj = () => {
    const m = new Map();
    for (const e of edges.values()) {
      if (!m.has(e.a)) m.set(e.a, []);
      if (!m.has(e.b)) m.set(e.b, []);
      m.get(e.a).push(e); m.get(e.b).push(e);
    }
    return m;
  };
  const reach = () => {
    const A = adj(), seen = new Set(['c']), q = ['c'];
    while (q.length) { const u = q.pop(); for (const e of A.get(u) || []) { const v = e.a === u ? e.b : e.a; if (!seen.has(v)) { seen.add(v); q.push(v); } } }
    return seen;
  };
  for (let pass = 0; pass < 4; pass++) {
    const seen = reach();
    const lost = Object.keys(nodes).filter((n) => !seen.has(n));
    if (!lost.length) break;
    for (const n of lost) {
      if (reach().has(n)) continue;
      const near = Object.keys(nodes).filter((m) => m !== n && m !== 'c').sort((x, y) => Math.hypot(nodes[x][0] - nodes[n][0], nodes[x][1] - nodes[n][1]) - Math.hypot(nodes[y][0] - nodes[n][0], nodes[y][1] - nodes[n][1]));
      for (const m of near.slice(0, 6)) if (Math.hypot(nodes[m][0] - nodes[n][0], nodes[m][1] - nodes[n][1]) < 13 && add(n, m, 'path', ringOf[n] && ringOf[n] === ringOf[m] ? ringOf[n].r : 0)) break;
    }
  }
  // any node still cut off is dropped
  const seen = reach();
  for (const n of Object.keys(nodes)) if (!seen.has(n)) delete nodes[n];
  for (const [k, e] of edges) if (!seen.has(e.a)) edges.delete(k);

  // ---------- widths ----------
  const len = (e) => Math.hypot(nodes[e.a][0] - nodes[e.b][0], nodes[e.a][1] - nodes[e.b][1]);
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
  // roads: the straightest way in from each boss burrow, and a few arcs of
  // the middle ring so a blocked road has a way round
  const centre = new Set(['c']);
  for (const s of ROAD_BURROWS) if (nodes[s]) for (const e of shortest(s, centre) || []) e.w = 'road';
  for (const e of edges.values()) if (e.a[0] === 'b' && e.b[0] === 'b' && r() < 0.5) e.w = 'road';
  for (const e of edges.values()) {
    if (e.w !== 'path' || e.a.startsWith('s') || e.b.startsWith('s')) continue;
    const ring = ringOf[e.a] && ringOf[e.a] === ringOf[e.b] ? ringOf[e.a] : null;
    if (r() < (ring ? ring.trail : 0.25)) e.w = 'trail';
  }
  // every burrow must stay reachable for wolves
  for (const s of Object.keys(BURROW_ANGLES)) {
    if (!nodes[s] || shortest(s, new Set(['c']), new Set(), (e) => e.w !== 'trail')) continue;
    for (const e of shortest(s, new Set(['c'])) || []) if (e.w === 'trail') e.w = 'path';
  }

  const round = (v) => Math.round(v * 1000) / 1000;
  const list = [...edges.values()].map((e) => [e.a, e.b, e.mid.map(round), e.w]);

  // ponds in the gaps
  const ponds = [];
  const all = [...edges.values()].flatMap((e) => e.pts);
  for (let t = 0; t < 80 && ponds.length < 5; t++) {
    const a = r() * Math.PI * 2, d = 8 + r() * 23, rad = 1.1 + r() * 1.3;
    const p = [Math.cos(a) * d, Math.sin(a) * d];
    const clear = all.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > rad + 1.4)
      && ponds.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > q[2] + rad + 2);
    if (clear) ponds.push([+p[0].toFixed(2), +p[1].toFixed(2), +rad.toFixed(2)]);
  }
  for (const k of Object.keys(nodes)) nodes[k] = nodes[k].map(round);
  return { seed, nodes, edges: list, ponds };
}
