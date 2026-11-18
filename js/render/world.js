// Island terrain, village paths and decoration around the battlefield.
import * as THREE from 'three';
import { G, add, finalize, seeded, noise2 } from './kit.js';
import { FIELD_R, WALL_R, BUILDINGS } from '../data/village.js';
import { ROCK_CELLS, cellCenter } from '../sim/map.js';

export const BIOMES = {
  temperate: {
    grass: ['#86b45f', '#9bc56a', '#719f55', '#aecd78'],
    field: ['#8fb862', '#a3c46e'],
    dirt: '#b99d74', soil: '#8a6a4c', rock: ['#7d6f66', '#62574f', '#8d7f74'],
    sky: { day: ['#86bedc', '#f6e2bd', '#cdb9d8'], dusk: ['#3b4a86', '#f3a777', '#5a4677'], night: ['#0b1230', '#272656', '#100e28'] },
    tree: ['#5e9a4f', '#4f8b4a', '#79ad58', '#3f7a45'], trunk: '#7a5a43',
    planet: { a: '#dfe3f2', b: '#b9b4d8', ring: '#e6dccb' },
  },
};

export const ISLAND_R = FIELD_R + 3.4;

export function buildIsland(seed = 7) {
  const B = BIOMES.temperate;
  const n2 = noise2(seed);
  const A = 160;
  const K = 46;
  const J = 9;
  const radiusAt = (a) => ISLAND_R * (0.95 + 0.07 * n2(Math.cos(a) * 2 + 10, Math.sin(a) * 2 + 10) + 0.025 * Math.sin(a * 3 + 1));
  const heightAt = (x, z) => {
    const r = Math.hypot(x, z);
    const rim = THREE.MathUtils.smoothstep(r, FIELD_R - 0.2, FIELD_R + 2.0);
    const hills = (n2(x * 0.22 + 3, z * 0.22 + 7) * 0.9 + 0.25) * rim;
    return rim * 0.35 + hills;
  };
  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  const g = B.grass.map((h) => new THREE.Color(h));
  const fieldC = B.field.map((h) => new THREE.Color(h));
  const dirt = new THREE.Color(B.dirt);
  const push = (x, y, z, color) => { pos.push(x, y, z); col.push(color.r, color.g, color.b); return pos.length / 3 - 1; };
  const centre = push(0, 0, 0, dirt);
  const rings = [];
  for (let k = 1; k <= K; k++) {
    rings.push(pos.length / 3);
    const f = k / K;
    for (let i = 0; i < A; i++) {
      const a = (i / A) * Math.PI * 2;
      const r = radiusAt(a) * f;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      let y = heightAt(x, z);
      if (k === K) y -= 0.06;
      const rr = Math.hypot(x, z);
      const gn = n2(x * 0.35 + 50, z * 0.35 + 50);
      if (rr < WALL_R) {
        c.copy(g[0]).lerp(g[1], gn);
      } else if (rr < FIELD_R) {
        c.copy(fieldC[0]).lerp(fieldC[1], gn);
        c.lerp(g[2], Math.max(0, n2(x * 0.8, z * 0.8) - 0.55) * 1.4);
        if (rr < WALL_R + 1.2) c.lerp(dirt, (1 - (rr - WALL_R) / 1.2) * 0.45);
      } else {
        c.copy(g[2]).lerp(g[3], Math.min(1, y * 0.6));
      }
      push(x, y, z, c.clone());
    }
  }
  for (let i = 0; i < A; i++) idx.push(centre, rings[0] + ((i + 1) % A), rings[0] + i);
  for (let k = 0; k < K - 1; k++) {
    const a0 = rings[k], a1 = rings[k + 1];
    for (let i = 0; i < A; i++) {
      const i1 = (i + 1) % A;
      idx.push(a0 + i, a0 + i1, a1 + i, a0 + i1, a1 + i1, a1 + i);
    }
  }
  const rock = B.rock.map((h) => new THREE.Color(h));
  const soil = new THREE.Color(B.soil);
  const depth = ISLAND_R * 0.8;
  let prev = rings[K - 1];
  for (let j = 1; j <= J; j++) {
    const f = j / J;
    const start = pos.length / 3;
    for (let i = 0; i < A; i++) {
      const a = (i / A) * Math.PI * 2;
      const shrink = Math.pow(1 - f, 0.85) * 0.92 + 0.03;
      const jag = j === 1 ? 1 : 0.85 + 0.3 * n2(i * 0.35 + j * 3.1, j * 1.7);
      const r = radiusAt(a) * shrink * jag;
      const y = -0.06 - depth * Math.pow(f, 1.25) * (0.9 + 0.2 * n2(i * 0.2, j));
      if (j <= 1) c.copy(soil); else c.copy(rock[j % 3]).lerp(rock[(j + 1) % 3], n2(i * 0.3, j * 2));
      c.multiplyScalar(1 - f * 0.35);
      push(Math.cos(a) * r, y, Math.sin(a) * r, c.clone());
    }
    for (let i = 0; i < A; i++) {
      const i1 = (i + 1) % A;
      idx.push(prev + i, prev + i1, start + i, prev + i1, start + i1, start + i);
    }
    prev = start;
  }
  const tip = push(0.6, -0.06 - depth * 1.1, -0.4, rock[1].clone().multiplyScalar(0.6));
  for (let i = 0; i < A; i++) idx.push(prev + i, prev + ((i + 1) % A), tip);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return { mesh, heightAt, radiusAt };
}

