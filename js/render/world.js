// The floating terrain slice, decoration and sky for a colony diorama.
import * as THREE from 'three';
import { G, add, finalize, seeded, noise2 } from './kit.js';

export const PLOT = 2.6; // world units per plot
export const PAD_TOP = 0.1;

export const BIOMES = {
  temperate: {
    grass: ['#7fae5c', '#94bd66', '#6a9e55', '#a7c776'],
    dirt: '#b79c76', soil: '#8a6a4c', rock: ['#7d6f66', '#62574f', '#8d7f74'],
    pad: '#b9b49c',
    sky: { day: ['#7fb9d8', '#f4dcb8', '#c8b7d6'], dusk: ['#3f4f8a', '#f2a97a', '#5c4a78'], night: ['#0c1330', '#2b2a58', '#120f2a'] },
    tree: ['#5e9a4f', '#4f8b4a', '#79ad58'], trunk: '#7a5a43',
    planet: { a: '#e9c79a', b: '#c98e6a', ring: '#e8d7bd' },
  },
};

export function plotCenter(gx, gz) {
  return new THREE.Vector3(gx * PLOT, 0, gz * PLOT);
}

export function gridCenter(grid) {
  const lo = -Math.floor(grid / 2);
  const c = (lo + (grid - 1) / 2) * PLOT;
  return new THREE.Vector3(c, 0, c);
}

// Build the island mesh. Returns { mesh, heightAt(x,z), radiusAt(angle), center, R }.
export function buildIsland(biome, grid, seed = 7) {
  const B = BIOMES[biome] || BIOMES.temperate;
  const n2 = noise2(seed);
  const center = gridCenter(grid);
  const half = (grid * PLOT) / 2;
  const R = half * Math.SQRT2 + 3.2;
  const A = 128; // angular segments
  const K = 22; // top rings
  const J = 9; // underside rings
  const radiusAt = (a) => R * (0.93 + 0.12 * n2(Math.cos(a) * 2 + 10, Math.sin(a) * 2 + 10) + 0.04 * Math.sin(a * 3 + 1));
  const inPlotZone = (x, z) => Math.max(Math.abs(x - center.x), Math.abs(z - center.z)) - half;
  const heightAt = (x, z) => {
    const d = inPlotZone(x, z);
    const t = THREE.MathUtils.smoothstep(d, 0.4, 3.2);
    const hills = (n2(x * 0.18 + 3, z * 0.18 + 7) - 0.35) * 1.4 + n2(x * 0.5, z * 0.5) * 0.25;
    return t * Math.max(0, hills) * 1.1 - 0.02;
  };

  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  const grassCols = B.grass.map((h) => new THREE.Color(h));
  const dirt = new THREE.Color(B.dirt);
  const pushV = (x, y, z, color) => { pos.push(x, y, z); col.push(color.r, color.g, color.b); return pos.length / 3 - 1; };

  // top: centre + K rings
  const centreIdx = pushV(center.x, heightAt(center.x, center.z), center.z, dirt);
  const ringStart = [];
  for (let k = 1; k <= K; k++) {
    ringStart.push(pos.length / 3);
    const f = k / K;
    for (let i = 0; i < A; i++) {
      const a = (i / A) * Math.PI * 2;
      const r = radiusAt(a) * f;
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      let y = heightAt(x, z);
      if (k === K) y -= 0.05; // soft rounded lip
      if (k === K - 1) y -= 0.01;
      const gn = n2(x * 0.35 + 50, z * 0.35 + 50);
      c.copy(grassCols[0]).lerp(grassCols[1], gn);
      c.lerp(grassCols[2], Math.max(0, n2(x * 0.9, z * 0.9) - 0.55) * 1.6);
      c.lerp(grassCols[3], Math.max(0, y) * 0.35);
      const pz = inPlotZone(x, z);
      if (pz < 0.6) c.lerp(dirt, THREE.MathUtils.clamp(0.6 - pz, 0, 1) * 0.55);
      pushV(x, y, z, c.clone());
    }
  }
  for (let i = 0; i < A; i++) idx.push(centreIdx, ringStart[0] + ((i + 1) % A), ringStart[0] + i);
  for (let k = 0; k < K - 1; k++) {
    const a0 = ringStart[k], a1 = ringStart[k + 1];
    for (let i = 0; i < A; i++) {
      const i1 = (i + 1) % A;
      idx.push(a0 + i, a0 + i1, a1 + i);
      idx.push(a0 + i1, a1 + i1, a1 + i);
    }
  }
  // underside: strata tapering to a point
  const rockCols = B.rock.map((h) => new THREE.Color(h));
  const soil = new THREE.Color(B.soil);
  const depth = R * 0.95;
  let prev = ringStart[K - 1];
  for (let j = 1; j <= J; j++) {
    const f = j / J;
    const start = pos.length / 3;
    for (let i = 0; i < A; i++) {
      const a = (i / A) * Math.PI * 2;
      const shrink = Math.pow(1 - f, 0.85) * 0.92 + 0.03;
      const jag = 0.85 + 0.3 * n2(i * 0.35 + j * 3.1, j * 1.7);
      const r = radiusAt(a) * shrink * (j === 1 ? 1.0 : jag);
      const x = center.x + Math.cos(a) * r;
      const z = center.z + Math.sin(a) * r;
      const y = -0.05 - depth * Math.pow(f, 1.25) * (0.9 + 0.2 * n2(i * 0.2, j));
      if (j <= 1) c.copy(soil);
      else c.copy(rockCols[j % 3]).lerp(rockCols[(j + 1) % 3], n2(i * 0.3, j * 2.0));
      c.multiplyScalar(1 - f * 0.35);
      pushV(x, y, z, c.clone());
    }
    for (let i = 0; i < A; i++) {
      const i1 = (i + 1) % A;
      idx.push(prev + i, prev + i1, start + i);
      idx.push(prev + i1, start + i1, start + i);
    }
    prev = start;
  }
  const tip = pushV(center.x + 0.4, -0.05 - depth * 1.12, center.z - 0.3, rockCols[1].clone().multiplyScalar(0.6));
  for (let i = 0; i < A; i++) idx.push(prev + i, prev + ((i + 1) % A), tip);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return { mesh, heightAt, radiusAt, center, R, half };
}

