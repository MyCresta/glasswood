// Village buildings, ruins, walls, spawn portals, and instanced enemy/arrow
// geometry. Every group sits on y = 0; `userData.anims` lists moving parts.
import * as THREE from 'three';
import { G, add, finalize, seeded, mergeColored } from './kit.js';
import { WALL_R, BUILDINGS } from '../data/village.js';

const TAU = Math.PI * 2;

function windowPane(g, M, x, y, z, ry = 0, w = 0.16, h = 0.2) {
  add(g, G.rbox(w, h, 0.04, 0.02), M.window, x, y, z, { rot: [0, ry, 0], cast: false });
}

function torch(g, M, x, y, z) {
  add(g, G.cyl(0.02, 0.025, 0.22, 6), M.timber, x, y, z);
  add(g, G.sph(0.045, 8, 6), M.torch, x, y + 0.14, z, { cast: false });
}

function flag(g, M, anims, x, y, z, h = 0.6) {
  add(g, G.cyl(0.015, 0.015, h, 6), M.timber, x, y + h / 2, z);
  const f = add(g, G.rbox(0.24, 0.15, 0.015, 0.006), M.accent, x + 0.12, y + h - 0.1, z, { dynamic: true });
  anims.push({ obj: f, type: 'flutter', speed: 2.4 });
}

// A timber-framed house body with gable roof. Returns height of the eaves.
function house(g, M, { w = 1.2, d = 1, h = 0.7, x = 0, z = 0, ry = 0, roof = M.roofRed, wall = M.plaster, base = M.stone, roofH = 0.55 } = {}) {
  const grp = new THREE.Group();
  grp.position.set(x, 0, z);
  grp.rotation.y = ry;
  add(grp, G.rbox(w + 0.06, 0.18, d + 0.06, 0.04), base, 0, 0.09, 0);
  add(grp, G.rbox(w, h, d, 0.04), wall, 0, 0.18 + h / 2, 0);
  // timber frame
  for (const sx of [-1, 1]) add(grp, G.rbox(0.06, h, 0.04, 0.01), M.timber, sx * (w / 2 - 0.03), 0.18 + h / 2, d / 2 + 0.01);
  add(grp, G.rbox(w, 0.06, 0.04, 0.01), M.timber, 0, 0.18 + h - 0.03, d / 2 + 0.01);
  add(grp, G.rbox(w, 0.05, 0.04, 0.01), M.timber, 0, 0.18 + h * 0.48, d / 2 + 0.01);
  add(grp, G.prism(w + 0.18, roofH, d + 0.22), roof, 0, 0.18 + h, 0, { rot: [0, Math.PI / 2, 0] });
  add(grp, G.rbox(0.22, 0.34, 0.05, 0.03), M.timber, 0, 0.35, d / 2 + 0.02);
  windowPane(grp, M, -w * 0.28, 0.18 + h * 0.72, d / 2 + 0.025);
  windowPane(grp, M, w * 0.28, 0.18 + h * 0.72, d / 2 + 0.025);
  g.add(grp);
  return 0.18 + h;
}

