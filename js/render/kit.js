// Modelling helpers: cached geometries, shared materials, and a finaliser that
// merges static parts per material so each building costs few draw calls.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export const G = {
  rbox: (w, h, d, r = 0.06) => cached(`rb${w},${h},${d},${r}`, () => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.999)),
  cyl: (rt, rb, h, s = 24, open = false) => cached(`cy${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open)),
  sph: (r, ws = 24, hs = 16, phiLen = Math.PI * 2, thStart = 0, thLen = Math.PI) => cached(`sp${r},${ws},${hs},${phiLen},${thStart},${thLen}`, () => new THREE.SphereGeometry(r, ws, hs, 0, phiLen, thStart, thLen)),
  dome: (r, s = 28) => cached(`dm${r},${s}`, () => new THREE.SphereGeometry(r, s, Math.round(s / 2), 0, Math.PI * 2, 0, Math.PI / 2)),
  torus: (r, t, rs = 10, ts = 36, arc = Math.PI * 2) => cached(`to${r},${t},${rs},${ts},${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc)),
  cap: (r, l, cs = 6, rs = 18) => cached(`ca${r},${l}`, () => new THREE.CapsuleGeometry(r, l, cs, rs)),
  cone: (r, h, s = 20) => cached(`co${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s)),
  ico: (r, d = 0) => cached(`ic${r},${d}`, () => new THREE.IcosahedronGeometry(r, d)),
  circle: (r, s = 20) => cached(`ci${r},${s}`, () => new THREE.CircleGeometry(r, s)),
  // Gable roof: triangular prism, base on y = 0, ridge along z.
  prism: (w, h, len) => cached(`pr${w},${h},${len}`, () => {
    const sh = new THREE.Shape();
    sh.moveTo(-w / 2, 0); sh.lineTo(w / 2, 0); sh.lineTo(0, h); sh.lineTo(-w / 2, 0);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    geo.computeVertexNormals();
    return geo;
  }),
  pyramid: (r, h, sides = 4) => cached(`py${r},${h},${sides}`, () => {
    const geo = new THREE.ConeGeometry(r, h, sides);
    geo.rotateY(Math.PI / sides);
    return geo;
  }),
  halfCyl: (r, len, s = 24) => cached(`hc${r},${len}`, () => {
    const geo = new THREE.CylinderGeometry(r, r, len, s, 1, true, -Math.PI / 2, Math.PI);
    geo.rotateZ(Math.PI / 2);
    return geo;
  }),
};

export function makeMaterials(accentColor = '#a8453b') {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.86, metalness: 0, ...o });
  return {
    plaster: std('#cdbfa4'),
    plasterWarm: std('#b8a07c'),
    timber: std('#33241b', { roughness: 0.9 }),
    wood: std('#5a3f2c', { roughness: 0.9 }),
    woodLight: std('#7b5d42', { roughness: 0.9 }),
    stone: std('#77736b', { roughness: 0.96 }),
    stoneDark: std('#55524c', { roughness: 0.96 }),
    stoneMoss: std('#56634a', { roughness: 0.96 }),
    roofRed: std('#6e3328', { roughness: 0.75 }),
    roofSlate: std('#38414e', { roughness: 0.7 }),
    roofThatch: std('#8a6f42', { roughness: 0.95 }),
    iron: std('#3f4247', { roughness: 0.45, metalness: 0.55 }),
    gold: std('#b8903e', { roughness: 0.35, metalness: 0.7 }),
    accent: std(accentColor, { roughness: 0.75 }),
    cloth: std('#c9bfa9', { roughness: 0.9 }),
    leaf: std('#4f6a3d', { roughness: 0.85 }),
    leafDark: std('#33472c', { roughness: 0.85 }),
    crop: std('#a89048', { roughness: 0.9 }),
    soil: std('#4a3a2c', { roughness: 1 }),
    hay: std('#a8904e', { roughness: 1 }),
    water: std('#2f4a58', { roughness: 0.15, metalness: 0.3 }),
    white: std('#d6d0c4', { roughness: 0.9 }),
    dark: std('#1e1a17', { roughness: 0.8 }),
    window: new THREE.MeshStandardMaterial({ color: '#ffdca0', emissive: '#ffad4a', emissiveIntensity: 0.5, roughness: 0.5 }),
    torch: new THREE.MeshStandardMaterial({ color: '#ffcf80', emissive: '#ff8f30', emissiveIntensity: 0.8, roughness: 0.5 }),
    portal: new THREE.MeshBasicMaterial({ color: '#2a1840', transparent: true, opacity: 0.92 }),
    rune: new THREE.MeshStandardMaterial({ color: '#b8a6ff', emissive: '#8a6bff', emissiveIntensity: 0.8 }),
  };
}

// Add a mesh to a parent. Options: rot [x,y,z], scale [x,y,z] or number, dynamic.
export function add(parent, geo, mat, x = 0, y = 0, z = 0, o = {}) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  if (o.rot) mesh.rotation.set(o.rot[0] || 0, o.rot[1] || 0, o.rot[2] || 0);
  if (o.scale !== undefined) {
    if (typeof o.scale === 'number') mesh.scale.setScalar(o.scale);
    else mesh.scale.set(...o.scale);
  }
  mesh.castShadow = o.cast !== false;
  mesh.receiveShadow = true;
  if (o.dynamic) mesh.userData.dynamic = true;
  parent.add(mesh);
  return mesh;
}

// Merge every non-dynamic mesh inside `group` (including nested groups that
// are not dynamic) into one mesh per material.
export function finalize(group) {
  group.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(group.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  group.traverse((o) => {
    if (!o.isMesh || o === group) return;
    let p = o;
    while (p && p !== group) { if (p.userData.dynamic) return; p = p.parent; }
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [], cast: false });
    const b = buckets.get(key);
    b.geos.push(geo);
    b.cast ||= o.castShadow;
    remove.push(o);
  });
  for (const o of remove) o.parent.remove(o);
  for (const { mat, geos, cast } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = cast && !mat.transparent;
    mesh.receiveShadow = true;
    mesh.userData.merged = true;
    group.add(mesh);
  }
  return group;
}

export function disposeGroup(group) {
  group.traverse((o) => { if (o.isMesh && o.userData.merged) o.geometry.dispose(); });
}

// Seeded tiny random for deterministic decoration.
export function seeded(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 2D value noise.
export function noise2(seed) {
  const r = seeded(seed);
  const P = 256;
  const vals = Array.from({ length: P * P }, r);
  const lerp = (a, b, t) => a + (b - a) * t;
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = sm(x - xi), yf = sm(y - yi);
    const v = (i, j) => vals[(((i % P) + P) % P) + (((j % P) + P) % P) * P];
    return lerp(lerp(v(xi, yi), v(xi + 1, yi), xf), lerp(v(xi, yi + 1), v(xi + 1, yi + 1), xf), yf);
  };
}

// Merge coloured parts into one geometry with a vertex colour attribute
// (used for instanced enemies and arrows: one draw call per kind).
export function mergeColored(parts) {
  const geos = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  for (const p of parts) {
    const g = (p.geo.index ? p.geo.toNonIndexed() : p.geo.clone());
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    e.set(...(p.rot || [0, 0, 0]));
    q.setFromEuler(e);
    const sc = typeof p.scale === 'number' ? new THREE.Vector3(p.scale, p.scale, p.scale) : new THREE.Vector3(...(p.scale || [1, 1, 1]));
    m.compose(new THREE.Vector3(...(p.pos || [0, 0, 0])), q, sc);
    g.applyMatrix4(m);
    const c = new THREE.Color(p.color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geos.push(g);
  }
  const out = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return out;
}
