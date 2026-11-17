// Building models. Each returns a Group sitting on y = 0 within a ~1.9 footprint,
// with `userData.anims` listing moving parts. Higher levels add visible detail.
import * as THREE from 'three';
import { G, add, finalize } from './kit.js';

const TAU = Math.PI * 2;

function foundation(g, M, w = 1.9, d = 1.9) {
  add(g, G.rbox(w, 0.14, d, 0.07), M.foundation, 0, 0.07, 0, { cast: false });
}

function windowsRing(g, M, r, y, n, size = 0.09, offset = 0) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + offset;
    add(g, G.rbox(size, size * 1.3, 0.04, 0.02), M.window, Math.sin(a) * r, y, Math.cos(a) * r, { rot: [0, a, 0], cast: false });
  }
}

function lamp(g, M, x, z, h = 0.55) {
  add(g, G.cyl(0.022, 0.03, h, 8), M.dark, x, h / 2, z);
  add(g, G.sph(0.055, 12, 8), M.window, x, h + 0.03, z, { cast: false });
}

function trim(lv, M) {
  return lv >= 10 ? M.brass : M.accent;
}

function hq(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M, 1.95, 1.95);
  add(g, G.cyl(0.82, 0.88, 0.62, 40), M.wall, 0, 0.45, 0);
  add(g, G.torus(0.84, 0.05, 8, 48), M.accent, 0, 0.72, 0, { rot: [Math.PI / 2, 0, 0] });
  windowsRing(g, M, 0.86, 0.45, 12, 0.11);
  add(g, G.dome(0.8), M.wallCool, 0, 0.76, 0, { scale: [1, 0.72, 1] });
  add(g, G.dome(0.36), M.glass, 0, 1.3, 0, { scale: [1, 0.8, 1] });
  add(g, G.cyl(0.36, 0.36, 0.06, 28), M.roof, 0, 1.3, 0);
  // door
  add(g, G.rbox(0.34, 0.42, 0.18, 0.06), M.roof, 0, 0.35, 0.82);
  add(g, G.rbox(0.24, 0.32, 0.04, 0.04), M.window, 0, 0.34, 0.9, { cast: false });
  // mast + beacon
  add(g, G.cyl(0.025, 0.035, 0.9, 8), M.metal, 0.45, 1.35, -0.3);
  const beacon = add(g, G.sph(0.06, 12, 8), M.beacon, 0.45, 1.82, -0.3, { dynamic: true, cast: false });
  anims.push({ obj: beacon, type: 'blink', speed: 1.1 });
  // banner in civilization colour
  add(g, G.cyl(0.018, 0.018, 0.7, 6), M.metal, -0.72, 0.85, 0.55);
  const flag = add(g, G.rbox(0.28, 0.18, 0.02, 0.01), M.accent, -0.58, 1.1, 0.55, { dynamic: true });
  anims.push({ obj: flag, type: 'flutter', speed: 2.2 });
  // side pods
  for (const a of [0.9, -0.9, Math.PI - 0.6]) {
    add(g, G.cap(0.18, 0.18, 6, 14), M.wallWarm, Math.sin(a) * 0.95, 0.32, Math.cos(a) * 0.95);
  }
  if (lv >= 2) {
    add(g, G.cyl(0.55, 0.6, 0.3, 32), M.wall, 0, 1.02, 0);
    windowsRing(g, M, 0.6, 1.04, 10, 0.08, 0.3);
  }
  if (lv >= 3) {
    const dish = new THREE.Group();
    dish.position.set(-0.45, 1.25, -0.4);
    add(dish, G.cyl(0.03, 0.03, 0.3, 8), M.metal, 0, 0.15, 0);
    add(dish, G.sph(0.24, 20, 10, TAU, 0, Math.PI / 2.5), M.wallCool, 0, 0.35, 0, { rot: [Math.PI * 0.7, 0, 0] });
    dish.userData.dynamic = true;
    g.add(dish);
    anims.push({ obj: dish, type: 'spin', axis: 'y', speed: 0.25 });
  }
  lamp(g, M, 0.75, 0.8);
  return { g, anims };
}