function townhall(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  add(g, G.rbox(2.6, 0.12, 2.3, 0.05), M.stone, 0, 0.06, 0, { cast: false });
  add(g, G.rbox(2.1, 0.55, 1.7, 0.06), M.stone, 0, 0.39, 0);
  add(g, G.rbox(2.0, 0.6, 1.6, 0.04), M.plaster, 0, 0.96, 0);
  for (const x of [-0.95, -0.32, 0.32, 0.95]) add(g, G.rbox(0.07, 0.6, 0.05, 0.01), M.timber, x, 0.96, 0.81);
  add(g, G.rbox(2.0, 0.07, 0.05, 0.01), M.timber, 0, 1.25, 0.81);
  add(g, G.prism(2.3, 0.85, 1.9), M.roofRed, 0, 1.26, 0, { rot: [0, Math.PI / 2, 0] });
  // door and steps
  add(g, G.rbox(0.42, 0.5, 0.08, 0.05), M.timber, 0, 0.37, 0.86);
  add(g, G.rbox(0.7, 0.08, 0.3, 0.02), M.stoneDark, 0, 0.1, 1.02);
  for (const x of [-0.65, 0.65]) windowPane(g, M, x, 0.42, 0.86, 0, 0.18, 0.22);
  for (const x of [-0.65, 0, 0.65]) windowPane(g, M, x, 1.02, 0.82, 0, 0.16, 0.2);
  // bell tower
  const tH = 0.9 + (lv >= 5 ? 0.35 : 0);
  add(g, G.rbox(0.55, tH, 0.55, 0.03), M.plasterWarm, 0, 1.75 + tH / 2 - 0.35, 0);
  add(g, G.pyramid(0.48, 0.6), M.roofSlate, 0, 1.75 + tH - 0.35 + 0.3, 0);
  windowPane(g, M, 0, 1.75 + tH - 0.6, 0.285, 0, 0.18, 0.2);
  flag(g, M, anims, 0, 1.75 + tH + 0.25, 0, 0.5);
  if (lv >= 4) { add(g, G.cyl(0.13, 0.13, 0.03, 20), M.white, 0, 1.75 + tH - 0.62, 0.29, { rot: [Math.PI / 2, 0, 0] }); add(g, G.rbox(0.02, 0.09, 0.01, 0.004), M.dark, 0, 1.75 + tH - 0.6, 0.31); }
  if (lv >= 2) {
    house(g, M, { w: 0.8, d: 0.9, h: 0.55, x: -1.35, z: 0.05, ry: Math.PI / 2, roof: M.roofRed });
  }
  if (lv >= 3) {
    house(g, M, { w: 0.8, d: 0.9, h: 0.55, x: 1.35, z: 0.05, ry: -Math.PI / 2, roof: M.roofRed });
    for (const x of [-0.6, 0.6]) add(g, G.rbox(0.18, 0.4, 0.02, 0.01), M.accent, x, 0.95, 0.83);
  }
  if (lv >= 5) add(g, G.cone(0.05, 0.25, 8), M.gold, 0, 1.75 + tH + 0.1, 0);
  // plaza well
  add(g, G.cyl(0.22, 0.24, 0.25, 16), M.stone, 1.25, 0.12, 1.3);
  add(g, G.cyl(0.17, 0.17, 0.02, 16), M.water, 1.25, 0.24, 1.3, { cast: false });
  return { g, anims };
}

function archery(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  const H = 2.0 + Math.min(lv, 10) * 0.08;
  add(g, G.cyl(0.62, 0.7, 0.2, 20), M.stoneDark, 0, 0.1, 0);
  add(g, G.cyl(0.5, 0.58, H, 20), M.stone, 0, H / 2 + 0.1, 0);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; add(g, G.rbox(0.09, 0.2, 0.04, 0.015), M.dark, Math.cos(a) * 0.53, 0.7 + i * 0.32, Math.sin(a) * 0.53, { rot: [0, -a + Math.PI / 2, 0] }); }
  // platform + crenellations
  add(g, G.cyl(0.72, 0.62, 0.16, 20), M.wood, 0, H + 0.18, 0);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; add(g, G.rbox(0.16, 0.2, 0.1, 0.02), M.stone, Math.cos(a) * 0.66, H + 0.36, Math.sin(a) * 0.66, { rot: [0, -a, 0] }); }
  // roof on posts
  for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + Math.PI / 4; add(g, G.cyl(0.025, 0.025, 0.65, 6), M.timber, Math.cos(a) * 0.5, H + 0.55, Math.sin(a) * 0.5); }
  add(g, G.cone(0.85, 0.65, 16), lv >= 10 ? M.gold : M.roofRed, 0, H + 1.18, 0);
  flag(g, M, anims, 0, H + 1.45, 0, 0.45);
  // archers on top
  const archers = 1 + Math.floor(lv / 3);
  for (let i = 0; i < archers; i++) {
    const a = (i / archers) * TAU - Math.PI / 2;
    const p = new THREE.Group();
    p.position.set(Math.cos(a) * 0.32, H + 0.26, Math.sin(a) * 0.32);
    add(p, G.cap(0.07, 0.12, 4, 8), M.leafDark, 0, 0.13, 0);
    add(p, G.sph(0.065, 10, 8), M.plasterWarm, 0, 0.3, 0);
    add(p, G.torus(0.11, 0.008, 4, 12, Math.PI), M.timber, 0.09, 0.2, 0, { rot: [0, Math.PI / 2, Math.PI / 2] });
    p.userData.dynamic = true;
    g.add(p);
    anims.push({ obj: p, type: 'archer', phase: i * 1.7 });
  }
  // practice yard
  add(g, G.cyl(0.18, 0.18, 0.04, 16), M.hay, 0.95, 0.3, 0.2, { rot: [Math.PI / 2, 0, 0.3] });
  add(g, G.cyl(0.03, 0.03, 0.35, 6), M.timber, 0.95, 0.15, 0.18);
  add(g, G.cyl(0.2, 0.22, 0.3, 12), M.hay, -0.85, 0.15, 0.45);
  if (lv >= 3) torch(g, M, 0.62, 0.9, 0.3);
  if (lv >= 6) add(g, G.rbox(0.18, 0.5, 0.02, 0.01), M.accent, 0, H * 0.55, 0.57);
  return { g, anims, top: H + 0.4 };
}

