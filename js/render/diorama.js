// The colony diorama: scene, lighting, day/night, camera, buildings, colonists,
// picking and placement previews. Purely presentational; never changes rules.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { makeMaterials, G, add, disposeGroup } from './kit.js';
import { buildModel, buildScaffold, ghostOf } from './models.js';
import { buildIsland, buildPads, buildDecor, buildSky, PLOT, PAD_TOP, plotCenter } from './world.js';
import { PROFESSIONS } from '../data/people.js';

const DAY_LENGTH = 420; // seconds of real time for a full local day
const SKIN = ['#f3d2b5', '#e2b48c', '#c98e62', '#a46a43', '#7a4b2c', '#5a3622'];
const HAIR = ['#2b211c', '#5a3a22', '#a8743c', '#e0c27a', '#c4552f', '#d9d4cc', '#38404f'];

function badgeTexture(symbol, bg) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = 'rgba(30,26,24,0.85)';
  x.beginPath(); x.arc(64, 64, 54, 0, Math.PI * 2); x.fill();
  x.lineWidth = 8; x.strokeStyle = bg; x.stroke();
  x.fillStyle = bg;
  x.font = 'bold 64px system-ui, sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(symbol, 64, 68);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function softDot() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  return t;
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
    this.scene.fog = new THREE.Fog('#cfd8e0', 45, 140);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 900);

    this.hemi = new THREE.HemisphereLight('#dfefff', '#6b5a48', 0.9);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight('#fff1dc', 2.4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.03;
    this.key.shadow.radius = 3;
    this.scene.add(this.key, this.key.target);
    this.fill = new THREE.DirectionalLight('#9fb8ff', 0.25);
    this.fill.position.set(-20, 10, -15);
    this.scene.add(this.fill);

    this.M = makeMaterials(handlers.accent || '#7fd6c8');
    this.root = new THREE.Group();
    this.scene.add(this.root);
    this.sky = buildSky('temperate');
    this.scene.add(this.sky.group);

    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.09, screenSpacePanning: false,
      minDistance: 7, maxDistance: 44, minPolarAngle: 0.35, maxPolarAngle: 1.2,
      zoomSpeed: 0.9, rotateSpeed: 0.55, panSpeed: 0.9,
    });
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.addEventListener('change', () => this.clampTarget());

    this.badges = {
      unpowered: new THREE.SpriteMaterial({ map: badgeTexture('ϟ', '#f2d65c'), depthTest: false }),
      'storage full': new THREE.SpriteMaterial({ map: badgeTexture('▤', '#e8c6a0'), depthTest: false }),
      off: new THREE.SpriteMaterial({ map: badgeTexture('II', '#c8d3d8'), depthTest: false }),
      short: new THREE.SpriteMaterial({ map: badgeTexture('!', '#e6a640'), depthTest: false }),
    };
    this.dot = softDot();

    this.buildings = new Map(); // id → { group, model, key, hit, scaffold, badge }
    this.people = new Map();
    this.hitboxes = [];
    this.selected = null;
    this.hovered = null;
    this.placement = null;
    this.clock = new THREE.Clock();
    this.t = 0;
    this.dayT = DAY_LENGTH * 0.18;
    this.focusAnim = null;

    this.selRing = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.34, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }));
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(1.22, 1.3, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }));
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.visible = false;
    this.scene.add(this.selRing, this.hoverRing);

    this.initParticles();
    this.bindPointer();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  setAccent(color) { this.M.accent.color.set(color); this.selRing.material.color.set('#ffffff'); }

  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 1) : Math.min(dpr, 2));
    this.key.castShadow = q !== 'low';
    this.renderer.shadowMap.enabled = q !== 'low';
    this.motes.visible = q !== 'low' && !this.reducedMotion;
    this.sky.clouds.forEach((c) => (c.visible = q !== 'low'));
    this.resize();
    if (this.colony) this.rebuildDecor();
  }

  setMotion(reduced, flashing) {
    this.reducedMotion = reduced;
    this.reducedFlashing = flashing;
    this.motes.visible = this.quality !== 'low' && !reduced;
  }

  resize() {
    const el = this.canvas.parentElement;
    const w = el.clientWidth || 1;
    const h = el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ---------- colony scene ----------

  setColony(colony) {
    this.clearColony();
    this.colony = { id: colony.id, biome: colony.biome, grid: colony.grid };
    this.island = buildIsland(colony.biome, colony.grid, 7);
    this.root.add(this.island.mesh);
    this.pads = buildPads(colony.biome, colony.grid);
    this.root.add(this.pads);
    this.rebuildDecor();
    const c = this.island.center;
    this.home = { target: new THREE.Vector3(c.x, -0.6, c.z), dist: 30, polar: 1.0, az: 0.55 };
    this.resetCamera(true);
    // shadow camera fits the island
    const R = this.island.R + 2;
    Object.assign(this.key.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: 1, far: 120 });
    this.key.shadow.camera.updateProjectionMatrix();
    this.key.target.position.copy(c);
  }

  rebuildDecor() {
    if (this.decor) { this.root.remove(this.decor); disposeGroup(this.decor); }
    this.decor = buildDecor(this.colony.biome, this.island, this.quality, 11);
    this.root.add(this.decor);
  }

  clearColony() {
    for (const id of [...this.buildings.keys()]) this.removeBuilding(id);
    for (const id of [...this.people.keys()]) this.removePerson(id);
    for (const o of [this.island?.mesh, this.pads, this.decor]) if (o) { this.root.remove(o); o.geometry?.dispose?.(); }
    this.island = null;
  }

  removeBuilding(id) {
    const e = this.buildings.get(id);
    if (!e) return;
    this.root.remove(e.group);
    disposeGroup(e.group);
    this.hitboxes = this.hitboxes.filter((h) => h !== e.hit);
    this.buildings.delete(id);
  }

  // Called a few times a second with fresh simulation data.
  sync(colony, snap, opts = {}) {
    if (!this.colony || this.colony.id !== colony.id || this.colony.grid !== colony.grid) this.setColony(colony);
    const seen = new Set();
    const active = colony.queue[0];
    for (const b of colony.buildings) {
      seen.add(b.id);
      const constructing = b.level < 1;
      const key = `${b.type}:${constructing ? 1 : b.level}:${constructing ? 'c' : ''}:${b.upgrading ? 'u' : ''}`;
      let e = this.buildings.get(b.id);
      if (!e || e.key !== key) {
        if (e) this.removeBuilding(b.id);
        e = this.makeBuildingEntry(b, constructing, key);
      }
      const p = plotCenter(b.gx, b.gz);
      e.group.position.set(p.x, PAD_TOP, p.z);
      e.model.rotation.y = (b.rot || 0) * (Math.PI / 2);
      if (constructing) {
        const item = colony.queue.find((q) => q.bid === b.id);
        const prog = item ? Math.min(1, item.progress / item.duration) : 0;
        e.model.scale.set(0.96, 0.06 + 0.94 * prog, 0.96);
        e.scaffold.userData.working = active?.bid === b.id;
      } else if (e.scaffold) {
        e.scaffold.userData.working = active?.bid === b.id;
      }
      const info = snap.info[b.id];
      e.running = !!info && !['constructing', 'off', 'unpowered'].includes(info.status) && (colony.runtime[b.id]?.factor ?? 1) > 0;
      e.status = info?.status;
      const rt = colony.runtime[b.id];
      let badge = null;
      if (info?.status === 'unpowered') badge = 'unpowered';
      else if (info?.status === 'off') badge = 'off';
      else if (rt && rt.factor < 0.999 && rt.reason === 'storage full' && info?.status !== 'constructing') badge = 'storage full';
      else if (rt && rt.factor < 0.999 && rt.reason?.startsWith('short')) badge = 'short';
      if (badge !== e.badgeKind) {
        if (e.badge) { e.group.remove(e.badge); e.badge = null; }
        if (badge) {
          e.badge = new THREE.Sprite(this.badges[badge]);
          e.badge.scale.setScalar(0.55);
          e.badge.position.set(0, 2.3, 0);
          e.badge.renderOrder = 5;
          e.group.add(e.badge);
        }
        e.badgeKind = badge;
      }
    }
    for (const id of [...this.buildings.keys()]) if (!seen.has(id)) this.removeBuilding(id);
    if (this.selected && !this.buildings.has(this.selected)) this.select(null);
    this.updatePads(colony);
    this.syncPeople(colony, snap, opts.state);
    if (this.selected) {
      const e = this.buildings.get(this.selected);
      this.selRing.position.set(e.group.position.x, PAD_TOP + 0.02, e.group.position.z);
    }
  }

  makeBuildingEntry(b, constructing, key) {
    const group = new THREE.Group();
    const model = buildModel(b.type, constructing ? 1 : b.level, this.M);
    group.add(model);
    let scaffold = null;
    if (constructing || b.upgrading) {
      scaffold = buildScaffold(this.M, b.type === 'hq' ? 1.9 : 1.6);
      group.add(scaffold);
    }
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 2.2), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 1.2;
    hit.userData.bid = b.id;
    group.add(hit);
    this.hitboxes.push(hit);
    this.root.add(group);
    for (const a of model.userData.anims) {
      if (a.world) a.obj.rotation.order = 'YXZ';
      a.base = { y: a.obj.position.y, rot: a.obj.rotation.clone(), scale: a.obj.scale.clone() };
    }
    const e = { group, model, key, hit, scaffold, badge: null, badgeKind: null, running: true, smokeT: 0 };
    this.buildings.set(b.id, e);
    return e;
  }

  updatePads(colony) {
    if (!this.pads) return;
    const occupied = new Set(colony.buildings.map((b) => `${b.gx},${b.gz}`));
    const base = new THREE.Color('#b9b49c');
    const free = new THREE.Color('#a9e3d4');
    const target = new THREE.Color('#ffffff');
    this.pads.userData.keys.forEach(([gx, gz], i) => {
      let c = base;
      if (this.placement) {
        const isFree = !occupied.has(`${gx},${gz}`) || (this.placement.moving && this.placement.moving.gx === gx && this.placement.moving.gz === gz);
        c = isFree ? free : base;
        if (this.placement.plot && this.placement.plot.gx === gx && this.placement.plot.gz === gz) c = target;
      }
      this.pads.setColorAt(i, c);
    });
    this.pads.instanceColor.needsUpdate = true;
  }

  // ---------- colonists ----------

  personMesh(c) {
    const g = new THREE.Group();
    const body = new THREE.MeshStandardMaterial({ color: PROFESSIONS[c.profession]?.color || '#ccc', roughness: 0.7 });
    const skin = new THREE.MeshStandardMaterial({ color: SKIN[c.look?.skin ?? 0], roughness: 0.8 });
    const hair = new THREE.MeshStandardMaterial({ color: HAIR[c.look?.hair ?? 0], roughness: 0.8 });
    add(g, G.cap(0.085, 0.14, 4, 10), body, 0, 0.17, 0);
    add(g, G.sph(0.075, 12, 10), skin, 0, 0.35, 0);
    add(g, G.sph(0.078, 12, 8, Math.PI * 2, 0, Math.PI / 2), hair, 0, 0.36, -0.005);
    add(g, G.rbox(0.09, 0.1, 0.05, 0.02), this.M.wallCool, 0, 0.19, -0.08);
    g.scale.setScalar(1.25);
    g.userData.mats = [body, skin, hair];
    g.userData.prof = c.profession;
    return g;
  }

  removePerson(id) {
    const p = this.people.get(id);
    if (!p) return;
    this.root.remove(p.mesh);
    p.mesh.userData.mats.forEach((m) => m.dispose());
    this.people.delete(id);
  }

  syncPeople(colony, snap, state) {
    const seen = new Set();
    const hq = colony.buildings.find((b) => b.type === 'hq');
    const homes = colony.buildings.filter((b) => b.type === 'habitat' && b.level >= 1);
    const crowd = this.quality === 'low' ? 8 : 20;
    let n = 0;
    for (const c of snap.people) {
      if (n++ >= crowd) break;
      seen.add(c.id);
      let p = this.people.get(c.id);
      if (!p || p.mesh.userData.prof !== c.profession) {
        if (p) this.removePerson(c.id);
        const mesh = this.personMesh(c);
        const start = plotCenter(hq.gx, hq.gz);
        mesh.position.set(start.x + (Math.random() - 0.5), PAD_TOP, start.z + 1.1);
        this.root.add(mesh);
        p = { mesh, path: [], wait: Math.random() * 3, phase: Math.random() * 10, mode: 'idle' };
        this.people.set(c.id, p);
      }
      let work = hq;
      if (c.assign?.kind === 'building') work = colony.buildings.find((b) => b.id === c.assign.bid) || hq;
      else if (c.assign?.kind === 'support') work = colony.buildings.find((b) => b.id === colony.queue[0]?.bid) || hq;
      const home = homes.length ? homes[Math.abs(hashStr(c.id)) % homes.length] : hq;
      p.work = work; p.home = home; p.hq = hq; p.relief = !c.assign;
      p.followed = this.followId === c.id;
    }
    for (const id of [...this.people.keys()]) if (!seen.has(id)) this.removePerson(id);
  }

  door(b) {
    const p = plotCenter(b.gx, b.gz);
    return new THREE.Vector3(p.x + 0.1, PAD_TOP, p.z + 1.08);
  }

  routeTo(p, b) {
    const from = p.mesh.position.clone();
    const to = this.door(b);
    const jitter = (Math.random() - 0.5) * 0.4;
    to.x += jitter;
    const laneZa = Math.round((from.z - 1.3) / PLOT) * PLOT + PLOT / 2;
    const laneX = to.x + PLOT / 2 - 0.15;
    p.path = [
      new THREE.Vector3(from.x, PAD_TOP, laneZa),
      new THREE.Vector3(laneX, PAD_TOP, laneZa),
      new THREE.Vector3(laneX, PAD_TOP, to.z),
      to,
    ];
  }

  stepPeople(dt) {
    for (const p of this.people.values()) {
      const m = p.mesh;
      if (p.path.length) {
        const target = p.path[0];
        const d = target.clone().sub(m.position);
        d.y = 0;
        const len = d.length();
        const step = 0.9 * dt;
        if (len <= step) { m.position.x = target.x; m.position.z = target.z; p.path.shift(); }
        else {
          d.multiplyScalar(step / len);
          m.position.add(d);
          m.rotation.y = Math.atan2(d.x, d.z);
        }
        p.phase += dt * 10;
        m.position.y = PAD_TOP + Math.abs(Math.sin(p.phase)) * 0.035;
        if (!p.path.length) { p.wait = p.mode === 'work' ? 8 + Math.random() * 10 : 3 + Math.random() * 5; m.rotation.y = Math.PI; }
        continue;
      }
      p.wait -= dt;
      p.phase += dt * 3;
      m.position.y = PAD_TOP + (p.mode === 'work' ? Math.abs(Math.sin(p.phase * 2)) * 0.02 : 0);
      if (p.mode === 'work') m.rotation.y = Math.PI + Math.sin(p.phase) * 0.6;
      if (p.wait > 0 || !p.work) continue;
      // choose the next errand
      if (p.mode !== 'work') { p.mode = 'work'; this.routeTo(p, p.relief ? p.hq : p.work); }
      else { p.mode = 'rest'; this.routeTo(p, Math.random() < 0.6 ? p.home : p.hq); }
    }
  }

  // ---------- particles ----------

  initParticles() {
    const N = 140;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 22; pos[i * 3 + 1] = Math.random() * 4 + 0.3; pos[i * 3 + 2] = (Math.random() - 0.5) * 22; }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.motesBase = pos.slice();
    this.moteMat = new THREE.PointsMaterial({ map: this.dot, color: '#fff3c4', size: 0.12, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
    this.motes = new THREE.Points(g, this.moteMat);
    this.scene.add(this.motes);
    this.smokeMat = new THREE.SpriteMaterial({ map: this.dot, color: '#e9e4dc', transparent: true, opacity: 0.4, depthWrite: false });
    this.smoke = [];
  }

  stepParticles(dt, night) {
    if (this.motes.visible) {
      const a = this.motes.geometry.attributes.position;
      const c = this.island?.center || new THREE.Vector3();
      for (let i = 0; i < a.count; i++) {
        const bx = this.motesBase[i * 3], by = this.motesBase[i * 3 + 1], bz = this.motesBase[i * 3 + 2];
        a.setXYZ(i, c.x + bx + Math.sin(this.t * 0.3 + i) * 0.4, by + Math.sin(this.t * 0.5 + i * 1.7) * 0.25, c.z + bz + Math.cos(this.t * 0.25 + i * 0.7) * 0.4);
      }
      a.needsUpdate = true;
      this.moteMat.color.set(night > 0.5 ? '#c9ff9a' : '#fff3c4');
      this.moteMat.opacity = 0.25 + night * 0.6;
      this.moteMat.size = 0.08 + night * 0.08;
    }
    // smoke from running refineries
    if (!this.reducedMotion) {
      for (const e of this.buildings.values()) {
        const sp = e.model.userData.smoke;
        if (!sp || !e.running) continue;
        e.smokeT -= dt;
        if (e.smokeT <= 0 && this.smoke.length < 40) {
          e.smokeT = 0.35;
          const s = new THREE.Sprite(this.smokeMat.clone());
          const wp = sp.clone().applyMatrix4(e.model.matrixWorld);
          s.position.copy(wp);
          s.scale.setScalar(0.15);
          s.userData.life = 0;
          this.scene.add(s);
          this.smoke.push(s);
        }
      }
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.userData.life += dt;
      const l = s.userData.life / 3.2;
      s.position.y += dt * 0.45;
      s.position.x += dt * 0.12;
      s.scale.setScalar(0.15 + l * 0.6);
      s.material.opacity = 0.35 * (1 - l);
      if (l >= 1) { this.scene.remove(s); s.material.dispose(); this.smoke.splice(i, 1); }
    }
  }

  // ---------- day / night ----------

  stepSky(dt) {
    this.dayT += dt;
    const phase = (this.dayT % DAY_LENGTH) / DAY_LENGTH;
    const ang = phase * Math.PI * 2;
    const elev = Math.sin(ang);
    const day = THREE.MathUtils.smoothstep(elev, -0.12, 0.3);
    const dusk = Math.max(0, 1 - Math.abs(elev) / 0.32) ;
    const P = this.sky.palette;
    const u = this.sky.uniforms;
    const tmp = new THREE.Color();
    ['top', 'horizon', 'bottom'].forEach((k, i) => {
      tmp.copy(P.night[i]).lerp(P.day[i], day);
      tmp.lerp(P.dusk[i], dusk * 0.65);
      u[k].value.copy(tmp);
    });
    this.scene.fog.color.copy(u.horizon.value).lerp(u.bottom.value, 0.25);
    const c = this.island?.center || new THREE.Vector3();
    const sun = new THREE.Vector3(Math.cos(ang) * 30, Math.max(elev, 0.05) * 35, 18);
    const moon = new THREE.Vector3(-Math.cos(ang) * 25, Math.max(-elev, 0.1) * 30, -14);
    const useSun = elev > -0.05;
    this.key.position.copy(c).add(useSun ? sun : moon);
    this.key.intensity = useSun ? 0.4 + 2.2 * day : 0.45;
    this.key.color.set(useSun ? '#fff1dc' : '#9fb4ff').lerp(new THREE.Color('#ffb27a'), useSun ? dusk * 0.6 : 0);
    this.hemi.intensity = 0.35 + 0.6 * day;
    this.hemi.color.set('#dfefff').lerp(new THREE.Color('#5d6aa8'), 1 - day);
    const night = 1 - day;
    this.M.window.emissiveIntensity = 0.15 + 1.7 * night;
    this.M.growLight.emissiveIntensity = 0.45 + 1.5 * night;
    this.sky.starMat.opacity = 0.18 + 0.75 * night;
    this.sky.cloudMat.color.set('#ffffff').lerp(new THREE.Color('#8e8fb8'), night);
    this.sky.cloudMat.color.lerp(new THREE.Color('#ffc59a'), dusk * 0.5);
    this.sunDir = sun.clone().normalize();
    this.night = night;
    return night;
  }

  // ---------- camera ----------

  clampTarget() {
    if (!this.island) return;
    const t = this.controls.target;
    const c = this.island.center;
    const lim = this.island.half + 2.5;
    const nx = THREE.MathUtils.clamp(t.x, c.x - lim, c.x + lim);
    const nz = THREE.MathUtils.clamp(t.z, c.z - lim, c.z + lim);
    if (nx !== t.x || nz !== t.z) {
      const dx = nx - t.x, dz = nz - t.z;
      t.x = nx; t.z = nz;
      this.camera.position.x += dx; this.camera.position.z += dz;
    }
  }

  setView(target, dist, polar, az, instant) {
    const end = { target: target.clone(), dist, polar, az };
    if (instant || this.reducedMotion) { this.applyView(end); this.focusAnim = null; return; }
    const off = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    this.focusAnim = { t: 0, from: { target: this.controls.target.clone(), dist: sph.radius, polar: sph.phi, az: sph.theta }, to: end };
  }

  applyView(v) {
    this.controls.target.copy(v.target);
    const off = new THREE.Vector3().setFromSpherical(new THREE.Spherical(v.dist, v.polar, v.az));
    this.camera.position.copy(v.target).add(off);
    this.controls.update();
  }

  resetCamera(instant = false) {
    const h = this.home;
    if (h) this.setView(h.target, h.dist, h.polar, h.az, instant);
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

  rotateBy(angle) {
    const off = this.camera.position.clone().sub(this.controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
  }

  zoomBy(f) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const len = THREE.MathUtils.clamp(off.length() * f, this.controls.minDistance, this.controls.maxDistance);
    off.setLength(len);
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
  }

  focusBuilding(bid) {
    const e = this.buildings.get(bid);
    if (!e) return;
    const off = this.camera.position.clone().sub(this.controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    this.setView(new THREE.Vector3(e.group.position.x, 0.6, e.group.position.z), 10, Math.min(sph.phi, 1.0), sph.theta);
  }

  // ---------- picking ----------

  bindPointer() {
    const el = this.canvas;
    let down = null;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const toNdc = (e) => {
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
    };
    this.pickAt = (e) => {
      toNdc(e);
      const hit = ray.intersectObjects(this.hitboxes, false)[0];
      return hit ? hit.object.userData.bid : null;
    };
    this.plotAt = (e) => {
      toNdc(e);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PAD_TOP);
      const p = new THREE.Vector3();
      if (!ray.ray.intersectPlane(plane, p)) return null;
      return { gx: Math.round(p.x / PLOT), gz: Math.round(p.z / PLOT) };
    };
    el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      const quick = performance.now() - down.t < 600;
      down = null;
      if (moved > 7 || !quick || e.button === 2) return;
      if (this.placement) {
        const plot = this.plotAt(e);
        if (plot) this.h.onPlot?.(plot, e.pointerType);
        return;
      }
      const bid = this.pickAt(e);
      this.h.onSelect?.(bid);
    });
    let last = 0;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse' || down) return;
      const now = performance.now();
      if (now - last < 50) return;
      last = now;
      if (this.placement) {
        const plot = this.plotAt(e);
        this.h.onPlotHover?.(plot);
        return;
      }
      const bid = this.pickAt(e);
      if (bid !== this.hovered) {
        this.hovered = bid;
        el.style.cursor = bid ? 'pointer' : '';
        this.h.onHover?.(bid, e);
      }
    });
    el.addEventListener('pointerleave', () => { this.hovered = null; this.h.onHover?.(null); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  select(bid) {
    this.selected = bid;
    const e = bid && this.buildings.get(bid);
    this.selRing.visible = !!e;
    if (e) this.selRing.position.set(e.group.position.x, PAD_TOP + 0.02, e.group.position.z);
  }

  // Placement preview: type to build, or `moving` building.
  startPlacement({ type, level = 1, moving = null }) {
    this.endPlacement();
    this.placement = { type, level, moving, plot: null, ghost: null, valid: false };
  }

  previewPlot(plot, valid) {
    const pl = this.placement;
    if (!pl) return;
    pl.plot = plot;
    if (pl.ghost) { this.root.remove(pl.ghost); disposeGroup(pl.ghost); pl.ghost = null; }
    if (plot) {
      pl.ghost = ghostOf(buildModel(pl.type, pl.level, this.M), valid);
      const p = plotCenter(plot.gx, plot.gz);
      pl.ghost.position.set(p.x, PAD_TOP + 0.01, p.z);
      this.root.add(pl.ghost);
    }
  }

  endPlacement() {
    if (this.placement?.ghost) { this.root.remove(this.placement.ghost); disposeGroup(this.placement.ghost); }
    this.placement = null;
  }

  screenPos(bid) {
    const e = this.buildings.get(bid);
    if (!e) return null;
    const v = e.group.position.clone();
    v.y += 2.2;
    v.project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
  }

  // ---------- frame ----------

  frame() {
    const dt = Math.min(0.1, this.clock.getDelta());
    this.t += dt;
    const night = this.stepSky(dt);
    if (this.focusAnim) {
      const f = this.focusAnim;
      f.t = Math.min(1, f.t + dt / 0.6);
      const k = 1 - (1 - f.t) ** 3;
      this.applyView({
        target: f.from.target.clone().lerp(f.to.target, k),
        dist: THREE.MathUtils.lerp(f.from.dist, f.to.dist, k),
        polar: THREE.MathUtils.lerp(f.from.polar, f.to.polar, k),
        az: f.from.az + (((f.to.az - f.from.az + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k,
      });
      if (f.t >= 1) this.focusAnim = null;
    }
    this.controls.update();
    const speed = this.reducedMotion ? 0.35 : 1;
    const t = this.t * speed;
    for (const e of this.buildings.values()) {
      for (const a of e.model.userData.anims) {
        const on = e.running || a.type === 'blink' || a.type === 'flutter' || a.type === 'track';
        if (!on) continue;
        const o = a.obj;
        switch (a.type) {
          case 'spin': o.rotation[a.axis] += dt * a.speed * speed; break;
          case 'drill': o.rotation.y += dt * a.speed * speed; o.position.y = a.base.y + Math.sin(t * 2) * 0.06; break;
          case 'blink': o.visible = this.reducedFlashing ? true : Math.sin(this.t * a.speed * Math.PI * 2) > -0.2; break;
          case 'flutter': o.rotation.y = a.base.rot.y + Math.sin(t * a.speed) * 0.25; break;
          case 'pulse': o.scale.setScalar(1 + Math.sin(t * a.speed) * (this.reducedFlashing ? 0.04 : 0.14)); break;
          case 'flame': o.scale.set(1, 1 + Math.sin(t * a.speed) * 0.25 + Math.sin(t * a.speed * 2.3) * 0.12, 1); break;
          case 'sway': o.rotation.y = Math.sin(t * a.speed) * 0.9; break;
          case 'track': {
            const s = this.sunDir || new THREE.Vector3(0, 1, 0);
            const tilt = night > 0.7 ? 0 : Math.atan2(s.x, s.y) * 0.45;
            o.rotation.z += (-tilt - o.rotation.z) * Math.min(1, dt * 0.8);
            o.rotation.x = 0.18;
            break;
          }
          default: break;
        }
      }
      if (e.scaffold && e.scaffold.userData.working) {
        for (const a of e.scaffold.userData.anims) a.obj.rotation.y = Math.sin(t * 0.6) * 1.1;
      }
      if (e.badge) e.badge.position.y = 2.3 + Math.sin(this.t * 2) * (this.reducedMotion ? 0 : 0.05);
    }
    for (const c of this.sky.clouds) {
      if (!this.reducedMotion) c.userData.a += dt * c.userData.speed;
      c.position.x = (this.island?.center.x || 0) + Math.cos(c.userData.a) * c.userData.r;
      c.position.z = (this.island?.center.z || 0) + Math.sin(c.userData.a) * c.userData.r;
    }
    this.sky.group.position.copy(this.camera.position).setY(0);
    this.sky.planet.rotation.y += dt * 0.01;
    this.stepPeople(dt * (this.reducedMotion ? 0.7 : 1));
    this.stepParticles(dt, night);
    if (this.selRing.visible) this.selRing.material.opacity = 0.65 + Math.sin(this.t * 3) * (this.reducedFlashing ? 0 : 0.25);
    if (this.hovered && this.hovered !== this.selected) {
      const e = this.buildings.get(this.hovered);
      if (e) { this.hoverRing.visible = true; this.hoverRing.position.set(e.group.position.x, PAD_TOP + 0.015, e.group.position.z); }
    } else this.hoverRing.visible = false;
    if (this.followId) {
      const p = this.people.get(this.followId);
      if (p) {
        const d = p.mesh.position.clone().setY(0.4).sub(this.controls.target);
        this.controls.target.add(d.multiplyScalar(Math.min(1, dt * 3)));
        this.camera.position.add(d);
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  follow(colonistId) {
    this.followId = colonistId;
    if (colonistId) this.zoomBy(0.55);
  }
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