function extractor(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M);
  add(g, G.rbox(1.0, 0.55, 0.9, 0.1), M.wall, -0.35, 0.42, 0.35);
  add(g, G.rbox(1.02, 0.08, 0.92, 0.04), M.hazard, -0.35, 0.68, 0.35);
  add(g, G.rbox(0.18, 0.18, 0.04, 0.03), M.window, -0.55, 0.45, 0.82, { cast: false });
  add(g, G.rbox(0.18, 0.18, 0.04, 0.03), M.window, -0.2, 0.45, 0.82, { cast: false });
  // derrick
  const H = 1.7 + Math.min(lv, 10) * 0.04;
  const legs = [[0.28, -0.28], [0.68, -0.28], [0.28, -0.68], [0.68, -0.68]].map(([x, z]) => [x * 0.9 + 0.1, z * 0.9 + 0.1]);
  for (const [x, z] of legs) add(g, G.cyl(0.035, 0.045, H, 8), M.metal, x, 0.14 + H / 2, z);
  for (const y of [0.6, 1.1, H - 0.05]) {
    add(g, G.rbox(0.48, 0.05, 0.05, 0.02), M.metal, 0.46, y, -0.08 - 0.13);
    add(g, G.rbox(0.48, 0.05, 0.05, 0.02), M.metal, 0.46, y, -0.44 - 0.07);
    add(g, G.rbox(0.05, 0.05, 0.42, 0.02), M.metal, 0.33, y, -0.37);
    add(g, G.rbox(0.05, 0.05, 0.42, 0.02), M.metal, 0.69, y, -0.37);
  }
  const wheel = new THREE.Group();
  wheel.position.set(0.51, H + 0.22, -0.37);
  add(wheel, G.torus(0.22, 0.04, 8, 28), trim(lv, M));
  add(wheel, G.rbox(0.42, 0.04, 0.04, 0.015), M.metal);
  add(wheel, G.rbox(0.04, 0.42, 0.04, 0.015), M.metal);
  wheel.userData.dynamic = true;
  g.add(wheel);
  anims.push({ obj: wheel, type: 'spin', axis: 'z', speed: 2.4 });
  const drill = new THREE.Group();
  drill.position.set(0.51, 0.55, -0.37);
  add(drill, G.cyl(0.05, 0.05, 0.9, 10), M.metal, 0, 0.35, 0);
  add(drill, G.cone(0.14, 0.32, 14), M.hazard, 0, -0.12, 0, { rot: [Math.PI, 0, 0] });
  drill.userData.dynamic = true;
  g.add(drill);
  anims.push({ obj: drill, type: 'drill', speed: 6 });
  // ore pile
  const pile = [[-0.55, -0.45, 0.16], [-0.38, -0.6, 0.12], [-0.68, -0.68, 0.11], [-0.5, -0.75, 0.09]];
  for (const [x, z, r] of pile) add(g, G.ico(r, 0), M.ore, x, 0.14 + r * 0.6, z, { rot: [x * 3, z * 5, 0] });
  if (lv >= 3) add(g, G.rbox(0.9, 0.08, 0.16, 0.03), M.dark, -0.1, 0.4, -0.55, { rot: [0, 0.4, 0.25] });
  if (lv >= 5) { for (const [x, z, r] of [[-0.2, -0.82, 0.13], [-0.05, -0.7, 0.1]]) add(g, G.ico(r, 0), M.ore, x, 0.14 + r * 0.6, z); lamp(g, M, 0.8, 0.75); }
  if (lv >= 7) { add(g, G.rbox(0.42, 0.36, 0.4, 0.08), M.wallCool, -0.35, 0.86, 0.35); add(g, G.rbox(0.3, 0.12, 0.04, 0.02), M.window, -0.35, 0.9, 0.56, { cast: false }); }
  if (lv >= 10) add(g, G.cone(0.08, 0.2, 12), M.brass, 0.51, H + 0.5, -0.37);
  return { g, anims };
}