function farmstead(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  house(g, M, { w: 1.1, d: 0.9, h: 0.6, x: 0.2, z: 0.25, wall: M.wood, roof: M.roofThatch, roofH: 0.6 });
  // fields (outward = −x side in local space)
  const fields = [[-0.75, -0.55, M.crop], [-0.75, 0.35, M.leaf], [0.3, -0.75, M.crop]];
  for (const [x, z, crop] of fields) {
    add(g, G.rbox(0.75, 0.06, 0.65, 0.03), M.soil, x, 0.03, z, { cast: false });
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) add(g, G.cone(0.05, 0.16, 5), crop, x - 0.27 + c * 0.18, 0.13, z - 0.2 + r * 0.2);
  }
  add(g, G.cyl(0.18, 0.2, 0.28, 12), M.hay, 0.85, 0.14, -0.35);
  add(g, G.sph(0.19, 12, 8), M.hay, 0.85, 0.3, -0.35, { scale: [1, 0.6, 1] });
  // fence
  for (let i = 0; i < 6; i++) add(g, G.rbox(0.03, 0.18, 0.03, 0.01), M.woodLight, -1.15, 0.09, -0.85 + i * 0.32);
  add(g, G.rbox(0.02, 0.03, 1.65, 0.01), M.woodLight, -1.15, 0.14, -0.05);
  // the very proud goat
  const goat = new THREE.Group();
  goat.position.set(0.75, 0, 0.75);
  add(goat, G.rbox(0.22, 0.12, 0.1, 0.04), M.white, 0, 0.15, 0);
  add(goat, G.rbox(0.08, 0.08, 0.07, 0.03), M.white, 0.13, 0.22, 0);
  add(goat, G.cone(0.012, 0.06, 4), M.dark, 0.13, 0.28, 0.02, { rot: [0, 0, -0.4] });
  for (const [x, z] of [[-0.07, -0.03], [-0.07, 0.03], [0.07, -0.03], [0.07, 0.03]]) add(goat, G.cyl(0.012, 0.012, 0.1, 4), M.white, x, 0.05, z);
  goat.userData.dynamic = true;
  g.add(goat);
  anims.push({ obj: goat, type: 'graze' });
  return { g, anims };
}

function lumber(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  house(g, M, { w: 0.85, d: 0.75, h: 0.5, x: -0.25, z: 0.3, wall: M.wood, roof: M.roofSlate, roofH: 0.45 });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) add(g, G.cyl(0.09, 0.09, 0.8, 10), M.woodLight, 0.55, 0.09 + r * 0.16, -0.3 + (c - (2 - r) / 2) * 0.19, { rot: [0, 0, Math.PI / 2] });
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) add(g, G.cyl(0.08, 0.08, 0.6, 10), M.wood, -0.6 + c * 0.17, 0.08 + r * 0.15, -0.55, { rot: [Math.PI / 2, 0, 0] });
  add(g, G.cyl(0.14, 0.16, 0.2, 12), M.wood, 0.6, 0.1, 0.55);
  add(g, G.rbox(0.18, 0.03, 0.08, 0.01), M.iron, 0.62, 0.24, 0.55, { rot: [0, 0.5, 0.6] });
  for (const [x, z] of [[0.85, 0.05], [-0.9, 0.25]]) add(g, G.cyl(0.1, 0.12, 0.12, 10), M.wood, x, 0.06, z);
  return { g, anims };
}

