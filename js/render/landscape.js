// Ground-level landscapes: a heightfield disc that fades into fog, instanced
// forests, distant mountains and water.
import * as THREE from 'three';
import { G, seeded, noise2, mergeColored } from './kit.js';

export const PAL = {
  grass: ['#86b45f', '#9bc56a', '#719f55', '#aecd78'],
  meadow: ['#8fb862', '#a3c46e'],
  dirt: '#b99d74',
  rock: '#8d7f74',
  forestFloor: '#5f8f4c',
};

// Heightfield ground. `height(x, z)` and `color(x, z, y, c)` customise it.
export function buildGround({ radius, rings = 60, segs = 180, height, color }) {
  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  const push = (x, z) => {
    const y = height(x, z);
    pos.push(x, y, z);
    color(x, z, y, c);
    col.push(c.r, c.g, c.b);
  };
  push(0, 0);
  // rings spaced more finely near the centre
  for (let k = 1; k <= rings; k++) {
    const r = radius * (k / rings) ** 1.6;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      push(Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i);
  for (let k = 0; k < rings - 1; k++) {
    const a0 = 1 + k * segs, a1 = 1 + (k + 1) * segs;
    for (let i = 0; i < segs; i++) {
      const i1 = (i + 1) % segs;
      idx.push(a0 + i, a0 + i1, a1 + i, a0 + i1, a1 + i1, a1 + i);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
  mesh.receiveShadow = true;
  return mesh;
}

let treeGeos = null;
function treeGeometries() {
  if (treeGeos) return treeGeos;
  treeGeos = {
    pine: mergeColored([
      { geo: G.cyl(0.06, 0.09, 0.5, 5, true), color: '#7a5a43', pos: [0, 0.25, 0] },
      { geo: G.cone(0.42, 0.62, 7), color: '#4f8b4a', pos: [0, 0.68, 0] },
      { geo: G.cone(0.34, 0.55, 7), color: '#5a9651', pos: [0, 0.98, 0] },
      { geo: G.cone(0.24, 0.48, 7), color: '#66a258', pos: [0, 1.26, 0] },
    ]),
    round: mergeColored([
      { geo: G.cyl(0.06, 0.09, 0.6, 5, true), color: '#7a5a43', pos: [0, 0.3, 0] },
      { geo: G.ico(0.42, 1), color: '#6fae55', pos: [0, 0.9, 0] },
      { geo: G.ico(0.3, 0), color: '#79b85c', pos: [0.22, 0.74, 0.08] },
      { geo: G.ico(0.27, 0), color: '#5f9e4e', pos: [-0.2, 0.8, -0.1] },
    ]),
    bush: mergeColored([
      { geo: G.ico(0.25, 1), color: '#5f9e4e', pos: [0, 0.15, 0], scale: [1, 0.75, 1] },
      { geo: G.ico(0.18, 0), color: '#6fae55', pos: [0.18, 0.12, 0.05], scale: [1, 0.75, 1] },
    ]),
    rock: mergeColored([
      { geo: G.ico(0.4, 1), color: '#8d7f74', pos: [0, 0.18, 0], scale: [1.1, 0.7, 1] },
      { geo: G.ico(0.18, 0), color: '#7d6f66', pos: [0.32, 0.08, 0.1] },
    ]),
  };
  return treeGeos;
}

// Instanced forest: `spots` is a list of { x, z, y, s, kind }.
export function buildForest(spots, { cast = true, castWithin = Infinity } = {}) {
  if (cast && castWithin < Infinity) {
    const g = new THREE.Group();
    g.add(buildForest(spots.filter((p) => Math.hypot(p.x, p.z) < castWithin), { cast: true }));
    g.add(buildForest(spots.filter((p) => Math.hypot(p.x, p.z) >= castWithin), { cast: false }));
    return g;
  }
  const geos = treeGeometries();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const group = new THREE.Group();
  const byKind = {};
  for (const s of spots) (byKind[s.kind] ||= []).push(s);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const tint = new THREE.Color();
  for (const [kind, list] of Object.entries(byKind)) {
    const inst = new THREE.InstancedMesh(geos[kind], mat, list.length);
    list.forEach((s, i) => {
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot || 0);
      m.compose(new THREE.Vector3(s.x, s.y, s.z), q, new THREE.Vector3(s.s, s.s * (s.sy || 1), s.s));
      inst.setMatrixAt(i, m);
      tint.setHSL(0.28 + (s.hue || 0) * 0.04, 0.25, 0.55 + (s.light || 0) * 0.25);
      inst.setColorAt(i, tint.lerp(new THREE.Color('#ffffff'), 0.55));
    });
    inst.castShadow = cast && kind !== 'bush';
    inst.receiveShadow = true;
    group.add(inst);
  }
  return group;
}

// Scatter forest spots in a ring, avoiding a keep-out test.
export function scatterForest({ seed, rMin, rMax, count, height, avoid, clump = 0.55, scale = [0.9, 1.6], kinds = ['pine', 'round'] }) {
  const rnd = seeded(seed);
  const n2 = noise2(seed + 5);
  const spots = [];
  let tries = 0;
  while (spots.length < count && tries++ < count * 12) {
    const a = rnd() * Math.PI * 2;
    const r = rMin + Math.sqrt(rnd()) * (rMax - rMin);
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (n2(x * 0.08, z * 0.08) < clump * (1 - (r - rMin) / (rMax - rMin + 1e-6)) * 0.9) continue;
    if (avoid?.(x, z)) continue;
    const s = scale[0] + rnd() * (scale[1] - scale[0]);
    spots.push({ x, z, y: height(x, z) - 0.03, s, kind: kinds[Math.floor(rnd() * kinds.length)], rot: rnd() * 6.28, hue: rnd(), light: rnd(), sy: 0.9 + rnd() * 0.3 });
  }
  return spots;
}

// Distant blue-green mountains that sit in the fog at the horizon.
export function buildMountains({ seed, radius, count, height }) {
  const rnd = seeded(seed);
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#6f8a86', roughness: 1, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: '#eef1f4', roughness: 1, flatShading: true });
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + rnd() * 0.2;
    const r = radius * (0.9 + rnd() * 0.25);
    const h = height * (0.5 + rnd() * 0.8);
    const w = h * (1.1 + rnd() * 0.6);
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, h, 6 + Math.floor(rnd() * 3)), mat);
    m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
    m.rotation.y = rnd() * 3;
    g.add(m);
    if (h > height * 0.9) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(w * 0.32, h * 0.3, m.geometry.parameters.radialSegments), snow);
      cap.position.set(m.position.x, h - 2 - h * 0.15, m.position.z);
      cap.rotation.y = m.rotation.y;
      g.add(cap);
    }
  }
  return g;
}

export function buildWater(shape) {
  const mat = new THREE.MeshStandardMaterial({ color: '#6aa6c6', roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 });
  const mesh = new THREE.Mesh(shape, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export { seeded, noise2 };