// Dirt paths from the plaza to each building and out of the gate.
export function buildPaths() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#c2a57b', roughness: 1 });
  const seg = (ax, az, bx, bz, w) => {
    const len = Math.hypot(bx - ax, bz - az);
    add(g, G.rbox(w, 0.02, len, 0.01), mat, (ax + bx) / 2, 0.012, (az + bz) / 2, { rot: [0, Math.atan2(bx - ax, bz - az), 0], cast: false });
    add(g, G.cyl(w / 2, w / 2, 0.02, 14), mat, bx, 0.012, bz, { cast: false });
  };
  add(g, G.cyl(2.0, 2.0, 0.02, 40), mat, 0, 0.01, 0, { cast: false });
  for (const [id, b] of Object.entries(BUILDINGS)) {
    if (id === 'walls' || id === 'townhall' || id === 'watchtower') continue;
    seg(0, 0, b.pos[0] * 0.8, b.pos[1] * 0.8, 0.42);
  }
  seg(0, 0, 0, WALL_R + 1.6, 0.6);
  finalize(g);
  return g;
}

export function buildDecor(island, quality, seed = 11) {
  const B = BIOMES.temperate;
  const rnd = seeded(seed);
  const g = new THREE.Group();
  const mats = {
    trunk: new THREE.MeshStandardMaterial({ color: B.trunk, roughness: 0.9 }),
    leaves: B.tree.map((h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.85 })),
    rock: new THREE.MeshStandardMaterial({ color: B.rock[2], roughness: 0.9, flatShading: true }),
    rockDark: new THREE.MeshStandardMaterial({ color: B.rock[0], roughness: 0.9, flatShading: true }),
    flowerA: new THREE.MeshStandardMaterial({ color: '#f3d36b', roughness: 0.7 }),
    flowerB: new THREE.MeshStandardMaterial({ color: '#f2a7c2', roughness: 0.7 }),
    tuft: new THREE.MeshStandardMaterial({ color: B.grass[2], roughness: 0.9 }),
  };
  const tree = (x, z, y, s = 1) => {
    const h = (0.5 + rnd() * 0.5) * s;
    add(g, G.cyl(0.05 * s, 0.08 * s, h, 7), mats.trunk, x, y + h / 2, z);
    const lm = mats.leaves[Math.floor(rnd() * mats.leaves.length)];
    if (rnd() < 0.45) {
      const r = (0.32 + rnd() * 0.2) * s;
      add(g, G.sph(1, 14, 10), lm, x, y + h + r * 0.7, z, { scale: [r, r * 1.05, r] });
      add(g, G.sph(1, 12, 8), lm, x + r * 0.5, y + h + r * 0.3, z + 0.08, { scale: r * 0.62 });
    } else {
      const r = (0.3 + rnd() * 0.12) * s;
      for (let t = 0; t < 3; t++) add(g, G.cone(1, 1, 12), lm, x, y + h + 0.15 * s + t * 0.28 * s, z, { scale: [r * (1 - t * 0.25), 0.5 * s, r * (1 - t * 0.25)] });
    }
  };
  const N = quality === 'low' ? 70 : 150;
  for (let i = 0; i < N; i++) {
    const a = rnd() * Math.PI * 2;
    const r = FIELD_R + 0.6 + rnd() * Math.max(0.2, island.radiusAt(a) - FIELD_R - 1.2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    tree(x, z, island.heightAt(x, z) - 0.03, 1 + rnd() * 0.5);
  }
  for (const [i, j] of ROCK_CELLS) {
    const [x, z] = cellCenter(i, j);
    if (rnd() < 0.55) {
      add(g, G.ico(1, 1), rnd() < 0.5 ? mats.rock : mats.rockDark, x, 0.16, z, { scale: [0.42, 0.32 + rnd() * 0.15, 0.38], rot: [rnd(), rnd() * 6, rnd()] });
      if (rnd() < 0.5) add(g, G.ico(1, 0), mats.rock, x + 0.2, 0.08, z - 0.15, { scale: 0.16 });
    } else {
      tree(x, z, 0, 0.85);
      add(g, G.sph(0.2, 8, 6), mats.leaves[1], x + 0.22, 0.12, z + 0.1, { scale: [1, 0.7, 1] });
    }
  }
  const F = quality === 'low' ? 40 : 110;
  for (let i = 0; i < F; i++) {
    const a = rnd() * Math.PI * 2;
    const r = WALL_R + 1.5 + rnd() * (FIELD_R - WALL_R - 2);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (rnd() < 0.5) for (let k = 0; k < 3; k++) add(g, G.cone(0.03, 0.18, 4), mats.tuft, x + (rnd() - 0.5) * 0.2, 0.08, z + (rnd() - 0.5) * 0.2, { cast: false });
    else for (let k = 0; k < 4; k++) add(g, G.sph(0.035, 6, 5), rnd() < 0.5 ? mats.flowerA : mats.flowerB, x + (rnd() - 0.5) * 0.3, 0.04, z + (rnd() - 0.5) * 0.3, { cast: false });
  }
  // small village props: flowers by the paths, crates and lanterns
  for (let i = 0; i < 24; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 2.3 + rnd() * 4.6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    for (let k = 0; k < 3; k++) add(g, G.sph(0.03, 6, 5), rnd() < 0.5 ? mats.flowerA : mats.flowerB, x + (rnd() - 0.5) * 0.2, 0.04, z + (rnd() - 0.5) * 0.2, { cast: false });
  }
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2;
    const r = island.radiusAt(a) * (0.75 + rnd() * 0.2);
    add(g, G.ico(1, 0), mats.rock, Math.cos(a) * r, -0.8 - rnd() * 5, Math.sin(a) * r, { scale: 0.3 + rnd() * 0.5, rot: [rnd() * 3, rnd() * 3, 0], cast: false });
  }
  finalize(g);
  return g;
}
