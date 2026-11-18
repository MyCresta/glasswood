// Defence view: the village shown small at the centre of a wide landscape.
// The Great Tower shoots at miniature enemies coming out of the forest.
import * as THREE from 'three';
import { G, add, disposeGroup } from './kit.js';
import {
  buildBuilding, buildWalls, buildPortal, goblinGeometry, wolfGeometry, arrowGeometry,
} from './models.js';
import { buildGround, buildForest, scatterForest, buildMountains, buildWater, PAL, noise2, seeded } from './landscape.js';
import { DayNight } from './lighting.js';
import { CameraRig } from './rig.js';
import {
  BUILDINGS, SPAWNS, WALL_R, FIELD_R, MINI, archeryStats,
} from '../data/village.js';
import { spawnPos, defaultField, routeFrom, ROCK_CELLS, cellCenter } from '../sim/map.js';
import { activeSpawns } from '../sim/battle.js';

const MAX_ENEMIES = 400;
const MAX_SHOTS = 200;
const MAX_PARTICLES = 600;
const MAX_DOTS = 900;
const ENEMY_SCALE = 1.0;
const TOWER_SCALE = 1.75; // the Great Tower stands out above the miniature village
const ENEMY_H = { goblin: 0.62 * ENEMY_SCALE, wolf: 0.55 * ENEMY_SCALE };
const LAKE = { x: -33, z: 19, r: 8 };

export class DefenseView {
  constructor(canvas, M, dot) {
    this.name = 'defense';
    this.M = M;
    this.dot = dot;
    this.scene = new THREE.Scene();
    this.light = new DayNight(this.scene, { shadowR: 26, fog: [70, 230] });
    this.rig = new CameraRig(canvas, { fov: 36, min: 8, max: 110, limit: 26, maxPolar: 1.25, home: { target: new THREE.Vector3(0, 0, 3), dist: 50, polar: 0.92, az: 0.18 } });
    this.hitboxes = [];
    this.portals = new Map();
    this.minis = new Map();
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
  }