export function buildPads(biome, grid) {
  const B = BIOMES[biome] || BIOMES.temperate;
  const lo = -Math.floor(grid / 2);
  const count = grid * grid;
  const geo = G.rbox(2.2, 0.12, 2.2, 0.12);
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 });
  const inst = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  let i = 0;
  const keys = [];
  for (let gz = lo; gz < lo + grid; gz++) for (let gx = lo; gx < lo + grid; gx++) {
    m.makeTranslation(gx * PLOT, PAD_TOP - 0.07, gz * PLOT);
    inst.setMatrixAt(i, m);
    inst.setColorAt(i++, new THREE.Color(B.pad));
    keys.push([gx, gz]);
  }
  inst.receiveShadow = true;
  inst.userData.keys = keys;
  return inst;
}

// Trees, rocks, flowers and tufts outside the plot zone. One merged mesh per material.
export function buildDecor(biome, island, quality, seed = 11) {
  const B = BIOMES[biome] || BIOMES.temperate;
  const rnd = seeded(seed);
  const g = new THREE.Group();
  const mats = {
    trunk: new THREE.MeshStandardMaterial({ color: B.trunk, roughness: 0.9 }),
    leaves: B.tree.map((h) => new THREE.MeshStandardMaterial({ color: h, roughness: 0.85 })),
    rock: new THREE.MeshStandardMaterial({ color: B.rock[2], roughness: 0.9, flatShading: true }),
    flowerA: new THREE.MeshStandardMaterial({ color: '#f3d36b', roughness: 0.7 }),
    flowerB: new THREE.MeshStandardMaterial({ color: '#f2a7c2', roughness: 0.7 }),
    tuft: new THREE.MeshStandardMaterial({ color: B.grass[2], roughness: 0.9 }),
  };
  const { center, half, R, radiusAt, heightAt } = island;
  const N = quality === 'low' ? 40 : 90;
  const spots = [];
  let tries = 0;
  while (spots.length < N && tries++ < 3000) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * radiusAt(a) * 0.9;
    const x = center.x + Math.cos(a) * r;
    const z = center.z + Math.sin(a) * r;
    if (Math.max(Math.abs(x - center.x), Math.abs(z - center.z)) < half + 0.5) continue;
    if (spots.some((s) => (s.x - x) ** 2 + (s.z - z) ** 2 < 0.5)) continue;
    spots.push({ x, z, y: heightAt(x, z), edge: r / (radiusAt(a) * 0.9) });
  }
  for (const s of spots) {
    const roll = rnd();
    if (roll < 0.42) {
      // rounded tree: trunk + 2–3 blobs, or a soft cone pine
      const h = 0.5 + rnd() * 0.5;
      add(g, G.cyl(0.05, 0.08, h, 7), mats.trunk, s.x, s.y + h / 2, s.z);
      const lm = mats.leaves[Math.floor(rnd() * mats.leaves.length)];
      if (rnd() < 0.5) {
        const r = 0.32 + rnd() * 0.2;
        add(g, G.sph(1, 14, 10), lm, s.x, s.y + h + r * 0.7, s.z, { scale: [r, r * 1.05, r] });
        add(g, G.sph(1, 12, 8), lm, s.x + r * 0.5, s.y + h + r * 0.3, s.z + 0.08, { scale: r * 0.62 });
        if (rnd() < 0.6) add(g, G.sph(1, 12, 8), lm, s.x - r * 0.45, s.y + h + r * 0.45, s.z - 0.1, { scale: r * 0.55 });
      } else {
        const r = 0.28 + rnd() * 0.12;
        for (let t = 0; t < 3; t++) add(g, G.cone(1, 1, 14), lm, s.x, s.y + h + 0.15 + t * 0.28, s.z, { scale: [r * (1 - t * 0.25), 0.5, r * (1 - t * 0.25)] });
      }
    } else if (roll < 0.62) {
      const r = 0.12 + rnd() * 0.25;
      add(g, G.ico(1, 1), mats.rock, s.x, s.y + r * 0.35, s.z, { scale: [r * 1.3, r * 0.8, r], rot: [rnd(), rnd() * 6, rnd()] });
    } else if (roll < 0.82) {
      for (let k = 0; k < 4; k++) add(g, G.cone(0.035, 0.22, 4), mats.tuft, s.x + (rnd() - 0.5) * 0.25, s.y + 0.1, s.z + (rnd() - 0.5) * 0.25, { rot: [(rnd() - 0.5) * 0.5, 0, (rnd() - 0.5) * 0.5], cast: false });
    } else {
      const fm = rnd() < 0.5 ? mats.flowerA : mats.flowerB;
      for (let k = 0; k < 5; k++) add(g, G.sph(0.045, 6, 5), fm, s.x + (rnd() - 0.5) * 0.4, s.y + 0.06, s.z + (rnd() - 0.5) * 0.4, { cast: false });
    }
  }
  // a few rocks clinging to the cliff
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2;
    const r = radiusAt(a) * (0.75 + rnd() * 0.2);
    const y = -0.6 - rnd() * R * 0.4;
    add(g, G.ico(1, 0), mats.rock, center.x + Math.cos(a) * r, y, center.z + Math.sin(a) * r, { scale: 0.2 + rnd() * 0.35, rot: [rnd() * 3, rnd() * 3, 0], cast: false });
  }
  finalize(g);
  return g;
}

