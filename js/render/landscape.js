// Ground-level landscapes: a heightfield disc that fades into fog, instanced
// forests, distant mountains and water.
import * as THREE from 'three';
import { G, seeded, noise2, mergeColored } from './kit.js';

// Muted, mossy twilight palette.
export const PAL = {
  grass: ['#4d6842', '#5a7449', '#43593b', '#62794f'],
  meadow: ['#55703f', '#61794a'],
  dirt: '#6e5f49',
  dirtLight: '#837054',
  rock: '#6f6a62',
  forestFloor: '#2b3628',
  needles: '#3a3224',
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
  // Irregular, slightly asymmetric shapes; darker toward the ground (fake occlusion).
  const spruce = (tiers, lean, cols) => mergeColored([
    { geo: G.cyl(0.05, 0.09, 0.55, 5, true), color: '#3b2c22', pos: [0, 0.27, 0] },
    ...Array.from({ length: tiers }, (_, i) => {
      const k = i / (tiers - 1);
      return { geo: G.cone(0.5 - k * 0.32, 0.62 - k * 0.12, 7), color: cols[Math.min(cols.length - 1, i)], pos: [lean * k, 0.55 + i * 0.36, lean * 0.5 * k], rot: [0, i * 0.7, (i % 2 ? 0.04 : -0.03)] };
    }),
  ]);
  treeGeos = {
    spruce: spruce(4, 0.03, ['#1f3329', '#25392d', '#2b4232', '#334a37']),
    spruceTall: spruce(6, 0.06, ['#1c2f26', '#21362b', '#263c2f', '#2c4333', '#324a38', '#3a523d']),
    oak: mergeColored([
      { geo: G.cyl(0.07, 0.12, 0.7, 6, true), color: '#3a2c22', pos: [0, 0.35, 0] },
      { geo: G.cyl(0.03, 0.05, 0.4, 5, true), color: '#3a2c22', pos: [0.15, 0.75, 0], rot: [0, 0, -0.7] },
      { geo: G.ico(0.48, 1), color: '#2f4128', pos: [0.05, 1.0, 0], scale: [1.1, 0.85, 1] },
      { geo: G.ico(0.34, 0), color: '#36492d', pos: [0.32, 0.9, 0.12] },
      { geo: G.ico(0.3, 0), color: '#283a24', pos: [-0.28, 0.86, -0.1] },
    ]),
    dead: mergeColored([
      { geo: G.cyl(0.04, 0.08, 1.3, 5, true), color: '#4a4238', pos: [0, 0.65, 0], rot: [0.05, 0, 0.04] },
      { geo: G.cyl(0.015, 0.03, 0.5, 4, true), color: '#4a4238', pos: [0.14, 1.0, 0], rot: [0, 0, -0.9] },
      { geo: G.cyl(0.015, 0.03, 0.42, 4, true), color: '#4a4238', pos: [-0.12, 0.82, 0.04], rot: [0.2, 0, 1.0] },
      { geo: G.cyl(0.012, 0.025, 0.35, 4, true), color: '#4a4238', pos: [0.05, 1.22, -0.08], rot: [-0.7, 0, 0.3] },
    ]),
    bush: mergeColored([
      { geo: G.ico(0.25, 1), color: '#2c3f28', pos: [0, 0.15, 0], scale: [1, 0.7, 1] },
      { geo: G.ico(0.18, 0), color: '#34492e', pos: [0.18, 0.12, 0.05], scale: [1, 0.75, 1] },
    ]),
    fern: mergeColored(Array.from({ length: 6 }, (_, i) => ({ geo: G.cone(0.05, 0.42, 3), color: i % 2 ? '#3d5a35' : '#466640', pos: [Math.cos(i) * 0.1, 0.16, Math.sin(i) * 0.1], rot: [Math.sin(i) * 0.9, i, Math.cos(i) * 0.9] }))),
    rock: mergeColored([
      { geo: G.ico(0.4, 1), color: '#5e5a54', pos: [0, 0.15, 0], scale: [1.15, 0.6, 1] },
      { geo: G.ico(0.36, 1), color: '#3f5236', pos: [0.02, 0.27, 0], scale: [1.0, 0.25, 0.9] },
      { geo: G.ico(0.17, 0), color: '#54504a', pos: [0.36, 0.06, 0.12] },
    ]),
    mushrooms: mergeColored([
      ...[[0, 0], [0.1, 0.06], [-0.08, 0.07]].flatMap(([x, z], i) => [
        { geo: G.cyl(0.015, 0.02, 0.1 + i * 0.03, 5), color: '#d8cfbf', pos: [x, 0.05 + i * 0.015, z] },
        { geo: G.sph(0.05 - i * 0.008, 7, 4, Math.PI * 2, 0, Math.PI / 2), color: i ? '#a8463a' : '#c8a35a', pos: [x, 0.1 + i * 0.03, z] },
      ]),
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
      const v = 0.82 + (s.light || 0) * 0.3;
      tint.setRGB(v * (0.97 + (s.hue || 0) * 0.06), v, v * (1.03 - (s.hue || 0) * 0.06));
      inst.setColorAt(i, tint);
    });
    inst.castShadow = cast && !['bush', 'fern', 'mushrooms'].includes(kind);
    inst.receiveShadow = true;
    group.add(inst);
  }
  return group;
}

// Scatter forest spots in a ring, avoiding a keep-out test.
export function scatterForest({ seed, rMin, rMax, count, height, avoid, clump = 0.55, scale = [0.9, 1.6], kinds = ['spruce', 'spruce', 'spruceTall', 'oak', 'spruce', 'dead'] }) {
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
  const mat = new THREE.MeshStandardMaterial({ color: '#3e4a52', roughness: 1, flatShading: true });
  const snow = new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 1, flatShading: true });
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
  const mat = new THREE.MeshStandardMaterial({ color: '#2b4250', roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.92 });
  const mesh = new THREE.Mesh(shape, mat);
  mesh.receiveShadow = true;
  return mesh;
}

export { seeded, noise2 };

// A square, finely subdivided patch of ground (for paths that need detail).
export function buildPatch({ size, step, height, color }) {
  const n = Math.round(size / step);
  const geo = new THREE.PlaneGeometry(size, size, n, n);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = height(x, z);
    pos.setY(i, y);
    color(x, z, y, c);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97 }));
  mesh.receiveShadow = true;
  return mesh;
}
