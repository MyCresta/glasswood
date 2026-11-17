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
  halfCyl: (r, len, s = 24) => cached(`hc${r},${len}`, () => {
    const geo = new THREE.CylinderGeometry(r, r, len, s, 1, true, -Math.PI / 2, Math.PI);
    geo.rotateZ(Math.PI / 2);
    return geo;
  }),
};

export function makeMaterials(accentColor = '#7fd6c8') {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.02, ...o });
  const m = {
    foundation: std('#b9b2a6', { roughness: 0.92 }),
    wall: std('#efe6d6'),
    wallWarm: std('#e7cfae'),
    wallCool: std('#c8d3d8'),
    roof: std('#4a5560', { roughness: 0.55, metalness: 0.15 }),
    dark: std('#2f363d', { roughness: 0.5, metalness: 0.3 }),
    metal: std('#a4adb5', { roughness: 0.35, metalness: 0.65 }),
    brass: std('#d1a65a', { roughness: 0.35, metalness: 0.7 }),
    accent: std(accentColor, { roughness: 0.6 }),
    hazard: std('#e58b4a', { roughness: 0.6 }),
    teal: std('#5aa6a0', { roughness: 0.55 }),
    leaf: std('#6fb35a', { roughness: 0.85 }),
    leafDark: std('#4c8f4a', { roughness: 0.85 }),
    soil: std('#7a5a43', { roughness: 1 }),
    ore: std('#8d96a3', { roughness: 0.4, metalness: 0.55, flatShading: true }),
    panel: std('#2c4372', { roughness: 0.22, metalness: 0.55 }),
    fuelTank: std('#e7a646', { roughness: 0.5, metalness: 0.2 }),
    foodCrate: std('#9cc56f', { roughness: 0.7 }),
    glass: new THREE.MeshStandardMaterial({ color: '#bfe8f0', roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.38, depthWrite: false, emissive: '#9fd8e6', emissiveIntensity: 0.05 }),
    window: new THREE.MeshStandardMaterial({ color: '#fff0cf', emissive: '#ffcf87', emissiveIntensity: 0.15, roughness: 0.4 }),
    growLight: new THREE.MeshStandardMaterial({ color: '#ffd9f0', emissive: '#ff9ad6', emissiveIntensity: 0.4, roughness: 0.4 }),
    orb: new THREE.MeshStandardMaterial({ color: '#c6d0ff', emissive: '#98abff', emissiveIntensity: 1.2, roughness: 0.2 }),
    beacon: new THREE.MeshStandardMaterial({ color: '#ffb0a0', emissive: '#ff6a4d', emissiveIntensity: 1.6 }),
    flame: new THREE.MeshStandardMaterial({ color: '#ffd38a', emissive: '#ff9a3c', emissiveIntensity: 2.0, transparent: true, opacity: 0.9, depthWrite: false }),
    statusGreen: new THREE.MeshStandardMaterial({ color: '#b6f5b0', emissive: '#6fe07a', emissiveIntensity: 1.2 }),
    scaffold: std('#d6a24e', { roughness: 0.6, metalness: 0.2 }),
  };
  return m;
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