// Sky dome with a vertical gradient, stars, a ringed gas giant and soft clouds.
export function buildSky(biome) {
  const B = BIOMES[biome] || BIOMES.temperate;
  const group = new THREE.Group();
  const uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.85, h), 0.7)) : mix(horizon, bottom, pow(smoothstep(0.0, -0.7, h), 0.6));
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), skyMat);
  sky.renderOrder = -10;
  group.add(sky);

  const rnd = seeded(3);
  const starPos = [];
  for (let i = 0; i < 900; i++) {
    const u = rnd() * 2 - 1;
    const th = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    starPos.push(Math.cos(th) * s * 380, u * 380, Math.sin(th) * s * 380);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#fff7e8', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false });
  const stars = new THREE.Points(sg, starMat);
  group.add(stars);

  // gas giant
  const planet = new THREE.Group();
  const pMat = new THREE.ShaderMaterial({
    uniforms: { a: { value: new THREE.Color(B.planet.a) }, b: { value: new THREE.Color(B.planet.b) }, light: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 a; uniform vec3 b; uniform float light; varying vec3 vN; varying vec3 vP;
      void main(){ float band = sin(vP.y*0.55 + sin(vP.x*0.08)*1.5)*0.5+0.5; vec3 c = mix(a,b,band);
      float d = clamp(dot(vN, normalize(vec3(-0.6,0.3,0.7)))*0.9+0.25, 0.08, 1.0);
      float rim = pow(1.0 - abs(vN.z), 3.0);
      gl_FragColor = vec4(c*d*light + rim*0.15, 1.0); }`,
  });
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(38, 48, 32), pMat));
  const ring = new THREE.Mesh(new THREE.RingGeometry(48, 70, 96), new THREE.MeshBasicMaterial({ color: B.planet.ring, side: THREE.DoubleSide, transparent: true, opacity: 0.32, depthWrite: false }));
  ring.rotation.x = Math.PI / 2.25;
  planet.add(ring);
  planet.position.set(-160, 70, -260);
  planet.rotation.z = 0.35;
  group.add(planet);

  // clouds: soft clusters drifting below and around the island
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.4, depthWrite: false });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) add(c, G.sph(1, 14, 10), cloudMat, (k - 2) * 1.1 + rnd() * 0.5, rnd() * 0.5, rnd() * 0.8, { scale: [1.3 + rnd(), 0.8 + rnd() * 0.5, 1.1 + rnd() * 0.5], cast: false });
    finalize(c);
    const a = rnd() * Math.PI * 2;
    const r = 48 + rnd() * 40;
    c.position.set(Math.cos(a) * r, -14 - rnd() * 18, Math.sin(a) * r);
    c.scale.setScalar(2 + rnd() * 2);
    c.userData = { a, r, speed: 0.004 + rnd() * 0.006 };
    clouds.push(c);
    group.add(c);
  }

  return {
    group, uniforms, stars, starMat, planet, pMat, clouds, cloudMat,
    palette: {
      day: B.sky.day.map((h) => new THREE.Color(h)),
      dusk: B.sky.dusk.map((h) => new THREE.Color(h)),
      night: B.sky.night.map((h) => new THREE.Color(h)),
    },
  };
}