  buildLand() {
    const n2 = noise2(31);
    const height = (x, z) => {
      const r = Math.hypot(x, z);
      const rise = THREE.MathUtils.smoothstep(r, FIELD_R + 1, FIELD_R + 40);
      let y = rise * (n2(x * 0.035 + 7, z * 0.035) * 9 + 1.5) + rise * rise * 5;
      const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
      if (dl < LAKE.r + 3) y = Math.min(y, -0.6 + THREE.MathUtils.smoothstep(dl, LAKE.r - 2, LAKE.r + 3) * (y + 0.6));
      return y;
    };
    this.height = height;
    const meadow = PAL.meadow.map((c) => new THREE.Color(c));
    const grass = PAL.grass.map((c) => new THREE.Color(c));
    const floor = new THREE.Color(PAL.forestFloor);
    const dirt = new THREE.Color(PAL.dirt);
    const rock = new THREE.Color('#9a9187');
    this.scene.add(buildGround({
      radius: 260, rings: 80, segs: 220, height,
      color: (x, z, y, c) => {
        const r = Math.hypot(x, z);
        const n = n2(x * 0.25 + 50, z * 0.25);
        if (r < FIELD_R) {
          c.copy(meadow[0]).lerp(meadow[1], n);
          c.lerp(grass[2], Math.max(0, n2(x * 0.6, z * 0.6) - 0.55) * 1.4);
          if (r < WALL_R + 1.2) c.lerp(dirt, (1 - Math.max(0, r - WALL_R) / 1.2) * 0.4);
        } else {
          c.copy(grass[2]).lerp(floor, Math.min(1, (r - FIELD_R) / 5));
          if (y > 9) c.lerp(rock, Math.min(1, (y - 9) / 8));
        }
        if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 1.2) c.lerp(new THREE.Color('#b6a77f'), 0.6);
      },
    }));
    const water = buildWater(new THREE.CircleGeometry(LAKE.r + 0.6, 40));
    water.rotation.x = -Math.PI / 2;
    water.position.set(LAKE.x, -0.25, LAKE.z);
    this.scene.add(water);
    // forest around the field, clear of spawn points and the lake
    const spawns = SPAWNS.map((s) => spawnPos(s));
    const avoid = (x, z) => spawns.some(([sx, sz]) => Math.hypot(x - sx, z - sz) < 3.2) || Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 1.5;
    const near = scatterForest({ seed: 9, rMin: FIELD_R + 1.2, rMax: 46, count: 2600, height, avoid, clump: 0.12, scale: [1.0, 2.0] });
    const far = scatterForest({ seed: 19, rMin: 46, rMax: 140, count: 1200, height, avoid, clump: 0.2, scale: [1.6, 3.0] });
    this.scene.add(buildForest(far, { cast: false }));
    const spots = near;
    // natural obstacles on the field (blocked tiles)
    const rnd = seeded(77);
    for (const [i, j] of ROCK_CELLS) {
      const [x, z] = cellCenter(i, j);
      spots.push({ x, z, y: 0, s: 0.8 + rnd() * 0.5, kind: rnd() < 0.5 ? 'rock' : rnd() < 0.5 ? 'pine' : 'bush', rot: rnd() * 6, hue: rnd(), light: rnd() });
    }
    // scattered bushes on the meadow (decorative only)
    for (let k = 0; k < 90; k++) {
      const a = rnd() * Math.PI * 2;
      const r = WALL_R + 2 + rnd() * (FIELD_R - WALL_R - 3);
      spots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0, s: 0.35 + rnd() * 0.3, kind: 'bush', rot: rnd() * 6, hue: rnd(), light: rnd() });
    }
    this.scene.add(buildForest(spots, { castWithin: 30 }));
    this.scene.add(buildMountains({ seed: 12, radius: 190, count: 30, height: 55 }));
  }

  buildVillage() {
    this.village = new THREE.Group();
    this.village.scale.setScalar(MINI);
    this.scene.add(this.village);
    const towerHit = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 4.5, 10), new THREE.MeshBasicMaterial({ visible: false }));
    towerHit.position.y = 2.2;
    towerHit.userData.pick = 'archery';
    const villageHit = new THREE.Mesh(new THREE.CylinderGeometry(WALL_R + 0.3, WALL_R + 0.3, 1.2, 24), new THREE.MeshBasicMaterial({ visible: false }));
    villageHit.position.y = 0.6;
    villageHit.userData.pick = 'walls';
    this.scene.add(towerHit, villageHit);
    this.hitboxes.push(towerHit, villageHit);
  }

  buildOverlays() {
    this.rangeMat = new THREE.MeshBasicMaterial({ color: this.M.accent.color, transparent: true, opacity: 0, depthWrite: false });
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.0, 180), this.rangeMat);
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.y = 0.05;
    this.rangeRing.renderOrder = 2;
    this.scene.add(this.rangeRing);
    const dotGeo = new THREE.CircleGeometry(0.14, 12);
    dotGeo.rotateX(-Math.PI / 2);
    this.dotMat = new THREE.MeshBasicMaterial({ color: '#ff7f5a', transparent: true, opacity: 0.8, depthWrite: false });
    this.dots = new THREE.InstancedMesh(dotGeo, this.dotMat, MAX_DOTS);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    this.dots.renderOrder = 3;
    this.scene.add(this.dots);
    this.selMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), this.selMat);
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.visible = false;
    this.scene.add(this.selRing, this.hoverRing);
    for (const s of SPAWNS) {
      const [x, z] = spawnPos(s);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 2), new THREE.MeshBasicMaterial({ visible: false }));
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
    this.barBg = new THREE.InstancedMesh(quad, new THREE.MeshBasicMaterial({ color: '#2a1d19', depthTest: false, transparent: true, opacity: 0.85 }), MAX_ENEMIES);
    this.barFg = new THREE.InstancedMesh(quad, new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false }), MAX_ENEMIES);
    for (const b of [this.barBg, this.barFg]) { b.count = 0; b.frustumCulled = false; b.renderOrder = 10; this.scene.add(b); }
    this.barFg.setColorAt(0, new THREE.Color('#ffffff'));
    // distance markers keep miniature enemies readable when zoomed out
    const marker = new THREE.CircleGeometry(0.5, 14);
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
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.16, map: this.dot, vertexColors: true, transparent: true, depthWrite: false }));
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
    this.pool = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, max: 1, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 0, home: false }));
  }

  sync(state) {
    // miniature village mirrors building levels
    for (const [id, def] of Object.entries(BUILDINGS)) {
      const lv = state.buildings[id]?.level ?? 0;
      const key = `${id}:${lv}`;
      const e = this.minis.get(id);
      if (e && e.key === key) continue;
      if (e) { this.village.remove(e.g); disposeGroup(e.g); }
      const g = id === 'walls' ? buildWalls(this.M, lv) : buildBuilding(id, lv, this.M);
      if (id !== 'walls') {
        const [x, z] = def.pos;
        g.position.set(x, 0, z);
        if (id !== 'archery' && id !== 'watchtower') g.rotation.y = Math.atan2(-x, -z);
      }
      if (id === 'archery') { g.scale.setScalar(TOWER_SCALE); this.towerTop = g.userData.top * TOWER_SCALE * MINI; this.towerModel = g; }
      this.village.add(g);
      this.minis.set(id, { key, g });
    }
    // portals
    const n = state.battle ? state.battle.n : state.night;
    const active = new Set(activeSpawns(n).map((s) => s.id));
    for (const s of SPAWNS) {
      const open = active.has(s.id);
      let p = this.portals.get(s.id);
      if (p && p.open === open) continue;
      if (p) { this.scene.remove(p.g); disposeGroup(p.g); }
      const g = buildPortal(this.M, open, s.id === 'moss' || s.id === 'bog');
      const [x, z] = spawnPos(s);
      g.position.set(x, 0, z);
      g.rotation.y = Math.atan2(-x, -z);
      g.scale.setScalar(1.1);
      if (open) {
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: '#9d6bff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.position.y = 1.0;
        glow.scale.set(2.6, 3.0, 1);
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

  place(id, ring) {
    let x = 0, z = 0, r;
    if (id?.startsWith('spawn:')) { [x, z] = spawnPos(SPAWNS.find((s) => `spawn:${s.id}` === id)); r = 1.6; }
    else if (id === 'archery') r = 1.6 * MINI * TOWER_SCALE + 0.2;
    else if (BUILDINGS[id]) r = WALL_R + 0.45;
    else { ring.visible = false; return; }
    ring.position.set(x, 0.06, z);
    ring.scale.setScalar(r);
    ring.visible = true;
  }

  select(id) {
    this.selected = id;
    if (id) this.place(id, this.selRing); else this.selRing.visible = false;
  }

  focus(id) {
    if (id?.startsWith('spawn:')) { const [x, z] = spawnPos(SPAWNS.find((s) => `spawn:${s.id}` === id)); this.rig.focusOn(x * 0.8, z * 0.8, 24); return; }
    this.rig.focusOn(0, 0, 22);
  }

  setAccent(c) { this.rangeMat.color.set(c); }

  // ---- particles ----
  emit(n, x, y, z, color, { speed = 1.2, up = 1.2, life = 0.8, grav = 3, home = false } = {}, reduced) {
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
    const topY = (this.towerTop || 2.5) * 0.85;
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.life > 0) {
        p.life -= dt;
        if (p.home) {
          const dx = -p.x, dy = topY - p.y, dz = -p.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          const sp = 14 * Math.min(1, (p.max - p.life) * 1.5);
          const k = Math.min(1, dt * 4);
          p.vx += ((dx / d) * sp - p.vx) * k; p.vy += ((dy / d) * sp - p.vy) * k; p.vz += ((dz / d) * sp - p.vz) * k;
          if (d < 0.5) p.life = 0;
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
    // skip effects that happened while this view was hidden
    if (!ctx.active) { this.seenFx = b.fxId; return; }
    for (const f of b.fx) {
      if (f.id <= this.seenFx) continue;
      this.seenFx = f.id;
      if (f.kind === 'death') {
        this.emit(8, f.x, 0.25, f.z, '#d9cbb0', { speed: 1.2, up: 1.3, life: 0.7 }, ctx.reducedMotion);
        this.emit(Math.min(6, 1 + f.gold), f.x, 0.4, f.z, '#ffd75e', { speed: 0.8, up: 2.4, life: 2.2, home: true }, ctx.reducedMotion);
        ctx.onFx?.('death');
      } else if (f.kind === 'hit') {
        this.emit(3, f.x, 0.3, f.z, '#fff4e0', { speed: 0.8, up: 0.8, life: 0.35 }, ctx.reducedMotion);
        if (f.eid) this.hitTimes.set(f.eid, this.t);
        if (this.hitTimes.size > 600) this.hitTimes.clear();
        ctx.onFx?.('hit');
      } else if (f.kind === 'wall') {
        this.emit(4, f.x * 0.95, 0.35, f.z * 0.95, '#b9a07a', { speed: 0.9, up: 1.0, life: 0.6 }, ctx.reducedMotion);
        this.emit(2, f.x * 0.95, 0.45, f.z * 0.95, '#ffb35c', { speed: 1.3, up: 1.4, life: 0.4 }, ctx.reducedMotion);
        ctx.onFx?.('wall');
      }
    }
  }

  frame(dt, state, ctx) {
    this.t += dt;
    const t = this.t * ctx.motion;
    const nf = this.light.update(dt, state, this.rig.camera, this.M, (n) => this.enemyMat.emissive.set('#000000').lerp(new THREE.Color('#2e2a26'), n));
    this.rig.update(dt);
    const b = state?.battle || null;
    const fighting = !!b;
    const alpha = ctx.alpha;

    if (this.towerModel) for (const a of this.towerModel.userData.anims) {
      if (a.type === 'flutter') a.obj.rotation.y = Math.sin(t * a.speed) * 0.25;
      if (a.type === 'archer') a.obj.rotation.y = Math.atan2(a.obj.position.x, a.obj.position.z) + (fighting ? Math.sin(t * 6 + a.phase) * 0.15 : 0);
    }
    for (const p of this.portals.values()) {
      const glow = p.g.userData.glow;
      if (glow) glow.material.opacity = 0.25 + nf * 0.45 + (fighting ? 0.15 : 0) + Math.sin(t * 1.7) * (ctx.reducedFlashing ? 0 : 0.06);
      for (const a of p.g.userData.anims) {
        a.obj.rotation.z = t * 0.8;
        a.obj.material.color.set('#2a1840').lerp(new THREE.Color('#7b3fd1'), 0.25 + nf * 0.55 + (fighting ? 0.2 : 0));
      }
    }
    const showRange = this.selected === 'archery' || fighting || nf > 0.2;
    this.rangeMat.opacity += ((showRange ? (this.selected === 'archery' ? 0.65 : 0.32) : 0.12) - this.rangeMat.opacity) * Math.min(1, dt * 4);
    this.drawRoutes(state, fighting, t);

    // enemies
    const counts = { goblin: 0, wolf: 0 };
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const sE = new THREE.Vector3(ENEMY_SCALE, ENEMY_SCALE, ENEMY_SCALE);
    const sA = new THREE.Vector3(1.1, 1.1, 1.1);
    const white = new THREE.Color('#ffffff');
    const flash = new THREE.Color('#ff9a8a');
    const camQ = this.rig.camera.quaternion;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ);
    const barScale = Math.max(1, this.rig.camera.position.distanceTo(this.rig.controls.target) / 30);
    let bars = 0;
    let marks = 0;
    const camDist = this.rig.camera.position.distanceTo(this.rig.controls.target);
    const markAlpha = THREE.MathUtils.clamp((camDist - 22) / 18, 0, 1);
    const markSize = 0.012 * camDist;
    const MARK = { goblin: new THREE.Color('#ffb347'), wolf: new THREE.Color('#ff5f5f') };
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
        if (e.state === 'attack') lunge = Math.max(0, Math.sin(t * e.rate * 6.28 + ph)) * 0.1;
        else y += Math.abs(Math.sin(t * e.speed * 9 + ph)) * 0.04 * ctx.motion;
        q.setFromAxisAngle(up, e.heading);
        v.set(x + Math.sin(e.heading) * lunge, y, z + Math.cos(e.heading) * lunge);
        m4.compose(v, q, sE);
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, this.t - (this.hitTimes.get(e.id) ?? -9) < 0.12 && !ctx.reducedFlashing ? flash : white);
        if (markAlpha > 0.01) {
          v.set(x, (ENEMY_H[e.type] || 0.5) + markSize * 1.4, z);
          m4.compose(v, camQ, new THREE.Vector3(markSize, markSize, 1));
          this.markers.setMatrixAt(marks, m4);
          this.markers.setColorAt(marks++, MARK[e.type] || MARK.goblin);
        }
        if (e.hp < e.max) {
          const frac = Math.max(0, e.hp / e.max);
          const hy = (ENEMY_H[e.type] || 0.5) + 0.12 * barScale;
          const w = 0.5 * barScale;
          v.set(x, hy, z);
          m4.compose(v, camQ, new THREE.Vector3(w * 1.1, 0.09 * barScale, 1));
          this.barBg.setMatrixAt(bars, m4);
          v.set(x, hy, z).addScaledVector(right, -0.5 * w * (1 - frac));
          m4.compose(v, camQ, new THREE.Vector3(w * frac, 0.055 * barScale, 1));
          this.barFg.setMatrixAt(bars, m4);
          this.barFg.setColorAt(bars, new THREE.Color().setHSL(0.02 + 0.3 * frac, 0.75, 0.55));
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

    // arrows from the top of the Great Tower
    let na = 0;
    if (b) {
      const top = this.towerTop || 2.5;
      for (const s of b.shots) {
        if (na >= MAX_SHOTS) break;
        const x = s.px + (s.x - s.px) * alpha;
        const z = s.pz + (s.z - s.pz) * alpha;
        const rem = Math.hypot(s.lx - x, s.lz - z);
        const total = s.travelled + rem + 1e-6;
        const p = Math.min(1, s.travelled / total);
        const arc = Math.min(1.6, total * 0.12);
        const y = THREE.MathUtils.lerp(top, 0.3, p) + Math.sin(Math.PI * p) * arc;
        const dir = new THREE.Vector3(s.lx - s.sx, 0, s.lz - s.sz).normalize();
        dir.y = (0.3 - top) / total + (Math.PI * arc * Math.cos(Math.PI * p)) / total;
        dir.normalize();
        q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        v.set(x, y, z);
        m4.compose(v, q, sA);
        this.arrows.setMatrixAt(na++, m4);
      }
    }
    this.arrows.count = na;
    this.arrows.instanceMatrix.needsUpdate = true;

    this.stepParticles(dt);
    for (const c of this.light.sky.clouds) {
      if (!ctx.reducedMotion) c.userData.a += dt * c.userData.speed;
      c.position.x = Math.cos(c.userData.a) * c.userData.r;
      c.position.z = Math.sin(c.userData.a) * c.userData.r;
    }
    if (this.selRing.visible) this.selMat.opacity = 0.7 + Math.sin(this.t * 3) * (ctx.reducedFlashing ? 0 : 0.2);
    if (this.hovered && this.hovered !== this.selected) this.place(this.hovered, this.hoverRing);
    else this.hoverRing.visible = false;
  }

  drawRoutes(state, fighting, t) {
    const sel = this.selected?.startsWith('spawn:') ? this.selected.slice(6) : null;
    const show = state && !fighting && state.phase === 'day';
    let n = 0;
    if (show || sel) {
      const m4 = new THREE.Matrix4();
      const off = (t * 0.8) % 0.6;
      for (const r of this.routes) {
        if (!show && r.id !== sel) continue;
        let carry = 0.6 - off;
        for (let i = 0; i < r.pts.length - 1 && n < MAX_DOTS; i++) {
          const [ax, az] = r.pts[i];
          const [bx, bz] = r.pts[i + 1];
          const len = Math.hypot(bx - ax, bz - az);
          let d = carry;
          while (d < len && n < MAX_DOTS) {
            const k = d / len;
            m4.makeTranslation(ax + (bx - ax) * k, 0.06, az + (bz - az) * k);
            this.dots.setMatrixAt(n++, m4);
            d += 0.6;
          }
          carry = d - len;
        }
      }
    }
    this.dots.count = n;
    this.dots.instanceMatrix.needsUpdate = true;
    this.dotMat.opacity = sel ? 0.95 : 0.7;
  }
}

export { G, add };