function ruin(M, id) {
  const r = seeded([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const g = new THREE.Group();
  const anims = [];
  const w = 1.3 + r() * 0.3;
  const d = 1.05 + r() * 0.25;
  add(g, G.rbox(w + 0.1, 0.12, d + 0.1, 0.04), M.stoneDark, 0, 0.06, 0, { cast: false });
  const walls = [[0, -d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2], [0, d / 2, w, 0]];
  for (const [x, z, len, ry] of walls) {
    const segs = 3;
    for (let k = 0; k < segs; k++) {
      if (r() < 0.3) continue;
      const h = 0.12 + r() * (r() < 0.3 ? 0.65 : 0.3);
      const off = (k - (segs - 1) / 2) * (len / segs);
      add(g, G.rbox(len / segs - 0.03, h, 0.12, 0.03), r() < 0.35 ? M.stoneMoss : M.stone, x + Math.cos(ry) * off, 0.12 + h / 2, z - Math.sin(ry) * off);
    }
  }
  add(g, G.rbox(0.07, 0.07, w * 0.9, 0.02), M.timber, (r() - 0.5) * 0.4, 0.2, 0, { rot: [0.3, r() * 3, 0.45] });
  for (let i = 0; i < 6; i++) add(g, G.ico(0.07 + r() * 0.08, 0), M.stone, (r() - 0.5) * w, 0.12, (r() - 0.5) * d, { rot: [r() * 3, r() * 3, 0] });
  for (let i = 0; i < 4; i++) add(g, G.sph(0.08 + r() * 0.08, 8, 6), r() < 0.5 ? M.leaf : M.leafDark, (r() - 0.5) * w * 1.1, 0.12, (r() - 0.5) * d * 1.1, { scale: [1, 0.7, 1] });
  // a sign post waiting for restoration
  add(g, G.cyl(0.02, 0.02, 0.5, 6), M.timber, w / 2 + 0.05, 0.25, d / 2 + 0.05);
  add(g, G.rbox(0.26, 0.16, 0.02, 0.01), M.woodLight, w / 2 + 0.05, 0.45, d / 2 + 0.07, { rot: [0, 0.3, 0] });
  return { g, anims };
}

function watchtowerRuin(M) {
  const g = new THREE.Group();
  add(g, G.cyl(0.55, 0.62, 0.9, 14, false), M.stone, 0, 0.45, 0);
  add(g, G.cyl(0.48, 0.5, 0.25, 14), M.stoneMoss, 0, 1.0, 0, { rot: [0.15, 0, 0.1] });
  for (let i = 0; i < 4; i++) add(g, G.ico(0.1, 0), M.stone, Math.cos(i * 1.7) * 0.75, 0.08, Math.sin(i * 1.7) * 0.75);
  return { g, anims: [] };
}

const BUILDERS = { townhall, archery, farmstead, lumber };

export function buildBuilding(id, level, M) {
  let res;
  if (id === 'watchtower') res = watchtowerRuin(M);
  else if (level < 1) res = ruin(M, id);
  else res = (BUILDERS[id] || ((m) => ruin(m, id)))(M, level);
  finalize(res.g);
  res.g.userData.anims = res.anims;
  res.g.userData.top = res.top || 1.8;
  return res.g;
}

// The ring of walls. Palisade for levels 1–3, stone from 4, towers from 7.
export function buildWalls(M, lv, anims) {
  const g = new THREE.Group();
  const gateA = Math.PI / 2; // south
  const gap = 0.32; // radians kept for the gatehouse
  const stone = lv >= 4;
  const H = (stone ? 0.75 : 0.6) + lv * 0.04;
  if (!stone) {
    const n = Math.round((TAU * WALL_R) / 0.24);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      if (Math.abs(((a - gateA + Math.PI) % TAU) - Math.PI) < gap) continue;
      const h = H + ((i * 7) % 5) * 0.03;
      add(g, G.cyl(0.11, 0.12, h, 7), M.wood, Math.cos(a) * WALL_R, h / 2, Math.sin(a) * WALL_R);
      add(g, G.cone(0.11, 0.16, 7), M.wood, Math.cos(a) * WALL_R, h + 0.08, Math.sin(a) * WALL_R);
    }
    // inner walkway beam
    const m = 48;
    for (let i = 0; i < m; i++) {
      const a = ((i + 0.5) / m) * TAU;
      if (Math.abs(((a - gateA + Math.PI) % TAU) - Math.PI) < gap + 0.05) continue;
      add(g, G.rbox(0.08, 0.06, (TAU * (WALL_R - 0.18)) / m, 0.01), M.timber, Math.cos(a) * (WALL_R - 0.18), H * 0.6, Math.sin(a) * (WALL_R - 0.18), { rot: [0, -a, 0] });
    }
  } else {
    const m = 72;
    const seg = (TAU * WALL_R) / m;
    for (let i = 0; i < m; i++) {
      const a = ((i + 0.5) / m) * TAU;
      if (Math.abs(((a - gateA + Math.PI) % TAU) - Math.PI) < gap) continue;
      const x = Math.cos(a) * WALL_R, z = Math.sin(a) * WALL_R;
      add(g, G.rbox(0.32, H, seg + 0.02, 0.03), i % 2 ? M.stone : M.stoneDark, x, H / 2, z, { rot: [0, -a, 0] });
      if (i % 2 === 0) add(g, G.rbox(0.34, 0.16, seg * 0.55, 0.02), M.stone, x, H + 0.08, z, { rot: [0, -a, 0] });
    }
  }
  // towers
  if (lv >= 7) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + TAU / 16;
      if (Math.abs(((a - gateA + Math.PI) % TAU) - Math.PI) < 0.5) continue;
      const x = Math.cos(a) * WALL_R, z = Math.sin(a) * WALL_R;
      add(g, G.cyl(0.36, 0.4, H + 0.55, 14), M.stone, x, (H + 0.55) / 2, z);
      add(g, G.cone(0.48, 0.5, 14), lv >= 10 ? M.gold : M.roofSlate, x, H + 0.8, z);
    }
  }
  // gatehouse
  const gx = Math.cos(gateA) * WALL_R, gz = Math.sin(gateA) * WALL_R;
  for (const s of [-1, 1]) {
    const a = gateA + s * (gap - 0.06);
    const tx = Math.cos(a) * WALL_R, tz = Math.sin(a) * WALL_R;
    add(g, G.cyl(0.36, 0.42, H + 0.7, 12), stone ? M.stone : M.wood, tx, (H + 0.7) / 2, tz);
    add(g, G.cone(0.5, 0.5, 12), M.roofRed, tx, H + 0.95, tz);
    torch(g, M, tx, H + 0.1, tz + 0.42);
  }
  add(g, G.rbox(1.9, 0.2, 0.36, 0.04), stone ? M.stoneDark : M.timber, gx, H + 0.3, gz);
  add(g, G.rbox(1.25, H, 0.1, 0.02), M.timber, gx, H / 2, gz + 0.02);
  for (let i = 0; i < 4; i++) add(g, G.rbox(0.04, H, 0.12, 0.01), M.iron, gx - 0.45 + i * 0.3, H / 2, gz + 0.03);
  add(g, G.rbox(0.5, 0.32, 0.02, 0.01), M.accent, gx, H + 0.05, gz + 0.2);
  // torches around the ring for night readability
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU;
    if (Math.abs(((a - gateA + Math.PI) % TAU) - Math.PI) < 0.5) continue;
    torch(g, M, Math.cos(a) * (WALL_R - 0.25), H * 0.7, Math.sin(a) * (WALL_R - 0.25));
  }
  finalize(g);
  g.userData.height = H;
  return g;
}

