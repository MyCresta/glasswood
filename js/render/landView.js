// The land around the village, shared by the Village and Defence views.
// Both are cameras on this one scene, so the village, its tower and the
// forest keep exactly the same proportions whichever view is active.
import * as THREE from 'three';
import { G, add, finalize, disposeGroup, seeded } from './kit.js';
import {
  buildBuilding, buildWalls, buildPortal, goblinGeometry, wolfGeometry, arrowGeometry, buildingFootprint,
} from './models.js';
import { buildGround, buildPatch, buildForest, scatterForest, buildMountains, buildWater, PAL, noise2 } from './landscape.js';
import { DayNight } from './lighting.js';
import { CameraRig } from './rig.js';
import {
  BUILDINGS, SPAWNS, PATHS, LAKE, CLEAR_R, WALL_R, VIEW_WALL_R, FIELD_R, MINI, archeryStats,
} from '../data/village.js';
import { spawnPos, defaultField, routeFrom, openness, FOREST_CELLS, cellCenter } from '../sim/map.js';
import { activeSpawns } from '../sim/battle.js';

const MAX_ENEMIES = 400;
const MAX_SHOTS = 200;
const MAX_PARTICLES = 600;
const MAX_DOTS = 900;
const ENEMY_SCALE = 0.62;
const ENEMY_H = { goblin: 0.62 * ENEMY_SCALE, wolf: 0.55 * ENEMY_SCALE };
const SKIN = ['#e8c7a8', '#d1a47e', '#b07c55', '#8a5a39', '#664129'];
const SHIRT = ['#4a5d7a', '#7a4a42', '#4f6a48', '#8a7448', '#5e4f7a', '#3f6464'];
const FOG = { village: [14, 60], defense: [40, 150] };

export class LandView {
  constructor(canvas, M, dot) {
    this.M = M;
    this.dot = dot;
    this.scene = new THREE.Scene();
    this.light = new DayNight(this.scene, { shadowR: 24, fog: FOG.defense });
    this.rigs = {
      village: new CameraRig(canvas, { fov: 36, min: 3, max: 26, limit: 4.5, maxPolar: 1.32, home: { target: new THREE.Vector3(0, 0.35, 0.4), dist: 13.5, polar: 1.0, az: 0.32 } }),
      defense: new CameraRig(canvas, { fov: 36, min: 10, max: 95, limit: 20, maxPolar: 1.25, home: { target: new THREE.Vector3(0, 0, 1.5), dist: 46, polar: 0.9, az: 0.18 } }),
    };
    this.hitboxes = [];
    this.buildings = new Map();
    this.portals = new Map();
    this.people = [];
    this.selected = null;
    this.hovered = null;
    this.t = 0;
    this.seenFx = 0;
    this.hitTimes = new Map();
    this.routes = [];
    this.buildLand();
    this.buildVillage();
    this.buildOverlays();
    this.buildActors();
    this.buildAtmosphere();
    // the two views exposed to the stage
    const mk = (mode) => ({
      name: mode, scene: this.scene, rig: this.rigs[mode], light: this.light, hitboxes: this.hitboxes,
      get hovered() { return this._h; }, set hovered(v) { this._h = v; }, // eslint-disable-line
      frame: (dt, s, ctx) => this.frame(dt, s, ctx, mode),
      sync: (s) => this.sync(s), select: (id) => this.select(id), focus: (id) => this.focus(id, mode), setAccent: (c) => this.rangeMat.color.set(c),
    });
    this.views = { village: mk('village'), defense: mk('defense') };
  }

  // ---------- land ----------

