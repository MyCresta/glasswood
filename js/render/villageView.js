// Village view: the village up close in its clearing, with the Great Tower at
// its heart. This is where buildings (and later villagers) are managed.
import * as THREE from 'three';
import { G, add, finalize, disposeGroup, seeded } from './kit.js';
import { buildBuilding, buildWalls, buildingFootprint } from './models.js';
import { buildGround, buildForest, scatterForest, buildMountains, PAL, noise2 } from './landscape.js';
import { DayNight } from './lighting.js';
import { CameraRig } from './rig.js';
import { BUILDINGS, VIEW_WALL_R } from '../data/village.js';

const SKIN = ['#f3d2b5', '#e2b48c', '#c98e62', '#a46a43', '#7a4b2c'];
const SHIRT = ['#5f7fb0', '#b0645a', '#6f9a5c', '#c49a4a', '#8a6fb0', '#4f8f8f'];

export class VillageView {
  constructor(canvas, M) {
    this.name = 'village';
    this.M = M;
    this.scene = new THREE.Scene();
    this.light = new DayNight(this.scene, { shadowR: 15, fog: [40, 150] });
    this.rig = new CameraRig(canvas, { fov: 36, min: 6, max: 55, limit: 10, maxPolar: 1.3, home: { target: new THREE.Vector3(0, 0.8, 0.8), dist: 31, polar: 0.98, az: 0.32 } });
    this.buildings = new Map();
    this.hitboxes = [];
    this.people = [];
    this.selected = null;
    this.hovered = null;
    this.t = 0;
    this.buildLand();
    this.buildSelection();
    this.buildVillagers();
  }