function farm(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M);
  const L = 1.55;
  // greenhouse frame + glass
  add(g, G.rbox(0.9, 0.12, L, 0.04), M.wall, -0.1, 0.2, 0);
  for (const z of [-L / 2, -L / 4, 0, L / 4, L / 2]) {
    add(g, G.torus(0.45, 0.03, 6, 24, Math.PI), z === -L / 2 || z === L / 2 ? M.wall : M.metal, -0.1, 0.25, z * 0.98);
  }
  add(g, G.halfCyl(0.45, L), M.glass, -0.1, 0.25, 0, { rot: [0, Math.PI / 2, 0], cast: false });
  // planters and plants
  for (const x of [-0.3, 0.1]) {
    add(g, G.rbox(0.2, 0.12, L - 0.2, 0.03), M.soil, x, 0.3, 0);
    for (let i = 0; i < 6; i++) {
      const z = -L / 2 + 0.22 + i * ((L - 0.44) / 5);
      add(g, G.sph(0.09 + ((i * 7 + (x > 0 ? 3 : 0)) % 3) * 0.015, 10, 8), i % 2 ? M.leaf : M.leafDark, x, 0.42, z, { scale: [1, 0.85, 1] });
    }
  }
  const lights = add(g, G.rbox(0.06, 0.03, L - 0.3, 0.01), M.growLight, -0.1, 0.62, 0, { cast: false });
  lights.userData.glow = true;
  // pump
  add(g, G.cyl(0.14, 0.14, 0.4, 16), M.wallCool, 0.66, 0.34, 0.55);
  add(g, G.torus(0.14, 0.025, 6, 20), M.accent, 0.66, 0.44, 0.55, { rot: [Math.PI / 2, 0, 0] });
  if (lv >= 3) {
    add(g, G.halfCyl(0.25, 0.8), M.glass, 0.62, 0.15, -0.35, { cast: false });
    add(g, G.rbox(0.3, 0.08, 0.7, 0.03), M.soil, 0.62, 0.2, -0.35);
    for (let i = 0; i < 3; i++) add(g, G.sph(0.08, 8, 6), M.leaf, 0.62, 0.28, -0.6 + i * 0.25);
  }
  if (lv >= 5) { add(g, G.cyl(0.16, 0.16, 0.5, 18), M.teal, 0.66, 0.39, 0.1); add(g, G.dome(0.16), M.teal, 0.66, 0.64, 0.1); }
  if (lv >= 7) for (const z of [-0.6, 0.6]) add(g, G.rbox(0.04, 0.3, 0.3, 0.01), M.panel, 0.36, 0.55, z, { rot: [0, 0, -0.5] });
  if (lv >= 10) add(g, G.torus(0.47, 0.025, 6, 24, Math.PI), M.brass, -0.1, 0.25, 0, { rot: [0, Math.PI / 2, 0] });
  return { g, anims };
}

