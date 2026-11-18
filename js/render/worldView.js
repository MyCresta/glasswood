// World view: the wider land around the village, with neighbouring villages,
// ruins, dungeons and wild places. Expeditions set out from here.
import * as THREE from 'three';
import { G, add, finalize, seeded, disposeGroup } from './kit.js';
import { house, ruin, buildBuilding, buildWalls } from './models.js';
import { buildGround, buildForest, scatterForest, buildWater, PAL, noise2 } from './landscape.js';
import { DayNight } from './lighting.js';
import { CameraRig } from './rig.js';
import { LOCATIONS, RIVER, WORLD_LAKE, WORLD_R } from '../data/world.js';

function distToPolyline(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i];
    const [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}

function labelTexture(title, sub) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const x = c.getContext('2d');
  x.font = '48px "IM Fell English", Georgia, serif';
  const w = Math.max(x.measureText(title).width, 120) + 56;
  const left = (512 - w) / 2;
  const hgt = sub ? 104 : 68;
  const cut = 12;
  x.beginPath();
  x.moveTo(left + cut, 8); x.lineTo(left + w - cut, 8); x.lineTo(left + w, 8 + cut); x.lineTo(left + w, 8 + hgt - cut);
  x.lineTo(left + w - cut, 8 + hgt); x.lineTo(left + cut, 8 + hgt); x.lineTo(left, 8 + hgt - cut); x.lineTo(left, 8 + cut); x.closePath();
  x.fillStyle = 'rgba(20,22,24,0.86)';
  x.fill();
  x.strokeStyle = 'rgba(217,165,74,0.55)';
  x.lineWidth = 2;
  x.stroke();
  x.fillStyle = '#e8dcc2';
  x.textAlign = 'center';
  x.fillText(title, 256, 58);
  if (sub) { x.font = '28px "Alegreya Sans", system-ui, sans-serif'; x.fillStyle = '#b9a98a'; x.fillText(sub, 256, 98); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class WorldView {
  constructor(canvas, M, dot) {
    this.name = 'world';
    this.M = M;
    this.dot = dot;
    this.scene = new THREE.Scene();
    this.light = new DayNight(this.scene, { shadowR: 70, fog: [140, 380] });
    this.rig = new CameraRig(canvas, { fov: 36, min: 20, max: 230, limit: 80, maxPolar: 1.15, home: { target: new THREE.Vector3(0, 0, 8), dist: 150, polar: 0.78, az: 0.12 } });
    this.hitboxes = [];
    this.labels = [];
    this.selected = null;
    this.hovered = null;
    this.t = 0;
    this.buildLand();
    this.buildLocations();
    this.buildSelection();
  }

  buildLand() {
    const n2 = noise2(55);
    const coast = (x, z) => WORLD_R * (0.92 + 0.16 * n2(Math.atan2(z, x) * 1.6 + 9, 3.3)) - Math.hypot(x, z);
    const height = (x, z) => {
      const c = coast(x, z);
      if (c < 0) return Math.max(-6, c * 0.4) - 0.8;
      let y = 0.6 + n2(x * 0.04, z * 0.04) * 3 + n2(x * 0.12 + 5, z * 0.12) * 0.8;
      // mountains along the north
      const north = THREE.MathUtils.smoothstep(-z, 48, 80);
      y += north * (8 + Math.abs(n2(x * 0.08 + 20, z * 0.08) - 0.5) * 26);
      y *= THREE.MathUtils.smoothstep(c, 0, 8);
      const dr = distToPolyline(x, z, RIVER);
      if (dr < 4) y = Math.min(y, -0.5 + (dr / 4) * (y + 0.5));
      const dl = Math.hypot(x - WORLD_LAKE.x, z - WORLD_LAKE.z);
      if (dl < WORLD_LAKE.r + 3) y = Math.min(y, -0.6 + THREE.MathUtils.smoothstep(dl, WORLD_LAKE.r - 2, WORLD_LAKE.r + 3) * (y + 0.6));
      for (const l of LOCATIONS) if (Math.hypot(x - l.pos[0], z - l.pos[1]) < 5) y = THREE.MathUtils.lerp(Math.max(0.6, y), y, Math.hypot(x - l.pos[0], z - l.pos[1]) / 5);
      return y;
    };
    this.height = height;
    const grass = PAL.grass.map((c) => new THREE.Color(c));
    const sand = new THREE.Color('#8f8566');
    const rock = new THREE.Color('#6a655d');
    const snow = new THREE.Color('#c7ccd3');
    const seabed = new THREE.Color('#2b4552');
    this.scene.add(buildGround({
      radius: 230, rings: 90, segs: 240, height,
      color: (x, z, y, c) => {
        const n = n2(x * 0.1 + 30, z * 0.1);
        c.copy(grass[0]).lerp(grass[2], n);
        if (y < 1.2) c.lerp(sand, THREE.MathUtils.clamp((1.2 - y) / 1.0, 0, 1));
        if (y < -0.4) c.copy(seabed);
        if (y > 7) c.lerp(rock, Math.min(1, (y - 7) / 6));
        if (y > 18) c.lerp(snow, Math.min(1, (y - 18) / 4));
      },
    }));
    const sea = buildWater(new THREE.CircleGeometry(400, 64));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.3;
    this.scene.add(sea);
    // forest clusters on the lowlands
    const spots = scatterForest({
      seed: 17, rMin: 6, rMax: WORLD_R, count: 2600, height,
      avoid: (x, z) => {
        const y = height(x, z);
        if (y < 1.0 || y > 11) return true;
        if (LOCATIONS.some((l) => Math.hypot(x - l.pos[0], z - l.pos[1]) < (l.id === 'whispering' ? 2.5 : 6))) return true;
        return n2(x * 0.06 + 3, z * 0.06 + 3) < 0.48 && !(Math.hypot(x + 26, z + 16) < 12);
      },
      clump: 0, scale: [1.4, 2.6],
    });
    this.scene.add(buildForest(spots, { cast: false }));
    // dotted trails from home to each place
    const trail = new THREE.MeshBasicMaterial({ color: '#a88a5c', transparent: true, opacity: 0.7 });
    const dotGeo = new THREE.CircleGeometry(0.45, 10);
    dotGeo.rotateX(-Math.PI / 2);
    const pts = [];
    const rnd = seeded(3);
    for (const l of LOCATIONS) {
      if (l.id === 'home') continue;
      const [tx, tz] = l.pos;
      const len = Math.hypot(tx, tz);
      const bend = (rnd() - 0.5) * 0.35;
      for (let d = 6; d < len - 5; d += 2.2) {
        const k = d / len;
        const off = Math.sin(k * Math.PI) * bend * len;
        const x = tx * k + (-tz / len) * off;
        const z = tz * k + (tx / len) * off;
        pts.push([x, Math.max(0.05, height(x, z)) + 0.08, z]);
      }
    }
    const inst = new THREE.InstancedMesh(dotGeo, trail, pts.length);
    const m = new THREE.Matrix4();
    pts.forEach(([x, y, z], i) => { m.makeTranslation(x, y, z); inst.setMatrixAt(i, m); });
    this.scene.add(inst);
  }

  buildLocations() {
    const M = this.M;
    for (const l of LOCATIONS) {
      const [x, z] = l.pos;
      const g = new THREE.Group();
      g.position.set(x, Math.max(0.3, this.height(x, z)), z);
      const r = seeded(l.id.length * 97);
      if (l.kind === 'home') {
        const walls = buildWalls(M, 1);
        walls.scale.setScalar(0.42);
        g.add(walls);
        const tower = buildBuilding('archery', 3, M);
        tower.scale.setScalar(0.85);
        g.add(tower);
        for (let i = 0; i < 6; i++) house(g, M, { w: 0.9, d: 0.8, h: 0.5, x: Math.cos(i * 1.05) * 2.0, z: Math.sin(i * 1.05) * 2.0, ry: -i * 1.05 + Math.PI / 2, roof: i % 2 ? M.roofRed : M.roofThatch });
      } else if (l.kind === 'village') {
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + r();
          const d = 1.2 + r() * 2.4;
          house(g, M, { w: 1.0 + r() * 0.5, d: 0.9, h: 0.55 + r() * 0.3, x: Math.cos(a) * d, z: Math.sin(a) * d, ry: r() * 6, roof: [M.roofRed, M.roofThatch, M.roofSlate][i % 3], wall: i % 2 ? M.plaster : M.plasterWarm });
        }
        add(g, G.cyl(0.35, 0.38, 0.35, 14), M.stone, 0, 0.18, 0);
        add(g, G.cyl(0.03, 0.03, 1.4, 6), M.timber, 0.6, 0.7, 0.4);
        add(g, G.rbox(0.5, 0.32, 0.02, 0.01), M.roofSlate, 0.85, 1.25, 0.4);
      } else if (l.kind === 'ruins' && l.id === 'trollbridge') {
        add(g, G.rbox(10, 0.5, 2.2, 0.1), M.stone, 0, 1.4, 0, { rot: [0, 0.7, 0] });
        for (const s of [-1, 1]) add(g, G.rbox(1.4, 2.0, 2.4, 0.1), M.stoneDark, Math.cos(0.7) * s * 3, 0.5, -Math.sin(0.7) * s * 3, { rot: [0, 0.7, 0] });
        add(g, G.sph(0.7, 12, 10), M.stoneMoss, 1.2, 2.1, -0.4);
      } else if (l.kind === 'ruins') {
        const rr = ruin(M, l.id).g;
        rr.scale.setScalar(2.2);
        g.add(rr);
        if (l.id === 'watch') { add(g, G.cyl(0.9, 1.1, 4.5, 12), M.stone, 1.5, 2.0, -1, { rot: [0.25, 0, 0.15] }); add(g, G.cyl(1.0, 1.0, 0.4, 12), M.stoneMoss, 1.9, 4.1, -0.5, { rot: [0.3, 0, 0.2] }); }
        else { for (let i = 0; i < 5; i++) add(g, G.cyl(0.25, 0.3, 1.2 + r() * 2.2, 10), M.stone, Math.cos(i * 1.25) * 2.6, 0.9, Math.sin(i * 1.25) * 2.6); }
      } else if (l.kind === 'dungeon') {
        add(g, G.ico(2.6, 1), l.id === 'crystal' ? M.stoneDark : M.stoneMoss, 0, 0.4, -1.4, { scale: [1.2, 0.85, 1], rot: [0, r() * 3, 0] });
        for (const sx of [-1, 1]) add(g, G.rbox(0.5, 2.0, 0.6, 0.1), M.stone, sx * 1.15, 1.0, 1.3);
        add(g, G.rbox(2.9, 0.5, 0.7, 0.1), M.stone, 0, 2.15, 1.3);
        add(g, G.rbox(1.8, 1.8, 0.1, 0.1), M.portal, 0, 0.95, 1.45, { cast: false });
        if (l.id === 'crystal') for (let i = 0; i < 7; i++) add(g, G.cone(0.35, 2 + r() * 2, 5), M.rune, Math.cos(i) * 2.6, 1.2, Math.sin(i) * 2.2 - 0.5, { rot: [r() - 0.5, 0, r() - 0.5] });
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.dot, color: l.id === 'crystal' ? '#8fd8ff' : '#9d6bff', transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
        glow.position.set(0, 1.2, 1.9);
        glow.scale.set(3.5, 3.5, 1);
        g.add(glow);
      } else if (l.id === 'whispering') {
        for (let i = 0; i < 8; i++) add(g, G.rbox(0.4, 1.4 + r() * 0.6, 0.3, 0.06), M.stone, Math.cos((i / 8) * Math.PI * 2) * 2.0, 0.7, Math.sin((i / 8) * Math.PI * 2) * 2.0, { rot: [0, (i / 8) * Math.PI * 2, (r() - 0.5) * 0.2] });
      } else if (l.id === 'quarry') {
        add(g, G.cyl(3.2, 2.2, 0.6, 18), M.stoneDark, 0, -0.1, 0);
        for (let i = 0; i < 6; i++) add(g, G.ico(0.6 + r() * 0.5, 0), M.stone, Math.cos(i) * 3.6, 0.3, Math.sin(i) * 3.6);
        add(g, G.cyl(0.12, 0.12, 4, 6), M.timber, 2.8, 2, -1.5);
        add(g, G.rbox(3.5, 0.15, 0.15, 0.05), M.timber, 1.4, 3.9, -1.5);
      }
      finalize(g);
      this.scene.add(g);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 6, 12), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(x, g.position.y + 2, z);
      hit.userData.pick = `loc:${l.id}`;
      this.scene.add(hit);
      this.hitboxes.push(hit);
      const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(l.name || 'Home', l.kind === 'home' ? 'Your village' : l.difficulty ? `Danger ${l.difficulty} of 5` : 'Friendly'), depthTest: false, transparent: true }));
      lbl.position.set(x, g.position.y + 7.5, z);
      lbl.scale.set(16, 4, 1);
      lbl.renderOrder = 20;
      lbl.userData.id = l.id;
      this.scene.add(lbl);
      this.labels.push(lbl);
    }
  }

  buildSelection() {
    this.selMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.7, 64), this.selMat);
    this.selRing.rotation.x = -Math.PI / 2;
    this.selRing.visible = false;
    this.scene.add(this.selRing);
  }

  setHomeName(name) {
    const l = this.labels.find((x) => x.userData.id === 'home');
    if (!l || this.homeName === name) return;
    this.homeName = name;
    l.material.map.dispose();
    l.material.map = labelTexture(name, 'Your village');
    l.material.needsUpdate = true;
  }

  sync(state) { this.setHomeName(state.village.name); }

  select(id) {
    this.selected = id?.startsWith('loc:') ? id : null;
    const l = this.selected && LOCATIONS.find((x) => `loc:${x.id}` === this.selected);
    if (l) { this.selRing.position.set(l.pos[0], Math.max(0.3, this.height(...l.pos)) + 0.1, l.pos[1]); this.selRing.visible = true; } else this.selRing.visible = false;
  }

  focus(id) {
    const l = LOCATIONS.find((x) => `loc:${x.id}` === id);
    if (l) this.rig.focusOn(l.pos[0], l.pos[1], 60);
  }

  frame(dt, state, ctx) {
    this.t += dt;
    this.light.update(dt, state, this.rig.camera, this.M);
    this.rig.update(dt);
    const dist = this.rig.camera.position.distanceTo(this.rig.controls.target);
    for (const lbl of this.labels) {
      const k = THREE.MathUtils.clamp(dist / 150, 0.45, 1.4);
      lbl.scale.set(16 * k, 4 * k, 1);
    }
    for (const c of this.light.sky.clouds) {
      if (!ctx.reducedMotion) c.userData.a += dt * c.userData.speed;
      c.position.x = Math.cos(c.userData.a) * c.userData.r * 1.6;
      c.position.z = Math.sin(c.userData.a) * c.userData.r * 1.6;
    }
    if (this.selRing.visible) this.selMat.opacity = 0.7 + Math.sin(this.t * 3) * (ctx.reducedFlashing ? 0 : 0.2);
  }
}

export { disposeGroup };