  buildLand() {
    const n2 = noise2(21);
    const R = VIEW_WALL_R;
    const height = (x, z) => {
      const r = Math.hypot(x, z);
      const rise = THREE.MathUtils.smoothstep(r, R + 4, R + 30);
      return rise * (n2(x * 0.05 + 3, z * 0.05) * 6 + 1) + rise * rise * 2;
    };
    this.height = height;
    const grass = PAL.grass.map((c) => new THREE.Color(c));
    const dirt = new THREE.Color(PAL.dirt);
    const floor = new THREE.Color(PAL.forestFloor);
    this.ground = buildGround({
      radius: 160, rings: 70, segs: 200, height,
      color: (x, z, y, c) => {
        const r = Math.hypot(x, z);
        const n = n2(x * 0.3 + 40, z * 0.3);
        c.copy(grass[0]).lerp(grass[1], n);
        if (r > R + 3) c.lerp(floor, Math.min(1, (r - R - 3) / 6) * 0.6);
        if (r < 2.2) c.lerp(dirt, 0.7);
        if (Math.abs(x) < 0.9 + z * 0.02 && z > R - 0.5 && z < R + 26) c.lerp(dirt, 0.65); // road out of the gate
      },
    });
    this.scene.add(this.ground);
    this.scene.add(this.buildPaths());
    const avoid = (x, z) => Math.abs(x + Math.sin(z * 0.08) * 2) < 2.4 && z > R;
    this.scene.add(buildForest(scatterForest({ seed: 4, rMin: R + 3.5, rMax: 32, count: 1300, height, avoid, clump: 0.1, scale: [1.3, 2.4] }), { castWithin: 19 }));
    this.scene.add(buildForest(scatterForest({ seed: 14, rMin: 32, rMax: 95, count: 900, height, avoid, clump: 0.2, scale: [2, 3.4] }), { cast: false }));
    this.scene.add(buildMountains({ seed: 8, radius: 125, count: 26, height: 34 }));
    // flowers and props inside the walls
    const rnd = seeded(13);
    const deco = new THREE.Group();
    const fA = new THREE.MeshStandardMaterial({ color: '#f3d36b' });
    const fB = new THREE.MeshStandardMaterial({ color: '#f2a7c2' });
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 2.4 + rnd() * 4.6;
      for (let k = 0; k < 3; k++) add(deco, G.sph(0.035, 6, 5), rnd() < 0.5 ? fA : fB, Math.cos(a) * r + (rnd() - 0.5) * 0.2, 0.04, Math.sin(a) * r + (rnd() - 0.5) * 0.2, { cast: false });
    }
    finalize(deco);
    this.scene.add(deco);
  }

  buildPaths() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: '#c2a57b', roughness: 1 });
    const seg = (ax, az, bx, bz, w) => {
      const len = Math.hypot(bx - ax, bz - az);
      add(g, G.rbox(w, 0.02, len, 0.01), mat, (ax + bx) / 2, 0.015, (az + bz) / 2, { rot: [0, Math.atan2(bx - ax, bz - az), 0], cast: false });
      add(g, G.cyl(w / 2, w / 2, 0.02, 14), mat, bx, 0.015, bz, { cast: false });
    };
    add(g, G.cyl(2.3, 2.3, 0.02, 48), mat, 0, 0.012, 0, { cast: false });
    for (const [id, b] of Object.entries(BUILDINGS)) {
      if (['walls', 'archery', 'watchtower'].includes(id)) continue;
      seg(0, 0, b.pos[0] * 0.78, b.pos[1] * 0.78, 0.45);
    }
    seg(0, 0, 0, VIEW_WALL_R + 2, 0.7);
    finalize(g);
    return g;
  }

  buildSelection() {
    this.selMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 64), this.selMat);
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.95, 1, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.visible = false;
    this.scene.add(this.selRing, this.hoverRing);
    const wallHit = new THREE.Mesh(new THREE.TorusGeometry(VIEW_WALL_R, 0.55, 6, 64), new THREE.MeshBasicMaterial({ visible: false }));
    wallHit.rotation.x = Math.PI / 2;
    wallHit.position.y = 0.5;
    wallHit.userData.pick = 'walls';
    this.scene.add(wallHit);
    this.hitboxes.push(wallHit);
  }

  buildVillagers() {
    this.spots = Object.entries(BUILDINGS).filter(([id]) => !['walls', 'watchtower', 'archery'].includes(id)).map(([, b]) => [b.pos[0] * 0.78, b.pos[1] * 0.78]);
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const shirt = new THREE.MeshStandardMaterial({ color: SHIRT[i % SHIRT.length], roughness: 0.8 });
      const skin = new THREE.MeshStandardMaterial({ color: SKIN[i % SKIN.length], roughness: 0.8 });
      add(g, G.cap(0.07, 0.12, 4, 8), shirt, 0, 0.14, 0);
      add(g, G.sph(0.065, 10, 8), skin, 0, 0.3, 0);
      g.scale.setScalar(1.3);
      const s = this.spots[i % this.spots.length];
      g.position.set(s[0], 0.02, s[1]);
      this.scene.add(g);
      this.people.push({ g, path: [], wait: Math.random() * 4, phase: Math.random() * 10 });
    }
  }

  sync(state) {
    for (const [id, def] of Object.entries(BUILDINGS)) {
      const lv = state.buildings[id]?.level ?? 0;
      if (id === 'walls') {
        if (this.wallsLevel !== lv) {
          if (this.walls) { this.scene.remove(this.walls); disposeGroup(this.walls); }
          this.walls = buildWalls(this.M, lv);
          this.scene.add(this.walls);
          this.wallsLevel = lv;
        }
        continue;
      }
      const key = `${id}:${lv}`;
      let e = this.buildings.get(id);
      if (e && e.key === key) continue;
      if (e) { this.scene.remove(e.group); disposeGroup(e.group); this.hitboxes = this.hitboxes.filter((x) => x !== e.hit); }
      const group = new THREE.Group();
      const model = buildBuilding(id, lv, this.M);
      group.add(model);
      const [x, z] = def.pos;
      group.position.set(x, 0, z);
      if (id !== 'archery' && id !== 'watchtower') model.rotation.y = Math.atan2(-x, -z);
      const fp = buildingFootprint(id);
      const hit = new THREE.Mesh(new THREE.BoxGeometry(fp * 2, id === 'archery' ? 7 : 2.4, fp * 2), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = id === 'archery' ? 3.5 : 1.2;
      hit.userData.pick = id;
      group.add(hit);
      this.hitboxes.push(hit);
      this.scene.add(group);
      for (const a of model.userData.anims) a.base = { y: a.obj.position.y, rot: a.obj.rotation.clone() };
      e = { key, group, model, hit };
      this.buildings.set(id, e);
    }
    if (this.selected) this.place(this.selected, this.selRing);
  }

  place(id, ring) {
    let x = 0, z = 0, r = 1;
    if (id === 'walls') r = VIEW_WALL_R + 0.35;
    else if (BUILDINGS[id]) { [x, z] = BUILDINGS[id].pos; r = buildingFootprint(id) + 0.2; }
    else { ring.visible = false; return; }
    ring.position.set(x, 0.05, z);
    ring.scale.setScalar(r);
    ring.visible = true;
  }

  select(id) {
    this.selected = id && BUILDINGS[id] ? id : null;
    if (this.selected) this.place(this.selected, this.selRing); else this.selRing.visible = false;
  }

  focus(id) {
    if (id === 'walls') return this.rig.focusOn(0, 2, 26);
    if (!BUILDINGS[id]) return;
    const [x, z] = BUILDINGS[id].pos;
    this.rig.focusOn(x, z, id === 'archery' ? 16 : 11);
  }

  frame(dt, state, ctx) {
    this.t += dt;
    const t = this.t * ctx.motion;
    const nf = this.light.update(dt, state, this.rig.camera, this.M);
    this.rig.update(dt);
    const fighting = !!state?.battle;
    for (const e of this.buildings.values()) {
      for (const a of e.model.userData.anims) {
        const o = a.obj;
        if (a.type === 'flutter') o.rotation.y = a.base.rot.y + Math.sin(t * a.speed) * 0.25;
        else if (a.type === 'archer') {
          const k = fighting ? Math.sin(t * 6 + a.phase) : Math.sin(t * 0.7 + a.phase) * 0.2;
          o.rotation.y = fighting ? Math.atan2(o.position.x, o.position.z) + k * 0.15 : a.base.rot.y + k;
        } else if (a.type === 'graze') o.rotation.y = Math.sin(t * 0.3) * 1.2;
      }
    }
    this.stepVillagers(dt * ctx.motion, nf);
    for (const c of this.light.sky.clouds) {
      if (!ctx.reducedMotion) c.userData.a += dt * c.userData.speed;
      c.position.x = Math.cos(c.userData.a) * c.userData.r;
      c.position.z = Math.sin(c.userData.a) * c.userData.r;
    }
    if (this.selRing.visible) this.selMat.opacity = 0.7 + Math.sin(this.t * 3) * (ctx.reducedFlashing ? 0 : 0.2);
    if (this.hovered && this.hovered !== this.selected && BUILDINGS[this.hovered]) this.place(this.hovered, this.hoverRing);
    else this.hoverRing.visible = false;
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
      // walk around the tower plaza, never through the tower
      const a0 = Math.atan2(g.position.z, g.position.x);
      const a1 = Math.atan2(s[1], s[0]);
      p.path = [[Math.cos(a0) * 2.0, Math.sin(a0) * 2.0], [Math.cos((a0 + a1) / 2) * 2.0, Math.sin((a0 + a1) / 2) * 2.0], [Math.cos(a1) * 2.0, Math.sin(a1) * 2.0], [s[0], s[1]]];
    }
  }
}