function lab(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M);
  add(g, G.rbox(1.25, 0.62, 1.05, 0.12), M.wall, -0.1, 0.45, 0.15);
  add(g, G.rbox(1.27, 0.07, 1.07, 0.03), M.accent, -0.1, 0.28, 0.15);
  for (const x of [-0.5, -0.2, 0.1, 0.4]) add(g, G.rbox(0.14, 0.2, 0.04, 0.03), M.window, x, 0.52, 0.69, { cast: false });
  add(g, G.dome(0.42), M.wallCool, -0.1, 0.76, 0.1);
  add(g, G.rbox(0.12, 0.3, 0.86, 0.04), M.dark, -0.1, 0.92, 0.1, { rot: [0, 0.6, 0] });
  const ring = add(g, G.torus(0.56, 0.03, 8, 48), trim(lv, M), -0.1, 0.95, 0.1, { rot: [Math.PI / 2.4, 0, 0], dynamic: true });
  anims.push({ obj: ring, type: 'spin', axis: 'y', speed: 0.8, world: true });
  // pulsing orb pedestal
  add(g, G.cyl(0.08, 0.12, 0.42, 14), M.metal, 0.68, 0.35, -0.6);
  const orb = add(g, G.sph(0.12, 18, 12), M.orb, 0.68, 0.68, -0.6, { dynamic: true, cast: false });
  anims.push({ obj: orb, type: 'pulse', speed: 2.2 });
  if (lv >= 3) for (const x of [-0.6, -0.45]) { add(g, G.cyl(0.015, 0.015, 0.5, 6), M.metal, x, 1.0, -0.25); add(g, G.sph(0.03, 8, 6), M.beacon, x, 1.26, -0.25, { cast: false }); }
  if (lv >= 5) { const r2 = add(g, G.torus(0.48, 0.02, 6, 40), M.metal, -0.1, 0.95, 0.1, { rot: [-Math.PI / 2.6, 0, 0], dynamic: true }); anims.push({ obj: r2, type: 'spin', axis: 'y', speed: -0.6, world: true }); }
  if (lv >= 7) { add(g, G.rbox(0.5, 0.42, 0.6, 0.1), M.wallWarm, 0.6, 0.35, 0.45); add(g, G.rbox(0.04, 0.16, 0.3, 0.02), M.window, 0.86, 0.4, 0.45, { cast: false }); }
  if (lv >= 10) add(g, G.cone(0.1, 0.5, 6), M.orb, 0.68, 1.05, -0.6, { cast: false });
  return { g, anims };
}

function solar(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M);
  const rows = lv >= 6 ? 3 : 2;
  const cols = lv >= 3 ? 3 : 2;
  const tracker = new THREE.Group();
  tracker.userData.dynamic = true;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (1.6 / cols);
      const z = (r - (rows - 1) / 2) * (1.55 / rows);
      add(g, G.cyl(0.03, 0.04, 0.32, 8), M.metal, x, 0.3, z);
      const panel = new THREE.Group();
      panel.position.set(x, 0.48, z);
      add(panel, G.rbox(1.45 / cols, 0.04, 1.35 / rows, 0.015), M.metal, 0, -0.01, 0);
      add(panel, G.rbox(1.45 / cols - 0.06, 0.03, 1.35 / rows - 0.06, 0.01), M.panel, 0, 0.012, 0);
      panel.userData.dynamic = true;
      g.add(panel);
      anims.push({ obj: panel, type: 'track' });
    }
  }
  if (lv >= 5) { add(g, G.rbox(0.3, 0.2, 0.2, 0.05), M.wallCool, 0.78, 0.24, 0.8); add(g, G.sph(0.03, 8, 6), M.statusGreen, 0.78, 0.36, 0.91, { cast: false }); }
  if (lv >= 10) add(g, G.rbox(1.9, 0.03, 0.06, 0.01), M.brass, 0, 0.15, 0.93);
  return { g, anims, tracker };
}

function depot(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M);
  const h = 0.95 * (1 + (lv - 1) * 0.06);
  const silos = lv >= 4 ? [[-0.5, -0.45], [0.1, -0.5], [-0.55, 0.15]] : [[-0.5, -0.45], [0.1, -0.5]];
  for (const [x, z] of silos) {
    add(g, G.cyl(0.3, 0.3, h, 24), M.wall, x, 0.14 + h / 2, z);
    add(g, G.dome(0.3, 20), M.wallCool, x, 0.14 + h, z);
    add(g, G.torus(0.305, 0.025, 6, 28), M.accent, x, 0.14 + h * 0.3, z, { rot: [Math.PI / 2, 0, 0] });
    add(g, G.torus(0.305, 0.025, 6, 28), M.accent, x, 0.14 + h * 0.7, z, { rot: [Math.PI / 2, 0, 0] });
  }
  const crates = [[0.45, 0.45, M.ore], [0.45, 0.05, M.fuelTank], [0.1, 0.5, M.foodCrate], [0.45, 0.45, M.foodCrate, 1]];
  for (const [x, z, mat, stack] of crates) add(g, G.rbox(0.34, 0.3, 0.34, 0.05), mat === M.ore ? M.wallCool : mat, x, 0.29 + (stack ? 0.31 : 0), z);
  if (lv >= 3) add(g, G.rbox(0.34, 0.3, 0.34, 0.05), M.fuelTank, 0.1, 0.29, 0.1);
  if (lv >= 7) {
    add(g, G.cyl(0.03, 0.03, 1.3, 8), M.hazard, 0.8, 0.8, -0.8);
    const arm = new THREE.Group();
    arm.position.set(0.8, 1.45, -0.8);
    add(arm, G.rbox(0.9, 0.05, 0.05, 0.02), M.hazard, -0.35, 0, 0);
    add(arm, G.cyl(0.006, 0.006, 0.4, 4), M.dark, -0.7, -0.2, 0, { cast: false });
    arm.userData.dynamic = true;
    g.add(arm);
    anims.push({ obj: arm, type: 'sway', speed: 0.4 });
  }
  if (lv >= 10) for (const [x, z] of silos) add(g, G.cone(0.06, 0.16, 10), M.brass, x, 0.14 + h + 0.36, z);
  return { g, anims };
}