  buildLand() {
    const n2 = noise2(31);
    const height = (x, z) => {
      const r = Math.hypot(x, z);
      const rise = THREE.MathUtils.smoothstep(r, FIELD_R + 2, FIELD_R + 45);
      let y = rise * (n2(x * 0.035 + 7, z * 0.035) * 9 + 1.5) + rise * rise * 6;
      const open = openness(x, z);
      if (r < FIELD_R + 2) y += Math.max(0, Math.min(1, open)) * 0.12 * n2(x * 0.6, z * 0.6); // forest floor is lumpy
      const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
      if (dl < LAKE.r + 1.5) y = Math.min(y, -0.35 + THREE.MathUtils.smoothstep(dl, LAKE.r - 1, LAKE.r + 1.5) * 0.35);
      return y;
    };
    this.height = height;
    const meadow = PAL.meadow.map((c) => new THREE.Color(c));
    const grass = PAL.grass.map((c) => new THREE.Color(c));
    const floor = new THREE.Color(PAL.forestFloor);
    const needles = new THREE.Color(PAL.needles);
    const dirt = new THREE.Color(PAL.dirt);
    const dirtLight = new THREE.Color(PAL.dirtLight);
    const rock = new THREE.Color('#5d5a54');
    const shore = new THREE.Color('#4f4a3c');
    const colorAt = (x, z, y, c) => {
      const open = openness(x, z);
      const r = Math.hypot(x, z);
      const n = n2(x * 0.4 + 50, z * 0.4);
      // forest floor with needle litter
      c.copy(floor).lerp(needles, n2(x * 0.9, z * 0.9) * 0.7);
      // grass along path edges and in the clearing
      const grassy = THREE.MathUtils.smoothstep(-open, -1.1, 0.2);
      c.lerp(r < CLEAR_R + 1 ? meadow[0].clone().lerp(meadow[1], n) : grass[2].clone().lerp(grass[0], n), grassy);
      // trodden dirt along the paths (not across the clearing)
      let pathD = Infinity;
      let pathW = 1;
      for (const p of PATHS) {
        let d = Infinity;
        for (let i = 0; i < p.pts.length - 1; i++) {
          const [ax, az] = p.pts[i];
          const [bx, bz] = p.pts[i + 1];
          const dx = bx - ax, dz = bz - az;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
          d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t));
        }
        if (d < pathD) { pathD = d; pathW = p.w; }
      }
      const rim = (pathW / 2) * (0.75 + n * 0.3);
      const onPath = 1 - THREE.MathUtils.smoothstep(pathD, rim * 0.55, rim);
      c.lerp(dirt.clone().lerp(dirtLight, Math.max(0, 1 - pathD / (rim * 0.4)) * 0.6), onPath * 0.9);
      // a worn ring outside the walls and a path to the gate
      if (r > WALL_R && r < WALL_R + 1.4) c.lerp(dirt, (1 - (r - WALL_R) / 1.4) * 0.5);
      if (y > 7) c.lerp(rock, Math.min(1, (y - 7) / 6));
      const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
      if (dl < LAKE.r + 0.9) c.lerp(shore, 0.7);
    };
    // fine patch where the paths are, coarse ground beyond
    this.scene.add(buildPatch({ size: 48, step: 0.3, height, color: colorAt }));
    const outer = buildGround({
      radius: 260, rings: 80, segs: 220,
      height: (x, z) => (Math.max(Math.abs(x), Math.abs(z)) < 23.8 ? height(x, z) - 0.08 : height(x, z)),
      color: (x, z, y, c) => {
        c.copy(floor).lerp(needles, n2(x * 0.3, z * 0.3) * 0.6);
        if (y > 7) c.lerp(rock, Math.min(1, (y - 7) / 6));
      },
    });
    this.scene.add(outer);
    const water = buildWater(new THREE.CircleGeometry(LAKE.r + 0.5, 40));
    water.rotation.x = -Math.PI / 2;
    water.position.set(LAKE.x, -0.12, LAKE.z);
    this.scene.add(water);

    // the forest: every forest cell gets trees, and it carries on beyond the map
    const rnd = seeded(91);
    const near = [];
    const kinds = ['spruce', 'spruce', 'spruceTall', 'spruce', 'oak', 'spruceTall', 'dead'];
    for (const [i, j] of FOREST_CELLS) {
      const [cx, cz] = cellCenter(i, j);
      for (let k = 0; k < 2; k++) {
        if (k && rnd() < 0.45) continue;
        const x = cx + (rnd() - 0.5) * 0.8;
        const z = cz + (rnd() - 0.5) * 0.8;
        const open = openness(x, z);
        if (open < 0.45 || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 0.8) continue;
        const edge = open < 1.3;
        const kind = edge && rnd() < 0.35 ? (rnd() < 0.6 ? 'fern' : 'bush') : kinds[Math.floor(rnd() * kinds.length)];
        near.push({ x, z, y: height(x, z) - 0.02, s: (kind === 'fern' || kind === 'bush' ? 0.7 : 0.75) + rnd() * 0.55, kind, rot: rnd() * 6.28, light: rnd(), hue: rnd(), sy: 0.85 + rnd() * 0.45 });
      }
      if (rnd() < 0.08) near.push({ x: cx + (rnd() - 0.5) * 0.6, z: cz + (rnd() - 0.5) * 0.6, y: 0, s: 0.5 + rnd() * 0.5, kind: rnd() < 0.5 ? 'rock' : 'mushrooms', rot: rnd() * 6, light: rnd() });
    }
    // path-side details
    for (const p of PATHS) {
      for (let i = 0; i < p.pts.length - 1; i++) {
        const [ax, az] = p.pts[i];
        const [bx, bz] = p.pts[i + 1];
        const len = Math.hypot(bx - ax, bz - az);
        for (let d = 0.5; d < len; d += 1.3) {
          const k = d / len;
          const nx = -(bz - az) / len, nz = (bx - ax) / len;
          const side = rnd() < 0.5 ? -1 : 1;
          const off = p.w / 2 + 0.2 + rnd() * 0.25;
          const x = ax + (bx - ax) * k + nx * off * side;
          const z = az + (bz - az) * k + nz * off * side;
          if (openness(x, z) < -0.05) continue;
          near.push({ x, z, y: height(x, z), s: 0.4 + rnd() * 0.5, kind: ['fern', 'fern', 'rock', 'mushrooms', 'bush'][Math.floor(rnd() * 5)], rot: rnd() * 6, light: rnd() });
        }
      }
    }
    this.scene.add(buildForest(near, { castWithin: 17 }));
    const far = scatterForest({ seed: 19, rMin: FIELD_R + 1, rMax: 150, count: 4200, height, clump: 0.1, scale: [1.0, 2.2],
      avoid: (x, z) => Math.max(Math.abs(x), Math.abs(z)) < 23 && (Math.hypot(x, z) < FIELD_R + 1.5 || openness(x, z) < 0.5),
      kinds: ['spruce', 'spruceTall', 'spruceTall', 'spruce', 'oak', 'dead'] });
    this.scene.add(buildForest(far, { cast: false }));
    this.scene.add(buildMountains({ seed: 12, radius: 185, count: 34, height: 52 }));
  }

  // ---------- village (true scale) ----------

  buildVillage() {
    this.village = new THREE.Group();
    this.village.scale.setScalar(MINI);
    this.scene.add(this.village);
    const R = VIEW_WALL_R;
    // plaza, paths between buildings, flowers (in village units)
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#76664e', roughness: 1 });
    const seg = (ax, az, bx, bz, w) => {
      const len = Math.hypot(bx - ax, bz - az);
      add(g, G.rbox(w, 0.02, len, 0.01), mat, (ax + bx) / 2, 0.02, (az + bz) / 2, { rot: [0, Math.atan2(bx - ax, bz - az), 0], cast: false });
      add(g, G.cyl(w / 2, w / 2, 0.02, 12), mat, bx, 0.02, bz, { cast: false });
    };
    add(g, G.cyl(2.3, 2.3, 0.02, 40), mat, 0, 0.015, 0, { cast: false });
    for (const [id, b] of Object.entries(BUILDINGS)) {
      if (['walls', 'archery', 'watchtower'].includes(id)) continue;
      seg(0, 0, b.pos[0] * 0.78, b.pos[1] * 0.78, 0.45);
    }
    seg(0, 0, 0, R + 1, 0.7);
    const rnd = seeded(13);
    const fA = new THREE.MeshStandardMaterial({ color: '#c9a94e' });
    const fB = new THREE.MeshStandardMaterial({ color: '#9a6a8a' });
    for (let i = 0; i < 30; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 2.5 + rnd() * 4.3;
      for (let k = 0; k < 3; k++) add(g, G.sph(0.035, 6, 5), rnd() < 0.5 ? fA : fB, Math.cos(a) * r + (rnd() - 0.5) * 0.2, 0.04, Math.sin(a) * r + (rnd() - 0.5) * 0.2, { cast: false });
    }
    finalize(g);
    this.village.add(g);
    // hitboxes in world units
    const wallHit = new THREE.Mesh(new THREE.TorusGeometry(WALL_R, 0.3, 6, 48), new THREE.MeshBasicMaterial({ visible: false }));
    wallHit.rotation.x = Math.PI / 2;
    wallHit.position.y = 0.25;
    wallHit.userData.pick = 'walls';
    this.scene.add(wallHit);
    this.hitboxes.push(wallHit);
    // villagers (village units, inside the scaled group)
    this.spots = Object.entries(BUILDINGS).filter(([id]) => !['walls', 'watchtower', 'archery'].includes(id)).map(([, b]) => [b.pos[0] * 0.78, b.pos[1] * 0.78]);
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Group();
      add(p, G.cap(0.07, 0.12, 4, 8), new THREE.MeshStandardMaterial({ color: SHIRT[i % SHIRT.length], roughness: 0.85 }), 0, 0.14, 0);
      add(p, G.sph(0.065, 10, 8), new THREE.MeshStandardMaterial({ color: SKIN[i % SKIN.length], roughness: 0.8 }), 0, 0.3, 0);
      p.scale.setScalar(1.3);
      const s = this.spots[i % this.spots.length];
      p.position.set(s[0], 0.02, s[1]);
      this.village.add(p);
      this.people.push({ g: p, path: [], wait: Math.random() * 4, phase: Math.random() * 10 });
    }
  }

  // ---------- overlays and actors ----------

  buildOverlays() {
    this.rangeMat = new THREE.MeshBasicMaterial({ color: '#d9a54a', transparent: true, opacity: 0, depthWrite: false });
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.988, 1.0, 180), this.rangeMat);
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.y = 0.08;
    this.rangeRing.renderOrder = 2;
    this.scene.add(this.rangeRing);
    const dotGeo = new THREE.CircleGeometry(0.11, 10);
    dotGeo.rotateX(-Math.PI / 2);
    this.dotMat = new THREE.MeshBasicMaterial({ color: '#d9603f', transparent: true, opacity: 0.8, depthWrite: false });
    this.dots = new THREE.InstancedMesh(dotGeo, this.dotMat, MAX_DOTS);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.dots.renderOrder = 3;
    this.scene.add(this.dots);
    this.selMat = new THREE.MeshBasicMaterial({ color: '#f1e3c2', transparent: true, opacity: 0.85, depthWrite: false });
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), this.selMat);
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({ color: '#f1e3c2', transparent: true, opacity: 0.35, depthWrite: false }));
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.visible = false;
    this.scene.add(this.selRing, this.hoverRing);
    for (const s of SPAWNS) {
      const [x, z] = spawnPos(s);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 2.2), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, 1.2, z);
      hit.userData.pick = `spawn:${s.id}`;
      this.scene.add(hit);
      this.hitboxes.push(hit);
    }
  }

  buildActors() {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    this.enemyMat = mat;
    this.enemyMesh = { goblin: new THREE.InstancedMesh(goblinGeometry(), mat, MAX_ENEMIES), wolf: new THREE.InstancedMesh(wolfGeometry(), mat, MAX_ENEMIES) };
    for (const m of Object.values(this.enemyMesh)) {
      m.count = 0; m.castShadow = true; m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color('#ffffff'));
      this.scene.add(m);
    }
    const quad = new THREE.PlaneGeometry(1, 1);
    this.barBg = new THREE.InstancedMesh(quad, new THREE.MeshBasicMaterial({ color: '#160f0d', depthTest: false, transparent: true, opacity: 0.85 }), MAX_ENEMIES);
    this.barFg = new THREE.InstancedMesh(quad, new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false }), MAX_ENEMIES);
    for (const b of [this.barBg, this.barFg]) { b.count = 0; b.frustumCulled = false; b.renderOrder = 10; this.scene.add(b); }
    this.barFg.setColorAt(0, new THREE.Color('#ffffff'));
    const marker = new THREE.CircleGeometry(0.5, 12);
    this.markerMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthTest: false });
    this.markers = new THREE.InstancedMesh(marker, this.markerMat, MAX_ENEMIES);
    this.markers.count = 0;
    this.markers.frustumCulled = false;
    this.markers.renderOrder = 9;
    this.markers.setColorAt(0, new THREE.Color('#ffffff'));
    this.scene.add(this.markers);
    this.arrows = new THREE.InstancedMesh(arrowGeometry(), mat, MAX_SHOTS);
    this.arrows.count = 0;
    this.arrows.frustumCulled = false;
    this.scene.add(this.arrows);
    const pg = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.09, map: this.dot, vertexColors: true, transparent: true, depthWrite: false }));
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
    this.pool = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, max: 1, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 0, home: false }));
  }

  // low mist in the forest and drifting wisps at night
  buildAtmosphere() {
    const rnd = seeded(5);
    this.mist = [];
    const mistMat = new THREE.SpriteMaterial({ map: this.dot, color: '#aab4bd', transparent: true, opacity: 0.16, depthWrite: false });
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 5 + rnd() * 26;
      const s = new THREE.Sprite(mistMat);
      s.position.set(Math.cos(a) * r, 0.5 + rnd() * 0.8, Math.sin(a) * r);
      s.scale.set(7 + rnd() * 6, 1.6 + rnd() * 1.2, 1);
      s.userData = { a, r, sp: (rnd() - 0.5) * 0.01, bob: rnd() * 6 };
      this.scene.add(s);
      this.mist.push(s);
    }
    this.mistMat = mistMat;
    this.hearth = new THREE.PointLight('#ff9a52', 0, 14, 1.6);
    this.hearth.position.set(0, 2.2, 0);
    this.scene.add(this.hearth);
    const N = 90;
    const pos = new Float32Array(N * 3);
    this.wispBase = [];
    for (let i = 0; i < N; i++) {
      let x, z;
      do { const a = rnd() * Math.PI * 2; const r = 4 + rnd() * 18; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (openness(x, z) < 0.6);
      this.wispBase.push([x, 0.4 + rnd() * 1.2, z, rnd() * 10]);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.wispMat = new THREE.PointsMaterial({ map: this.dot, color: '#9fe0c0', size: 0.18, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    this.wisps = new THREE.Points(g, this.wispMat);
    this.wisps.frustumCulled = false;
    this.scene.add(this.wisps);
  }

  // ---------- sync ----------

  sync(state) {
    if (this.lastSync === state._rev && this.lastNight === state.night) return;
    this.lastSync = state._rev;
    this.lastNight = state.night;
    for (const [id, def] of Object.entries(BUILDINGS)) {
      const lv = state.buildings[id]?.level ?? 0;
      const key = `${id}:${lv}`;
      const e = this.buildings.get(id);
      if (e && e.key === key) continue;
      if (e) { this.village.remove(e.g); disposeGroup(e.g); if (e.hit) this.hitboxes.splice(this.hitboxes.indexOf(e.hit), 1); this.scene.remove(e.hit); }
      const g = id === 'walls' ? buildWalls(this.M, lv) : buildBuilding(id, lv, this.M);
      let hit = null;
      if (id !== 'walls') {
        const [x, z] = def.pos;
        g.position.set(x, 0, z);
        if (id !== 'archery' && id !== 'watchtower') g.rotation.y = Math.atan2(-x, -z);
        const fp = buildingFootprint(id) * MINI;
        const h = (id === 'archery' ? 7 : 2.4) * MINI;
        hit = new THREE.Mesh(new THREE.BoxGeometry(fp * 2, h, fp * 2), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.set(x * MINI, h / 2, z * MINI);
        hit.userData.pick = id;
        this.scene.add(hit);
        this.hitboxes.push(hit);
      }
      if (id === 'archery') { this.towerTop = g.userData.top * MINI; this.tower = g; }
      for (const a of g.userData.anims || []) a.base = { y: a.obj.position.y, rot: a.obj.rotation.clone() };
      this.village.add(g);
      this.buildings.set(id, { key, g, hit });
    }
    const n = state.battle ? state.battle.n : state.night;
    const active = new Set(activeSpawns(n).map((s) => s.id));
    for (const s of SPAWNS) {
      const open = active.has(s.id);
      const p = this.portals.get(s.id);
      if (p && p.open === open) continue;
      if (p) { this.scene.remove(p.g); disposeGroup(p.g); }
      const g = buildPortal(this.M, open, s.id === 'moss' || s.id === 'bog');
      const [x, z] = spawnPos(s);
      const path = PATHS.find((q) => q.pts[0][0] === x && q.pts[0][1] === z);
      const [nx, nz] = path ? path.pts[1] : [0, 0];
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(nx - x, nz - z);
      g.scale.setScalar(0.75);
      if (open) {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: '#8a5cff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.position.y = 1.0;
        glow.scale.set(2.4, 2.8, 1);
        g.add(glow);
        g.userData.glow = glow;
      }
      this.scene.add(g);
      this.portals.set(s.id, { g, open });
    }
    const routeKey = [...active].join(',');
    if (this.routeKey !== routeKey) {
      this.routeKey = routeKey;
      const f = defaultField();
      this.routes = [...active].map((id) => ({ id, ...routeFrom(f, ...spawnPos(SPAWNS.find((s) => s.id === id))) }));
    }
    this.range = archeryStats(state.buildings.archery.level).range;
    this.rangeRing.scale.setScalar(this.range);
    if (this.selected) this.place(this.selected, this.selRing);
  }

  // ---------- selection ----------

  place(id, ring) {
    let x = 0, z = 0, r;
    if (id?.startsWith('spawn:')) { [x, z] = spawnPos(SPAWNS.find((s) => `spawn:${s.id}` === id)); r = 1.3; }
    else if (id === 'walls') r = WALL_R + 0.3;
    else if (BUILDINGS[id]) { [x, z] = BUILDINGS[id].pos.map((v) => v * MINI); r = (buildingFootprint(id) + 0.2) * MINI; }
    else { ring.visible = false; return; }
    ring.position.set(x, 0.06, z);
    ring.scale.setScalar(r);
    ring.visible = true;
  }

  select(id) {
    this.selected = id;
    if (id) this.place(id, this.selRing); else this.selRing.visible = false;
  }

  focus(id, mode) {
    const rig = this.rigs[mode];
    if (id?.startsWith('spawn:')) { const [x, z] = spawnPos(SPAWNS.find((s) => `spawn:${s.id}` === id)); rig.focusOn(x * 0.85, z * 0.85, mode === 'village' ? 20 : 22); return; }
    if (BUILDINGS[id] && id !== 'walls') { const [x, z] = BUILDINGS[id].pos; rig.focusOn(x * MINI, z * MINI, mode === 'village' ? (id === 'archery' ? 7 : 5) : 16); return; }
    rig.focusOn(0, 0, mode === 'village' ? 12 : 18);
  }

  // ---------- particles ----------

  emit(n, x, y, z, color, { speed = 1, up = 1, life = 0.8, grav = 2.5, home = false } = {}, reduced) {
    if (reduced) n = Math.ceil(n / 2);
    const c = new THREE.Color(color);
    for (let i = 0; i < n; i++) {
      const p = this.pool.find((q) => q.life <= 0);
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      Object.assign(p, { x, y, z, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vy: up * (0.5 + Math.random() * 0.6), life: life * (0.7 + Math.random() * 0.5), max: life, r: c.r, g: c.g, b: c.b, grav, home });
    }
  }

  stepParticles(dt) {
    const topY = (this.towerTop || 2) * 0.9;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.life > 0) {
        p.life -= dt;
        if (p.home) {
          const dx = -p.x, dy = topY - p.y, dz = -p.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          const sp = 12 * Math.min(1, (p.max - p.life) * 1.5);
          const k = Math.min(1, dt * 4);
          p.vx += ((dx / d) * sp - p.vx) * k; p.vy += ((dy / d) * sp - p.vy) * k; p.vz += ((dz / d) * sp - p.vz) * k;
          if (d < 0.4) p.life = 0;
        } else p.vy -= p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      }
      const alive = p.life > 0;
      this.pPos[i * 3] = p.x; this.pPos[i * 3 + 1] = alive ? p.y : -99; this.pPos[i * 3 + 2] = p.z;
      const f = alive ? Math.min(1, p.life / (p.max * 0.5)) : 0;
      this.pCol[i * 3] = p.r * f; this.pCol[i * 3 + 1] = p.g * f; this.pCol[i * 3 + 2] = p.b * f;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  consumeFx(b, ctx) {
    if (!b) { this.seenFx = 0; this.fxNight = null; return; }
    if (this.fxNight !== b.n) { this.seenFx = 0; this.fxNight = b.n; }
    for (const f of b.fx) {
      if (f.id <= this.seenFx) continue;
      this.seenFx = f.id;
      if (f.kind === 'death') {
        this.emit(8, f.x, 0.2, f.z, '#a99f8c', { speed: 0.9, up: 1.0, life: 0.7 }, ctx.reducedMotion);
        this.emit(Math.min(6, 1 + f.gold), f.x, 0.3, f.z, '#f0c25a', { speed: 0.6, up: 1.8, life: 2.2, home: true }, ctx.reducedMotion);
        ctx.onFx?.('death');
      } else if (f.kind === 'hit') {
        this.emit(3, f.x, 0.25, f.z, '#e8dcc4', { speed: 0.6, up: 0.6, life: 0.3 }, ctx.reducedMotion);
        if (f.eid) this.hitTimes.set(f.eid, this.t);
        if (this.hitTimes.size > 600) this.hitTimes.clear();
        ctx.onFx?.('hit');
      } else if (f.kind === 'wall') {
        this.emit(4, f.x * 0.95, 0.3, f.z * 0.95, '#7d6a52', { speed: 0.7, up: 0.8, life: 0.6 }, ctx.reducedMotion);
        this.emit(2, f.x * 0.95, 0.35, f.z * 0.95, '#ff9a4a', { speed: 1.0, up: 1.1, life: 0.4 }, ctx.reducedMotion);
        ctx.onFx?.('wall');
      }
    }
  }

  // ---------- frame ----------

  frame(dt, state, ctx, mode) {
    this.t += dt;
    const t = this.t * ctx.motion;
    const rig = this.rigs[mode];
    const camDist = rig.camera.position.distanceTo(rig.controls.target);
    // shadows and fog follow the active camera
    const want = THREE.MathUtils.clamp(camDist * 0.75, 6, 26);
    if (Math.abs(want - this.light.shadowR) > 0.5 || this.light.center.distanceTo(rig.controls.target) > 1) this.light.setShadowArea(rig.controls.target.clone().setY(0), want);
    const fog = FOG[mode];
    this.scene.fog.near += (fog[0] + camDist * 0.4 - this.scene.fog.near) * Math.min(1, dt * 3);
    this.scene.fog.far += (fog[1] + camDist * 0.8 - this.scene.fog.far) * Math.min(1, dt * 3);
    const nf = this.light.update(dt, state, rig.camera, this.M, (n) => this.enemyMat.emissive.set('#000000').lerp(new THREE.Color('#2a2422'), n));
    rig.update(dt);
    const b = state?.battle || null;
    const fighting = !!b;
    const alpha = ctx.alpha;
    const defense = mode === 'defense';

    for (const e of this.buildings.values()) for (const a of e.g.userData.anims || []) {
      const o = a.obj;
      if (a.type === 'flutter') o.rotation.y = a.base.rot.y + Math.sin(t * a.speed) * 0.25;
      else if (a.type === 'archer') o.rotation.y = Math.atan2(o.position.x, o.position.z) + (fighting ? Math.sin(t * 6 + a.phase) * 0.15 : Math.sin(t * 0.7 + a.phase) * 0.3);
      else if (a.type === 'graze') o.rotation.y = Math.sin(t * 0.3) * 1.2;
    }
    for (const p of this.portals.values()) {
      const glow = p.g.userData.glow;
      if (glow) glow.material.opacity = 0.3 + nf * 0.4 + (fighting ? 0.15 : 0) + Math.sin(t * 1.7) * (ctx.reducedFlashing ? 0 : 0.06);
      for (const a of p.g.userData.anims) {
        a.obj.rotation.z = t * 0.8;
        a.obj.material.color.set('#24143a').lerp(new THREE.Color('#6a34c4'), 0.35 + nf * 0.45 + (fighting ? 0.2 : 0));
      }
    }
    const showRange = this.selected === 'archery' || (defense && (fighting || nf > 0.2));
    this.rangeMat.opacity += ((showRange ? (this.selected === 'archery' ? 0.6 : 0.3) : 0) - this.rangeMat.opacity) * Math.min(1, dt * 4);
    this.rangeRing.visible = this.rangeMat.opacity > 0.01;
    this.drawRoutes(state, fighting, t, defense);

    // atmosphere
    this.hearth.intensity = nf * 9;
    this.mistMat.opacity = 0.12 + nf * 0.08;
    this.mistMat.color.set('#aab4bd').lerp(new THREE.Color('#4a5070'), nf);
    for (const m of this.mist) {
      if (!ctx.reducedMotion) m.userData.a += dt * m.userData.sp;
      m.position.x = Math.cos(m.userData.a) * m.userData.r;
      m.position.z = Math.sin(m.userData.a) * m.userData.r;
    }
    this.wispMat.opacity = Math.max(0, nf - 0.3) * 0.9;
    if (this.wispMat.opacity > 0.01) {
      const a = this.wisps.geometry.attributes.position;
      this.wispBase.forEach(([x, y, z, ph], i) => a.setXYZ(i, x + Math.sin(t * 0.4 + ph) * 0.5, y + Math.sin(t * 0.9 + ph * 2) * 0.25, z + Math.cos(t * 0.35 + ph) * 0.5));
      a.needsUpdate = true;
    }

    // enemies
    const counts = { goblin: 0, wolf: 0 };
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const sE = new THREE.Vector3(ENEMY_SCALE, ENEMY_SCALE, ENEMY_SCALE);
    const sA = new THREE.Vector3(0.7, 0.7, 0.7);
    const white = new THREE.Color('#ffffff');
    const flash = new THREE.Color('#ff9a8a');
    const camQ = rig.camera.quaternion;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ);
    const barScale = THREE.MathUtils.clamp(camDist / 30, 0.35, 2);
    const markAlpha = defense ? THREE.MathUtils.clamp((camDist - 22) / 18, 0, 1) : 0;
    const markSize = 0.011 * camDist;
    const MARK = { goblin: new THREE.Color('#f0a548'), wolf: new THREE.Color('#e0503f') };
    let bars = 0, marks = 0;
    this.consumeFx(b, ctx);
    if (b) {
      for (const e of b.enemies) {
        const mesh = this.enemyMesh[e.type];
        if (!mesh) continue;
        const i = counts[e.type]++;
        const x = e.px + (e.x - e.px) * alpha;
        const z = e.pz + (e.z - e.pz) * alpha;
        const ph = (parseInt(e.id.slice(1), 10) || 0) * 1.3;
        let y = 0.02;
        let lunge = 0;
        if (e.state === 'attack') lunge = Math.max(0, Math.sin(t * e.rate * 6.28 + ph)) * 0.06;
        else y += Math.abs(Math.sin(t * e.speed * 11 + ph)) * 0.025 * ctx.motion;
        q.setFromAxisAngle(up, e.heading);
        v.set(x + Math.sin(e.heading) * lunge, y, z + Math.cos(e.heading) * lunge);
        m4.compose(v, q, sE);
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, this.t - (this.hitTimes.get(e.id) ?? -9) < 0.12 && !ctx.reducedFlashing ? flash : white);
        if (markAlpha > 0.01) {
          v.set(x, (ENEMY_H[e.type] || 0.4) + markSize * 1.4, z);
          m4.compose(v, camQ, new THREE.Vector3(markSize, markSize, 1));
          this.markers.setMatrixAt(marks, m4);
          this.markers.setColorAt(marks++, MARK[e.type] || MARK.goblin);
        }
        if (e.hp < e.max) {
          const frac = Math.max(0, e.hp / e.max);
          const hy = (ENEMY_H[e.type] || 0.4) + 0.1 * barScale;
          const w = 0.45 * barScale;
          v.set(x, hy, z);
          m4.compose(v, camQ, new THREE.Vector3(w * 1.1, 0.085 * barScale, 1));
          this.barBg.setMatrixAt(bars, m4);
          v.set(x, hy, z).addScaledVector(right, -0.5 * w * (1 - frac));
          m4.compose(v, camQ, new THREE.Vector3(w * frac, 0.05 * barScale, 1));
          this.barFg.setMatrixAt(bars, m4);
          this.barFg.setColorAt(bars, new THREE.Color().setHSL(0.02 + 0.25 * frac, 0.6, 0.5));
          bars++;
        }
      }
    }
    for (const [k, m] of Object.entries(this.enemyMesh)) {
      m.count = counts[k];
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
    this.markers.count = marks;
    this.markerMat.opacity = 0.85 * markAlpha;
    this.markers.instanceMatrix.needsUpdate = true;
    if (this.markers.instanceColor) this.markers.instanceColor.needsUpdate = true;
    this.barBg.count = bars; this.barFg.count = bars;
    this.barBg.instanceMatrix.needsUpdate = true; this.barFg.instanceMatrix.needsUpdate = true;
    if (this.barFg.instanceColor) this.barFg.instanceColor.needsUpdate = true;

    let na = 0;
    if (b) {
      const top = this.towerTop || 2;
      for (const s of b.shots) {
        if (na >= MAX_SHOTS) break;
        const x = s.px + (s.x - s.px) * alpha;
        const z = s.pz + (s.z - s.pz) * alpha;
        const rem = Math.hypot(s.lx - x, s.lz - z);
        const total = s.travelled + rem + 1e-6;
        const p = Math.min(1, s.travelled / total);
        const arc = Math.min(1.4, total * 0.12);
        const y = THREE.MathUtils.lerp(top, 0.25, p) + Math.sin(Math.PI * p) * arc;
        const dir = new THREE.Vector3(s.lx - s.sx, 0, s.lz - s.sz).normalize();
        dir.y = (0.25 - top) / total + (Math.PI * arc * Math.cos(Math.PI * p)) / total;
        dir.normalize();
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        v.set(x, y, z);
        m4.compose(v, q, sA);
        this.arrows.setMatrixAt(na++, m4);
      }
    }
    this.arrows.count = na;
    this.arrows.instanceMatrix.needsUpdate = true;
    this.particles.material.size = THREE.MathUtils.clamp(camDist * 0.006, 0.05, 0.2);
    this.stepParticles(dt);
    this.stepVillagers(dt * ctx.motion, nf);
    for (const c of this.light.sky.clouds) {
      if (!ctx.reducedMotion) c.userData.a += dt * c.userData.speed;
      c.position.x = Math.cos(c.userData.a) * c.userData.r;
      c.position.z = Math.sin(c.userData.a) * c.userData.r;
    }
    if (this.selRing.visible) this.selMat.opacity = 0.7 + Math.sin(this.t * 3) * (ctx.reducedFlashing ? 0 : 0.2);
    const hov = this.views[mode].hovered;
    if (hov && hov !== this.selected) this.place(hov, this.hoverRing); else this.hoverRing.visible = false;
  }

  drawRoutes(state, fighting, t, defense) {
    const sel = this.selected?.startsWith('spawn:') ? this.selected.slice(6) : null;
    const show = defense && state && !fighting && state.phase === 'day';
    let n = 0;
    if (show || sel) {
      const m4 = new THREE.Matrix4();
      const off = (t * 0.7) % 0.5;
      for (const r of this.routes) {
        if (!show && r.id !== sel) continue;
        let carry = 0.5 - off;
        for (let i = 0; i < r.pts.length - 1 && n < MAX_DOTS; i++) {
          const [ax, az] = r.pts[i];
          const [bx, bz] = r.pts[i + 1];
          const len = Math.hypot(bx - ax, bz - az);
          let d = carry;
          while (d < len && n < MAX_DOTS) {
            const k = d / len;
            m4.makeTranslation(ax + (bx - ax) * k, 0.07, az + (bz - az) * k);
            this.dots.setMatrixAt(n++, m4);
            d += 0.5;
          }
          carry = d - len;
        }
      }
    }
    this.dots.count = n;
    this.dots.instanceMatrix.needsUpdate = true;
    this.dotMat.opacity = sel ? 0.95 : 0.7;
  }

  stepVillagers(dt, nf) {
    for (const p of this.people) {
      const g = p.g;
      if (nf > 0.55) {
        if (!p.indoors) { const s = this.spots[Math.floor(Math.random() * this.spots.length)]; p.path = [[s[0], s[1]]]; p.indoors = true; }
      } else if (p.indoors) { p.indoors = false; g.visible = true; p.wait = Math.random() * 2; }
      if (p.path.length) {
        const [tx, tz] = p.path[0];
        const dx = tx - g.position.x, dz = tz - g.position.z;
        const d = Math.hypot(dx, dz);
        const step = 0.8 * dt;
        if (d <= step) { g.position.x = tx; g.position.z = tz; p.path.shift(); if (!p.path.length) p.wait = 2 + Math.random() * 5; }
        else { g.position.x += (dx / d) * step; g.position.z += (dz / d) * step; g.rotation.y = Math.atan2(dx, dz); }
        p.phase += dt * 10;
        g.position.y = 0.02 + Math.abs(Math.sin(p.phase)) * 0.03;
        if (p.indoors && !p.path.length) g.visible = false;
        continue;
      }
      if (p.indoors) continue;
      p.wait -= dt;
      if (p.wait > 0) continue;
      const s = this.spots[Math.floor(Math.random() * this.spots.length)];
      const a0 = Math.atan2(g.position.z, g.position.x);
      const a1 = Math.atan2(s[1], s[0]);
      p.path = [[Math.cos(a0) * 2.0, Math.sin(a0) * 2.0], [Math.cos((a0 + a1) / 2) * 2.0, Math.sin((a0 + a1) / 2) * 2.0], [Math.cos(a1) * 2.0, Math.sin(a1) * 2.0], [s[0], s[1]]];
    }
  }
}
