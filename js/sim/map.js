// Battlefield grid, natural obstacles and flow-field pathfinding.
// Cells are indexed i (x) and j (z); cell centre = ((i - H) * TILE, (j - H) * TILE).
import { TILE, GRID, WALL_R, FIELD_R, SPAWNS, PATHS, CLEAR_R, LAKE } from '../data/village.js';

export const H = (GRID - 1) / 2;
export const FREE = 0;
export const VILLAGE = 1;
export const OFFMAP = 2;
export const ROCK = 3;
export const PIECE = 4; // player-placed blockers (later)
export const FOREST = 5;
export const WATER = 6;

export const idx = (i, j) => j * GRID + i;
export const cellCenter = (i, j) => [(i - H) * TILE, (j - H) * TILE];
export const cellOf = (x, z) => [Math.round(x / TILE + H), Math.round(z / TILE + H)];
export const inGrid = (i, j) => i >= 0 && j >= 0 && i < GRID && j < GRID;

export function spawnPos(s) {
  return s.pos;
}

export function distToPath(x, z, p) {
  let best = Infinity;
  for (let i = 0; i < p.pts.length - 1; i++) {
    const [ax, az] = p.pts[i];
    const [bx, bz] = p.pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

// How "open" a point is: < 0 inside a path or the clearing, > 0 in the forest.
export function openness(x, z) {
  let d = Math.hypot(x, z) - CLEAR_R;
  for (const p of PATHS) d = Math.min(d, distToPath(x, z, p) - p.w / 2);
  return d;
}

export function rng(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Base terrain: village core, the clearing and paths (walkable), a lake, and
// forest everywhere else.
function baseTerrain() {
  const t = new Uint8Array(GRID * GRID);
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const [x, z] = cellCenter(i, j);
    const d = Math.hypot(x, z);
    let code;
    if (d < WALL_R + 0.45) code = VILLAGE;
    else if (d > FIELD_R + 1.5) code = OFFMAP;
    else if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r) code = WATER;
    else if (openness(x, z) < TILE * 0.42) code = FREE;
    else code = FOREST;
    t[idx(i, j)] = code;
  }
  for (const s of SPAWNS) {
    const [ci, cj] = cellOf(...s.pos);
    if (inGrid(ci, cj)) t[idx(ci, cj)] = FREE;
  }
  return t;
}

export function spawnsConnected(tiles) {
  const f = buildFlowField(tiles);
  return SPAWNS.every((s) => {
    const [x, z] = spawnPos(s);
    const [i, j] = cellOf(x, z);
    return isFinite(f.dist[idx(i, j)]);
  });
}


export function isWalkable(code) { return code === FREE; }

// Goal cells: walkable cells touching the village.
function isGoal(tiles, i, j) {
  if (!isWalkable(tiles[idx(i, j)])) return false;
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    if ((di || dj) && inGrid(i + di, j + dj) && tiles[idx(i + di, j + dj)] === VILLAGE) return true;
  }
  return false;
}

const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

// Dijkstra from every goal cell outward. Diagonals may not cut blocked corners.
export function buildFlowField(tiles = TERRAIN) {
  const N = GRID * GRID;
  const dist = new Float64Array(N).fill(Infinity);
  const next = new Int32Array(N).fill(-1);
  const heap = []; // binary heap of [d, k]
  const push = (d, k) => {
    heap.push([d, k]);
    let c = heap.length - 1;
    while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop();
    if (heap.length) {
      heap[0] = last;
      let c = 0;
      for (;;) {
        const l = 2 * c + 1, r = l + 1;
        let m = c;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === c) break;
        [heap[m], heap[c]] = [heap[c], heap[m]];
        c = m;
      }
    }
    return top;
  };
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    if (isGoal(tiles, i, j)) { dist[idx(i, j)] = 0; push(0, idx(i, j)); }
  }
  while (heap.length) {
    const [d, k] = pop();
    if (d > dist[k]) continue;
    const i = k % GRID, j = (k / GRID) | 0;
    for (const [di, dj, c] of NB) {
      const ni = i + di, nj = j + dj;
      if (!inGrid(ni, nj) || !isWalkable(tiles[idx(ni, nj)])) continue;
      if (di && dj && (!isWalkable(tiles[idx(i + di, j)]) || !isWalkable(tiles[idx(i, j + dj)]))) continue;
      const nk = idx(ni, nj);
      const nd = d + c;
      if (nd < dist[nk]) { dist[nk] = nd; next[nk] = k; push(nd, nk); }
    }
  }
  return { dist, next };
}

// The route an enemy would walk from a spawn point, as world positions.
export function routeFrom(field, x, z) {
  const [i, j] = cellOf(x, z);
  let k = idx(i, j);
  const pts = [[x, z]];
  let guard = 0;
  while (k >= 0 && field.dist[k] > 0 && guard++ < GRID * GRID) {
    k = field.next[k];
    if (k < 0) break;
    pts.push(cellCenter(k % GRID, (k / GRID) | 0));
  }
  return { pts, length: isFinite(field.dist[idx(i, j)]) ? field.dist[idx(i, j)] * TILE : Infinity };
}


export const TERRAIN = baseTerrain();
export const ROCK_CELLS = [];
for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) if (TERRAIN[idx(i, j)] === ROCK) ROCK_CELLS.push([i, j]);
export const FOREST_CELLS = [];
for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) if (TERRAIN[idx(i, j)] === FOREST) FOREST_CELLS.push([i, j]);

let cached = null;
export function defaultField() {
  return (cached ||= buildFlowField(TERRAIN));
}