function habitat(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M);
  const tiers = lv >= 6 ? 3 : lv >= 3 ? 2 : 1;
  for (let t = 0; t < tiers; t++) {
    const y = 0.38 + t * 0.44;
    const rot = t % 2 ? 0.35 : -0.15;
    const pod = new THREE.Group();
    pod.position.set(0, y, 0);
    pod.rotation.y = rot;
    add(pod, G.cap(0.24, 0.85, 8, 20), t % 2 ? M.wallWarm : M.wall, 0, 0, 0, { rot: [0, 0, Math.PI / 2] });
    for (let i = 0; i < 4; i++) add(pod, G.circle(0.065, 16), M.window, -0.42 + i * 0.28, 0.02, 0.243, { cast: false });
    add(pod, G.torus(0.245, 0.02, 6, 24), M.accent, 0.42, 0, 0, { rot: [0, Math.PI / 2, 0] });
    add(pod, G.torus(0.245, 0.02, 6, 24), M.accent, -0.42, 0, 0, { rot: [0, Math.PI / 2, 0] });
    g.add(pod);
  }
  add(g, G.rbox(0.3, 0.4, 0.14, 0.05), M.roof, 0.65, 0.34, 0.55);
  add(g, G.rbox(0.2, 0.28, 0.03, 0.03), M.window, 0.65, 0.34, 0.63, { cast: false });
  // planter and bench
  add(g, G.rbox(0.36, 0.12, 0.18, 0.04), M.soil, -0.55, 0.2, 0.7);
  for (const x of [-0.66, -0.44]) add(g, G.sph(0.08, 10, 8), M.leaf, x, 0.32, 0.7);
  lamp(g, M, -0.8, -0.75, 0.5);
  if (lv >= 10) add(g, G.dome(0.22), M.glass, 0, 0.38 + (tiers - 1) * 0.44 + 0.24, 0, { cast: false });
  if (lv >= 5) add(g, G.cyl(0.018, 0.018, 0.5, 6), M.metal, 0.3, 0.38 + (tiers - 1) * 0.44 + 0.42, -0.1);
  return { g, anims };
}