export function buildPortal(M, open, mossy) {
  const g = new THREE.Group();
  const anims = [];
  add(g, G.rbox(1.5, 0.1, 0.8, 0.04), M.stoneDark, 0, 0.05, 0, { cast: false });
  for (const s of [-1, 1]) add(g, G.rbox(0.28, 1.25, 0.32, 0.05), mossy ? M.stoneMoss : M.stone, s * 0.55, 0.67, 0);
  add(g, G.torus(0.55, 0.15, 8, 20, Math.PI), mossy ? M.stoneMoss : M.stone, 0, 1.28, 0, { scale: [1, 0.8, 1.1] });
  add(g, G.rbox(0.16, 0.22, 0.34, 0.03), M.stoneDark, 0, 1.78, 0);
  for (let i = 0; i < 3; i++) add(g, G.rbox(0.06, 0.12, 0.02, 0.01), M.rune, -0.55 + 0.0, 0.5 + i * 0.3, 0.17, { cast: false });
  for (let i = 0; i < 3; i++) add(g, G.rbox(0.06, 0.12, 0.02, 0.01), M.rune, 0.55, 0.5 + i * 0.3, 0.17, { cast: false });
  for (let i = 0; i < 5; i++) add(g, G.sph(0.12, 8, 6), M.leafDark, -0.75 + (i % 3) * 0.75, 0.15 + (i > 2 ? 1.0 : 0.1), 0.15 * (i % 2 ? 1 : -1), { scale: [1.2, 0.7, 1] });
  if (open) {
    const disc = add(g, G.circle(0.5, 28), M.portal, 0, 0.88, 0, { dynamic: true, cast: false, scale: [0.95, 1.45, 1] });
    anims.push({ obj: disc, type: 'portal' });
  } else {
    for (const [x, y] of [[-0.18, 0.35], [0.18, 0.4], [0, 0.75], [-0.15, 1.05], [0.15, 1.1]]) add(g, G.ico(0.2, 0), M.stoneDark, x, y, 0, { rot: [x * 5, y * 3, 0] });
    for (let i = 0; i < 4; i++) add(g, G.cyl(0.02, 0.02, 1.2, 5), M.leafDark, -0.3 + i * 0.2, 0.75, 0.12, { rot: [0, 0, (i - 1.5) * 0.25] });
  }
  finalize(g);
  g.userData.anims = anims;
  return g;
}

