// The village diorama and battlefield. Purely presentational: it reads the
// simulation state every frame and never changes game rules.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeMaterials, G, add, disposeGroup } from './kit.js';
import {
  buildBuilding, buildWalls, buildPortal, goblinGeometry, wolfGeometry, arrowGeometry, buildingFootprint,
} from './models.js';
import { buildIsland, buildPaths, buildDecor, ISLAND_R } from './world.js';
import { buildSky } from './sky.js';
import { BUILDINGS, SPAWNS, WALL_R, FIELD_R, archeryStats } from '../data/village.js';
import { spawnPos, defaultField, routeFrom } from '../sim/map.js';
import { activeSpawns } from '../sim/battle.js';

const MAX_ENEMIES = 400;
const MAX_SHOTS = 200;
const MAX_PARTICLES = 500;
const MAX_DOTS = 700;
const ENEMY_SCALE = 1.45;
const ENEMY_H = { goblin: 0.62 * ENEMY_SCALE, wolf: 0.55 * ENEMY_SCALE };
const SKIN = ['#f3d2b5', '#e2b48c', '#c98e62', '#a46a43', '#7a4b2c'];
const SHIRT = ['#5f7fb0', '#b0645a', '#6f9a5c', '#c49a4a', '#8a6fb0', '#4f8f8f'];

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Diorama {
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.h = handlers;
    this.quality = 'high';
    this.reducedMotion = false;
    this.reducedFlashing = false;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog('#cfd8e0', 60, 170);
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 900);

    this.hemi = new THREE.HemisphereLight('#e4efff', '#6b5a48', 0.9);
    this.key = new THREE.DirectionalLight('#fff1dc', 2.4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.03;
    const R = ISLAND_R + 1;
    Object.assign(this.key.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 140 });
    this.scene.add(this.hemi, this.key, this.key.target);

    this.M = makeMaterials(handlers.accent || '#f0a86b');
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.sky = buildSky('temperate');
    this.scene.add(this.sky.group);

    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.09, screenSpacePanning: false,
      minDistance: 8, maxDistance: 72, minPolarAngle: 0.25, maxPolarAngle: 1.2,
      zoomSpeed: 0.9, rotateSpeed: 0.55, panSpeed: 0.9,
    });
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.addEventListener('change', () => this.clampTarget());
    this.home = { target: new THREE.Vector3(0, -0.5, 1.2), dist: 35, polar: 0.9, az: 0.18 };

    this.dot = dotTexture();
    this.buildings = new Map();
    this.portals = new Map();
    this.hitboxes = [];
    this.people = [];
    this.selected = null;
    this.hovered = null;
    this.night = 0;
    this.t = 0;
    this.clock = new THREE.Clock();
    this.seenFx = 0;
    this.hitTimes = new Map();
    this.lastShotPos = new Map();

    this.buildStatic();
    this.buildActors();
    this.bindPointer();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.resetCamera(true);
  }

  // ---------- settings ----------

  setAccent(color) { this.M.accent.color.set(color); this.rangeMat.color.set(color); }

  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 1) : Math.min(dpr, 2));
    this.key.castShadow = q !== 'low';
    this.renderer.shadowMap.enabled = q !== 'low';
    this.sky.clouds.forEach((c) => (c.visible = q !== 'low'));
    this.resize();
    if (this.decor) { this.root.remove(this.decor); disposeGroup(this.decor); }
    this.decor = buildDecor(this.island, q, 11);
    this.root.add(this.decor);
  }

  setMotion(reduced, flashing) {
    this.reducedMotion = reduced;
    this.reducedFlashing = flashing;
  }

  resize() {
    const el = this.canvas.parentElement;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // portrait screens get a wider lens and a longer default distance
    this.camera.fov = aspect < 1 ? 50 : 36;
    this.camera.updateProjectionMatrix();
    if (this.home) {
      this.home.dist = aspect < 1 ? 35 * Math.min(2, 1 / aspect) * 0.72 : 35;
      this.home.target.z = aspect < 1 ? 4.5 : 1.2;
    }
  }

  // ---------- scene construction ----------

  buildStatic() {
    this.island = buildIsland(7);
    this.root.add(this.island.mesh);
    this.root.add(buildPaths());
    this.decor = buildDecor(this.island, this.quality, 11);
    this.root.add(this.decor);

    // range ring and route dots
    this.rangeMat = new THREE.MeshBasicMaterial({ color: this.M.accent.color, transparent: true, opacity: 0.0, depthWrite: false });
    this.rangeRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 160), this.rangeMat);
    this.rangeRing.rotation.x = -Math.PI / 2;
    this.rangeRing.position.y = 0.04;
    this.rangeRing.renderOrder = 2;
    this.root.add(this.rangeRing);

    const dotGeo = new THREE.CircleGeometry(0.13, 12);
    dotGeo.rotateX(-Math.PI / 2);
    this.dotMat = new THREE.MeshBasicMaterial({ color: '#ff7f5a', transparent: true, opacity: 0.85, depthWrite: false });
    this.dots = new THREE.InstancedMesh(dotGeo, this.dotMat, MAX_DOTS);
    this.dots.count = 0;
    this.dots.renderOrder = 3;
    this.dots.frustumCulled = false;
    this.root.add(this.dots);
    this.routes = [];

    // selection
    this.selMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), this.selMat);
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    this.selRing.renderOrder = 4;
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.visible = false;
    this.root.add(this.selRing, this.hoverRing);

    // wall hitbox (a torus around the ring)
    const wallHit = new THREE.Mesh(new THREE.TorusGeometry(WALL_R, 0.55, 6, 64), new THREE.MeshBasicMaterial({ visible: false }));
    wallHit.rotation.x = Math.PI / 2;
    wallHit.position.y = 0.5;
    wallHit.userData.pick = 'walls';
    this.root.add(wallHit);
    this.hitboxes.push(wallHit);

    // spawn portals hitboxes are created with the portals in sync()
    for (const s of SPAWNS) {
      const [x, z] = spawnPos(s);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, 1.1, z);
      hit.rotation.y = Math.atan2(-x, -z);
      hit.userData.pick = `spawn:${s.id}`;
      this.root.add(hit);
      this.hitboxes.push(hit);
    }

    this.buildVillagers();
  }

  buildActors() {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 });
    this.enemyMat = mat;
    this.enemyMesh = {
      goblin: new THREE.InstancedMesh(goblinGeometry(), mat, MAX_ENEMIES),
      wolf: new THREE.InstancedMesh(wolfGeometry(), mat, MAX_ENEMIES),
    };
    for (const m of Object.values(this.enemyMesh)) {
      m.count = 0;
      m.castShadow = true;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, new THREE.Color('#ffffff'));
      this.root.add(m);
    }
    const quad = new THREE.PlaneGeometry(1, 1);
    this.barBg = new THREE.InstancedMesh(quad, new THREE.MeshBasicMaterial({ color: '#2a1d19', depthTest: false, transparent: true, opacity: 0.85 }), MAX_ENEMIES);
    this.barFg = new THREE.InstancedMesh(quad, new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false }), MAX_ENEMIES);
    for (const b of [this.barBg, this.barFg]) { b.count = 0; b.frustumCulled = false; b.renderOrder = 10; this.root.add(b); }
    this.barFg.setColorAt(0, new THREE.Color('#ffffff'));
    this.arrows = new THREE.InstancedMesh(arrowGeometry(), mat, MAX_SHOTS);
    this.arrows.count = 0;
    this.arrows.frustumCulled = false;
    this.root.add(this.arrows);

    // particles
    const pg = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    pg.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.particles = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.16, map: this.dot, vertexColors: true, transparent: true, depthWrite: false }));
    this.particles.frustumCulled = false;
    this.root.add(this.particles);
    this.pool = Array.from({ length: MAX_PARTICLES }, () => ({ life: 0, max: 1, x: 0, y: -99, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, grav: 0, home: false }));
  }

  buildVillagers() {
    const spots = Object.entries(BUILDINGS).filter(([id]) => id !== 'walls' && id !== 'watchtower').map(([, b]) => [b.pos[0] * 0.78, b.pos[1] * 0.78]);
    this.spots = spots;
    for (let i = 0; i < 7; i++) {
      const g = new THREE.Group();
      const shirt = new THREE.MeshStandardMaterial({ color: SHIRT[i % SHIRT.length], roughness: 0.8 });
      const skin = new THREE.MeshStandardMaterial({ color: SKIN[i % SKIN.length], roughness: 0.8 });
      add(g, G.cap(0.07, 0.12, 4, 8), shirt, 0, 0.14, 0);
      add(g, G.sph(0.065, 10, 8), skin, 0, 0.3, 0);
      g.scale.setScalar(1.3);
      const s = spots[i % spots.length];
      g.position.set(s[0], 0.02, s[1]);
      this.root.add(g);
      this.people.push({ g, path: [], wait: Math.random() * 4, phase: Math.random() * 10 });
    }
  }

  // ---------- sync with state (a few times a second) ----------

  sync(state) {
    // buildings
    for (const [id, def] of Object.entries(BUILDINGS)) {
      const lv = state.buildings[id]?.level ?? 0;
      if (id === 'walls') {
        if (this.wallsLevel !== lv) {
          if (this.walls) { this.root.remove(this.walls); disposeGroup(this.walls); }
          this.walls = buildWalls(this.M, lv);
          this.root.add(this.walls);
          this.wallsLevel = lv;
        }
        continue;
      }
      const key = `${id}:${lv}`;
      let e = this.buildings.get(id);
      if (!e || e.key !== key) {
        if (e) { this.root.remove(e.group); disposeGroup(e.group); this.hitboxes = this.hitboxes.filter((x) => x !== e.hit); }
        const group = new THREE.Group();
        const model = buildBuilding(id, lv, this.M);
        group.add(model);
        const [x, z] = def.pos;
        group.position.set(x, 0, z);
        if (id !== 'townhall' && id !== 'archery' && id !== 'watchtower') model.rotation.y = Math.atan2(-x, -z);
        const fp = buildingFootprint(id);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(fp * 2, 2.4, fp * 2), new THREE.MeshBasicMaterial({ visible: false }));
        hit.position.y = 1.2;
        hit.userData.pick = id;
        group.add(hit);
        this.hitboxes.push(hit);
        this.root.add(group);
        for (const a of model.userData.anims) a.base = { y: a.obj.position.y, rot: a.obj.rotation.clone() };
        e = { key, group, model, hit };
        this.buildings.set(id, e);
      }
    }
    // portals: open if active tonight (or during the current night)
    const n = state.battle ? state.battle.n : state.night;
    const active = new Set(activeSpawns(n).map((s) => s.id));
    for (const s of SPAWNS) {
      const open = active.has(s.id);
      let p = this.portals.get(s.id);
      if (!p || p.open !== open) {
        if (p) { this.root.remove(p.g); disposeGroup(p.g); }
        const g = buildPortal(this.M, open, s.id === 'moss' || s.id === 'bog');
        if (open) {
          const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: '#9d6bff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
          glow.position.y = 1.0;
          glow.scale.set(2.2, 2.6, 1);
          g.add(glow);
          g.userData.glow = glow;
        }
        const [x, z] = spawnPos(s);
        g.position.set(x, this.island.heightAt(x, z) * 0.3, z);
        g.rotation.y = Math.atan2(-x, -z);
        this.root.add(g);
        p = { g, open };
        this.portals.set(s.id, p);
      }
    }
    // routes for tonight's spawn points
    const routeKey = [...active].join(',');
    if (this.routeKey !== routeKey) {
      this.routeKey = routeKey;
      const f = defaultField();
      this.routes = [...active].map((id) => {
        const [x, z] = spawnPos(SPAWNS.find((s) => s.id === id));
        return { id, ...routeFrom(f, x, z) };
      });
    }
    this.state = state;
    this.archeryRange = archeryStats(state.buildings.archery.level).range;
    this.rangeRing.scale.setScalar(this.archeryRange);
    if (this.selected) this.placeSelection(this.selected, this.selRing);
  }

  // ---------- picking ----------

  bindPointer() {
    const el = this.canvas;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;
    this.pickAt = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObjects(this.hitboxes, false)[0];
      return hit ? hit.object.userData.pick : null;
    };
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      down = null;
      if (moved > 7 || !quick || e.button === 2) return;
      this.h.onSelect?.(this.pickAt(e));
    });
    let last = 0;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || down) return;
      const now = performance.now();
      if (now - last < 50) return;
      last = now;
      const id = this.pickAt(e);
      if (id !== this.hovered) {
        this.hovered = id;
        el.style.cursor = id ? 'pointer' : '';
      }
      this.h.onHover?.(id, e);
    });
    el.addEventListener('pointerleave', () => { this.hovered = null; this.h.onHover?.(null); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  placeSelection(id, ring) {
    let x = 0, z = 0, r = 1;
    if (id === 'walls') r = WALL_R + 0.35;
    else if (id?.startsWith('spawn:')) { [x, z] = spawnPos(SPAWNS.find((s) => `spawn:${s.id}` === id)); r = 1.2; }
    else if (BUILDINGS[id]) { [x, z] = BUILDINGS[id].pos; r = buildingFootprint(id) + 0.2; }
    ring.position.set(x, 0.05, z);
    ring.scale.setScalar(r);
    ring.visible = true;
  }

  select(id) {
    this.selected = id;
    if (id) this.placeSelection(id, this.selRing);
    else this.selRing.visible = false;
  }

  focus(id) {
    let x = 0, z = 0, dist = 14;
    if (id?.startsWith('spawn:')) { [x, z] = spawnPos(SPAWNS.find((s) => `spawn:${s.id}` === id)); dist = 16; }
    else if (id === 'walls') dist = 28;
    else if (BUILDINGS[id]) [x, z] = BUILDINGS[id].pos;
    const off = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    this.setView(new THREE.Vector3(x, 0.4, z), dist, Math.min(sph.phi, 1.0), sph.theta);
  }

  screenPos(x, y, z) {
    const v = new THREE.Vector3(x, y, z).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, behind: v.z > 1 };
  }

  // ---------- camera ----------

  clampTarget() {
    const t = this.controls.target;
    const lim = FIELD_R - 2;
    const d = Math.hypot(t.x, t.z);
    if (d > lim) {
      const k = lim / d;
      const dx = t.x * k - t.x, dz = t.z * k - t.z;
      t.x += dx; t.z += dz;
      this.camera.position.x += dx; this.camera.position.z += dz;
    }
  }

  setView(target, dist, polar, az, instant) {
    const end = { target: target.clone(), dist, polar, az };
    if (instant || this.reducedMotion) { this.applyView(end); this.anim = null; return; }
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    this.anim = { t: 0, from: { target: this.controls.target.clone(), dist: sph.radius, polar: sph.phi, az: sph.theta }, to: end };
  }

  applyView(v) {
    this.controls.target.copy(v.target);
    this.camera.position.copy(v.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(v.dist, v.polar, v.az)));
    this.controls.update();
  }

  resetCamera(instant = false) {
    const h = this.home;
    this.setView(h.target, h.dist, h.polar, h.az, instant);
  }

  panBy(right, forward) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const move = side.multiplyScalar(right).add(dir.multiplyScalar(forward));
    this.controls.target.add(move);
    this.camera.position.add(move);
    this.clampTarget();
    this.controls.update();
  }

  rotateBy(a) {
    const off = this.camera.position.clone().sub(this.controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
  }

  zoomBy(f) {
    const off = this.camera.position.clone().sub(this.controls.target);
    off.setLength(THREE.MathUtils.clamp(off.length() * f, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
  }

  // ---------- lighting ----------

  nightTarget(state) {
    if (!state) return 0;
    if (state.phase === 'night') return 1;
    const left = state.dayLength - state.phaseT;
    if (left < 14) return ((14 - left) / 14) * 0.8;
    return 0;
  }

  stepLight(dt, state) {
    const target = this.nightTarget(state);
    const k = Math.min(1, dt * (target > this.night ? 1.2 : 0.5));
    this.night += (target - this.night) * k;
    const nf = this.night;
    const p = state && state.phase === 'day' ? Math.min(1, state.phaseT / state.dayLength) : 1;
    const P = this.sky.palette;
    const u = this.sky.uniforms;
    const tmp = new THREE.Color();
    ['top', 'horizon', 'bottom'].forEach((key, i) => {
      tmp.copy(P.day[i]).lerp(P.dusk[i], Math.min(1, nf * 2)).lerp(P.night[i], Math.max(0, nf * 2 - 1));
      u[key].value.copy(tmp);
    });
    this.scene.fog.color.copy(u.horizon.value).lerp(u.bottom.value, 0.25);
    const ang = Math.PI * (0.2 + 0.6 * p);
    const elev = Math.max(0.15, Math.sin(ang)) * (1 - nf * 0.75);
    const sun = new THREE.Vector3(Math.cos(ang) * 40, elev * 45 + 4, 22);
    const moon = new THREE.Vector3(-26, 38, -18);
    this.key.position.copy(nf > 0.6 ? moon : sun);
    this.key.intensity = nf > 0.6 ? 1.25 : 2.5 * (1 - nf) + 0.6;
    this.key.color.set(nf > 0.6 ? '#b4c2ff' : '#fff1dc').lerp(new THREE.Color('#ffae73'), nf <= 0.6 ? Math.min(1, nf * 1.6) * 0.7 : 0);
    this.hemi.intensity = 0.95 - 0.3 * nf;
    this.hemi.color.set('#e4efff').lerp(new THREE.Color('#7f8fd6'), nf);
    this.hemi.groundColor.set('#6b5a48').lerp(new THREE.Color('#3a3550'), nf);
    this.enemyMat.emissive.set('#000000').lerp(new THREE.Color('#2e2a26'), nf);
    this.M.window.emissiveIntensity = 0.12 + 1.9 * nf;
    this.M.torch.emissiveIntensity = 0.3 + 2.4 * nf;
    this.M.rune.emissiveIntensity = 0.5 + 1.8 * nf;
    this.sky.starMat.opacity = 0.15 + 0.8 * nf;
    this.sky.cloudMat.color.set('#ffffff').lerp(new THREE.Color('#8e8fb8'), nf);
    return nf;
  }

  // ---------- particles ----------

  emit(n, x, y, z, color, { speed = 1.2, up = 1.2, life = 0.8, grav = 3, home = false } = {}) {
    if (this.reducedMotion) n = Math.ceil(n / 2);
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
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (p.life > 0) {
        p.life -= dt;
        if (p.home) {
          // gold sparks fly to the Town Hall
          const dx = -p.x, dy = 1.9 - p.y, dz = -p.z;
          const d = Math.hypot(dx, dy, dz) || 1;
          const sp = 9 * Math.min(1, (p.max - p.life) * 1.5);
          p.vx += ((dx / d) * sp - p.vx) * Math.min(1, dt * 4);
          p.vy += ((dy / d) * sp - p.vy) * Math.min(1, dt * 4);
          p.vz += ((dz / d) * sp - p.vz) * Math.min(1, dt * 4);
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

  consumeFx(b) {
    if (!b) { this.seenFx = 0; this.fxNight = null; return; }
    if (this.fxNight !== b.n || (b.fx.length && b.fx[b.fx.length - 1].id < this.seenFx)) { this.seenFx = 0; this.fxNight = b.n; }
    for (const f of b.fx) {
      if (f.id <= this.seenFx) continue;
      this.seenFx = f.id;
      if (f.kind === 'death') {
        this.emit(9, f.x, 0.3, f.z, '#d9cbb0', { speed: 1.4, up: 1.4, life: 0.7 });
        this.emit(Math.min(6, 1 + f.gold), f.x, 0.5, f.z, '#ffd75e', { speed: 0.8, up: 2.2, life: 1.6, home: true });
        this.h.onFx?.('death');
      } else if (f.kind === 'hit') {
        this.emit(3, f.x, 0.35, f.z, '#fff4e0', { speed: 0.9, up: 0.8, life: 0.35 });
        if (f.eid) this.hitTimes.set(f.eid, this.t);
        if (this.hitTimes.size > 600) this.hitTimes.clear();
        this.h.onFx?.('hit');
      } else if (f.kind === 'wall') {
        this.emit(4, f.x * 0.97, 0.5, f.z * 0.97, '#b9a07a', { speed: 1.0, up: 1.2, life: 0.6 });
        this.emit(2, f.x * 0.97, 0.6, f.z * 0.97, '#ffb35c', { speed: 1.5, up: 1.6, life: 0.4 });
        this.h.onFx?.('wall');
      }
    }
  }

  // ---------- per-frame ----------

  frame(state, alpha = 1) {
    const dt = Math.min(0.1, this.clock.getDelta());
    this.t += dt;
    const nf = this.stepLight(dt, state);
    if (this.anim) {
      const f = this.anim;
      f.t = Math.min(1, f.t + dt / 0.6);
      const k = 1 - (1 - f.t) ** 3;
      this.applyView({
        target: f.from.target.clone().lerp(f.to.target, k),
        dist: THREE.MathUtils.lerp(f.from.dist, f.to.dist, k),
        polar: THREE.MathUtils.lerp(f.from.polar, f.to.polar, k),
        az: f.from.az + (((f.to.az - f.from.az + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k,
      });
      if (f.t >= 1) this.anim = null;
    }
    this.controls.update();
    const motion = this.reducedMotion ? 0.4 : 1;
    const t = this.t * motion;
    const b = state?.battle || null;
    const fighting = !!b;

    // building animations
    for (const e of this.buildings.values()) {
      for (const a of e.model.userData.anims) {
        const o = a.obj;
        if (a.type === 'flutter') o.rotation.y = a.base.rot.y + Math.sin(t * a.speed) * 0.25;
        else if (a.type === 'archer') {
          const draw = fighting ? Math.sin(t * 6 + a.phase) : Math.sin(t * 0.7 + a.phase) * 0.2;
          o.rotation.y = fighting ? Math.atan2(-o.parent.position.x - o.position.x, -o.parent.position.z - o.position.z) + Math.PI + draw * 0.15 : a.base.rot.y + draw;
          o.position.y = a.base.y + (fighting ? Math.max(0, draw) * 0.02 : 0);
        } else if (a.type === 'graze') o.rotation.y = Math.sin(t * 0.3) * 1.2;
      }
    }
    for (const p of this.portals.values()) {
      const glow = p.g.userData.glow;
      if (glow) glow.material.opacity = 0.25 + nf * 0.45 + (fighting ? 0.15 : 0) + Math.sin(t * 1.7) * (this.reducedFlashing ? 0 : 0.06);
      for (const a of p.g.userData.anims) {
        a.obj.rotation.z = t * 0.8;
        const s = 1 + Math.sin(t * 2.2) * (this.reducedFlashing ? 0.01 : 0.04);
        a.obj.scale.set(0.95 * s, 1.45 * s, 1);
        a.obj.material.color.set('#2a1840').lerp(new THREE.Color('#7b3fd1'), 0.25 + nf * 0.55 + (fighting ? 0.2 : 0));
      }
    }

    // range ring and routes
    const showRange = this.selected === 'archery' || fighting || nf > 0.2;
    this.rangeMat.opacity += ((showRange ? (this.selected === 'archery' ? 0.6 : 0.28) : 0) - this.rangeMat.opacity) * Math.min(1, dt * 4);
    this.rangeRing.visible = this.rangeMat.opacity > 0.01;
    this.drawRoutes(state, fighting, t);

    // enemies
    const counts = { goblin: 0, wolf: 0 };
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const s1 = new THREE.Vector3(1, 1, 1);
    const sE = new THREE.Vector3(ENEMY_SCALE, ENEMY_SCALE, ENEMY_SCALE);
    const sA = new THREE.Vector3(1.6, 1.6, 1.6);
    const up = new THREE.Vector3(0, 1, 0);
    const white = new THREE.Color('#ffffff');
    const flash = new THREE.Color('#ff9a8a');
    const camQ = this.camera.quaternion;
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camQ);
    let bars = 0;
    this.consumeFx(b);
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
        if (e.state === 'attack') lunge = Math.max(0, Math.sin(t * e.rate * 6.28 + ph)) * 0.12;
        else y += Math.abs(Math.sin(t * e.speed * 9 + ph)) * 0.05 * motion;
        const hdg = e.heading;
        q.setFromAxisAngle(up, hdg);
        v.set(x + Math.sin(hdg) * lunge, y, z + Math.cos(hdg) * lunge);
        m4.compose(v, q, sE);
        mesh.setMatrixAt(i, m4);
        mesh.setColorAt(i, this.t - (this.hitTimes.get(e.id) ?? -9) < 0.12 && !this.reducedFlashing ? flash : white);
        if (e.hp < e.max) {
          const frac = Math.max(0, e.hp / e.max);
          const hy = ENEMY_H[e.type] || 0.6;
          v.set(x, hy + 0.12, z);
          m4.compose(v, camQ, new THREE.Vector3(0.6, 0.1, 1));
          this.barBg.setMatrixAt(bars, m4);
          v.set(x, hy + 0.12, z).addScaledVector(right, -0.27 * (1 - frac));
          m4.compose(v, camQ, new THREE.Vector3(0.54 * frac, 0.06, 1));
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
    this.barBg.count = bars;
    this.barFg.count = bars;
    this.barBg.instanceMatrix.needsUpdate = true;
    this.barFg.instanceMatrix.needsUpdate = true;
    if (this.barFg.instanceColor) this.barFg.instanceColor.needsUpdate = true;

    // arrows
    let na = 0;
    if (b) {
      const top = this.buildings.get('archery')?.model.userData.top || 2.4;
      for (const s of b.shots) {
        if (na >= MAX_SHOTS) break;
        const x = s.px + (s.x - s.px) * alpha;
        const z = s.pz + (s.z - s.pz) * alpha;
        const rem = Math.hypot(s.lx - x, s.lz - z);
        const total = s.travelled + rem + 1e-6;
        const p = Math.min(1, s.travelled / total);
        const arc = Math.min(1.2, total * 0.12);
        const y = THREE.MathUtils.lerp(top, 0.35, p) + Math.sin(Math.PI * p) * arc;
        const dy = (0.35 - top) / total + (Math.PI * arc * Math.cos(Math.PI * p)) / total;
        const dir = new THREE.Vector3(s.lx - s.sx, 0, s.lz - s.sz).normalize();
        dir.y = dy;
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
    this.stepVillagers(dt * motion, nf);

    for (const c of this.sky.clouds) {
      if (!this.reducedMotion) c.userData.a += dt * c.userData.speed;
      c.position.x = Math.cos(c.userData.a) * c.userData.r;
      c.position.z = Math.sin(c.userData.a) * c.userData.r;
    }
    this.sky.group.position.copy(this.camera.position).setY(0);
    this.sky.planet.rotation.y += dt * 0.01;
    if (this.selRing.visible) this.selMat.opacity = 0.7 + Math.sin(this.t * 3) * (this.reducedFlashing ? 0 : 0.2);
    if (this.hovered && this.hovered !== this.selected) this.placeSelection(this.hovered, this.hoverRing);
    else this.hoverRing.visible = false;
    this.renderer.render(this.scene, this.camera);
  }

  drawRoutes(state, fighting, t) {
    const show = state && !fighting && (state.phase === 'day');
    const sel = this.selected?.startsWith('spawn:') ? this.selected.slice(6) : null;
    let n = 0;
    if (show || sel) {
      const m4 = new THREE.Matrix4();
      const off = (t * 0.6) % 0.5;
      for (const r of this.routes) {
        if (sel && r.id !== sel && !show) continue;
        const pts = r.pts;
        let carry = 0.5 - off;
        for (let i = 0; i < pts.length - 1 && n < MAX_DOTS; i++) {
          const [ax, az] = pts[i];
          const [bx, bz] = pts[i + 1];
          const len = Math.hypot(bx - ax, bz - az);
          let d = carry;
          while (d < len && n < MAX_DOTS) {
            const k = d / len;
            m4.makeTranslation(ax + (bx - ax) * k, 0.05, az + (bz - az) * k);
            this.dots.setMatrixAt(n++, m4);
            d += 0.5;
          }
          carry = d - len;
        }
      }
    }
    this.dots.count = n;
    this.dots.instanceMatrix.needsUpdate = true;
    this.dotMat.opacity = sel ? 0.95 : 0.6;
  }

  stepVillagers(dt, nf) {
    for (const p of this.people) {
      const g = p.g;
      if (nf > 0.55) {
        // everyone heads indoors for the night
        if (!p.indoors) { p.path = [[0, 0.9]]; p.indoors = true; }
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
      p.path = [[(Math.random() - 0.5) * 1.2, 1.6 + (Math.random() - 0.5) * 0.6], [s[0], s[1]]];
    }
  }
}