function refinery(M, lv) {
  const g = new THREE.Group();
  const anims = [];
  foundation(g, M);
  const tanks = lv >= 4 ? [[-0.5, -0.4, 0.3], [0.05, -0.55, 0.26], [-0.55, 0.3, 0.24]] : [[-0.5, -0.4, 0.3], [0.05, -0.55, 0.26]];
  for (const [x, z, r] of tanks) {
    const h = 0.7;
    add(g, G.cyl(r, r, h, 22), M.fuelTank, x, 0.14 + h / 2 + 0.06, z);
    add(g, G.dome(r, 20), M.fuelTank, x, 0.2 + h, z);
    add(g, G.dome(r, 20), M.fuelTank, x, 0.2, z, { rot: [Math.PI, 0, 0] });
    add(g, G.torus(r + 0.005, 0.02, 6, 24), M.dark, x, 0.2 + h * 0.5, z, { rot: [Math.PI / 2, 0, 0] });
  }
  add(g, G.rbox(0.62, 0.5, 0.6, 0.08), M.wall, 0.42, 0.39, 0.4);
  add(g, G.rbox(0.2, 0.14, 0.04, 0.03), M.window, 0.42, 0.45, 0.71, { cast: false });
  // pipes
  add(g, G.cyl(0.04, 0.04, 0.9, 8), M.metal, -0.2, 0.5, 0.05, { rot: [0, 0, Math.PI / 2] });
  add(g, G.torus(0.2, 0.04, 6, 16, Math.PI / 2), M.metal, 0.25, 0.3, 0.05, { rot: [0, 0, 0] });
  // chimney with flame
  add(g, G.cyl(0.07, 0.1, 1.25, 12), M.wallCool, 0.65, 0.76, -0.55);
  add(g, G.torus(0.08, 0.02, 6, 16), M.hazard, 0.65, 1.32, -0.55, { rot: [Math.PI / 2, 0, 0] });
  const flame = add(g, G.cone(0.06, 0.2, 10), M.flame, 0.65, 1.47, -0.55, { dynamic: true, cast: false });
  anims.push({ obj: flame, type: 'flame', speed: 9 });
  if (lv >= 7) lamp(g, M, -0.85, 0.8);
  if (lv >= 10) add(g, G.torus(0.27, 0.02, 6, 24), M.brass, -0.5, 0.95, -0.4, { rot: [Math.PI / 2, 0, 0] });
  return { g, anims, smoke: new THREE.Vector3(0.65, 1.55, -0.55) };
}

const BUILDERS = { hq, extractor, farm, lab, solar, depot, habitat, refinery };

export function buildModel(type, level, M) {
  const make = BUILDERS[type];
  const { g, anims, smoke } = make ? make(M, Math.max(1, level)) : hq(M, 1);
  finalize(g);
  g.userData.anims = anims;
  g.userData.smoke = smoke || null;
  return g;
}

// Scaffolding and a little crane, used while constructing or upgrading.
export function buildScaffold(M, height = 1.5) {
  const g = new THREE.Group();
  const s = 0.92;
  for (const [x, z] of [[-s, -s], [s, -s], [-s, s], [s, s]]) add(g, G.cyl(0.025, 0.025, height, 6), M.scaffold, x, height / 2 + 0.12, z);
  for (let y = 0.45; y < height; y += 0.45) {
    add(g, G.rbox(1.88, 0.03, 0.03, 0.01), M.scaffold, 0, y, s);
    add(g, G.rbox(1.88, 0.03, 0.03, 0.01), M.scaffold, 0, y, -s);
    add(g, G.rbox(0.03, 0.03, 1.88, 0.01), M.scaffold, s, y, 0);
    add(g, G.rbox(0.03, 0.03, 1.88, 0.01), M.scaffold, -s, y, 0);
  }
  finalize(g);
  const crane = new THREE.Group();
  crane.position.set(-s, 0, -s);
  add(crane, G.cyl(0.03, 0.03, height + 0.6, 6), M.hazard, 0, (height + 0.6) / 2, 0);
  const jib = new THREE.Group();
  jib.position.y = height + 0.6;
  add(jib, G.rbox(1.4, 0.05, 0.05, 0.02), M.hazard, 0.5, 0, 0);
  add(jib, G.cyl(0.005, 0.005, 0.5, 4), M.dark, 1.0, -0.25, 0, { cast: false });
  add(jib, G.rbox(0.1, 0.08, 0.1, 0.02), M.dark, 1.0, -0.52, 0);
  crane.add(jib);
  g.add(crane);
  g.userData.anims = [{ obj: jib, type: 'spin', axis: 'y', speed: 0.5, swing: true }];
  return g;
}

// Translucent copy for placement previews.
export function ghostOf(model, valid) {
  const mat = new THREE.MeshStandardMaterial({ color: valid ? '#a8f0dc' : '#ff9f8f', transparent: true, opacity: 0.55, emissive: valid ? '#3aa58a' : '#a83a2a', emissiveIntensity: 0.5, depthWrite: false });
  model.traverse((o) => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  return model;
}