// ---- instanced actors ----

export function goblinGeometry() {
  return mergeColored([
    { geo: G.cap(0.11, 0.12, 4, 10), color: '#6f5a3c', pos: [0, 0.2, 0] },
    { geo: G.sph(0.11, 12, 10), color: '#7fae4a', pos: [0, 0.4, 0.01] },
    { geo: G.cone(0.04, 0.16, 5), color: '#7fae4a', pos: [0.12, 0.43, 0], rot: [0, 0, -1.3] },
    { geo: G.cone(0.04, 0.16, 5), color: '#7fae4a', pos: [-0.12, 0.43, 0], rot: [0, 0, 1.3] },
    { geo: G.sph(0.022, 6, 5), color: '#ffe066', pos: [0.04, 0.42, 0.095] },
    { geo: G.sph(0.022, 6, 5), color: '#ffe066', pos: [-0.04, 0.42, 0.095] },
    { geo: G.cyl(0.025, 0.04, 0.26, 6), color: '#5a3e28', pos: [0.13, 0.25, 0.06], rot: [0.9, 0, -0.2] },
    { geo: G.cyl(0.035, 0.035, 0.1, 6), color: '#6f5a3c', pos: [0.05, 0.06, 0] },
    { geo: G.cyl(0.035, 0.035, 0.1, 6), color: '#6f5a3c', pos: [-0.05, 0.06, 0] },
  ]);
}

export function wolfGeometry() {
  return mergeColored([
    { geo: G.cap(0.1, 0.32, 4, 10), color: '#7c7d84', pos: [0, 0.24, 0], rot: [Math.PI / 2, 0, 0] },
    { geo: G.sph(0.1, 10, 8), color: '#8c8d94', pos: [0, 0.3, 0.27] },
    { geo: G.cone(0.055, 0.14, 6), color: '#6a6b72', pos: [0, 0.28, 0.4], rot: [Math.PI / 2, 0, 0] },
    { geo: G.cone(0.035, 0.09, 4), color: '#5b5c63', pos: [0.05, 0.4, 0.25] },
    { geo: G.cone(0.035, 0.09, 4), color: '#5b5c63', pos: [-0.05, 0.4, 0.25] },
    { geo: G.sph(0.018, 6, 5), color: '#ffcf4a', pos: [0.045, 0.33, 0.35] },
    { geo: G.sph(0.018, 6, 5), color: '#ffcf4a', pos: [-0.045, 0.33, 0.35] },
    { geo: G.cone(0.05, 0.22, 6), color: '#7c7d84', pos: [0, 0.28, -0.3], rot: [-2.0, 0, 0] },
    ...[[0.06, 0.15], [-0.06, 0.15], [0.06, -0.14], [-0.06, -0.14]].map(([x, z]) => ({ geo: G.cyl(0.025, 0.02, 0.18, 5), color: '#6a6b72', pos: [x, 0.09, z] })),
  ]);
}

export function arrowGeometry() {
  return mergeColored([
    { geo: G.cyl(0.012, 0.012, 0.5, 5), color: '#8a5d38', rot: [Math.PI / 2, 0, 0] },
    { geo: G.cone(0.03, 0.08, 5), color: '#cfd2d6', pos: [0, 0, 0.28], rot: [Math.PI / 2, 0, 0] },
    { geo: G.rbox(0.06, 0.005, 0.1, 0.002), color: '#f2efe6', pos: [0, 0, -0.22] },
    { geo: G.rbox(0.005, 0.06, 0.1, 0.002), color: '#f2efe6', pos: [0, 0, -0.22] },
  ]);
}

export function buildingFootprint(id) {
  return { townhall: 1.7, archery: 0.95, farmstead: 1.35, lumber: 1.15, watchtower: 0.8 }[id] || 1.0;
}

export { BUILDINGS };
