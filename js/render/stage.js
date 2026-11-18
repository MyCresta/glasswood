// One renderer, three views. Handles switching, picking, resizing and quality.
import * as THREE from 'three';
import { makeMaterials } from './kit.js';
import { LandView } from './landView.js';
import { WorldView } from './worldView.js';

export const VIEWS = ['village', 'defense', 'world'];

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

export class Stage {
  constructor(canvas, handlers = {}) {
    this.canvas = canvas;
    this.h = handlers;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.M = makeMaterials(handlers.accent || '#f0a86b');
    this.dot = dotTexture();
    this.views = {};
    this.active = null;
    this.quality = 'high';
    this.reducedMotion = false;
    this.reducedFlashing = false;
    this.clock = new THREE.Clock();
    this.selected = null;
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
    this.switchTo('village', { instant: true });
  }

  view(name) {
    if (!this.views[name]) {
      let v;
      if (name === 'world') v = new WorldView(this.canvas, this.M, this.dot);
      else {
        this.land ||= new LandView(this.canvas, this.M, this.dot);
        v = this.land.views[name];
      }
      this.views[name] = v;
      v.rig.reducedMotion = this.reducedMotion;
      v.light.setShadows(this.quality !== 'low');
      if (this.state) v.sync(this.state);
      this.sizeView(v);
      v.rig.reset(true);
      if (this.selected) v.select(this.selected);
    }
    return this.views[name];
  }

  get current() { return this.views[this.active]; }

  switchTo(name, { instant = false } = {}) {
    if (this.active === name) return;
    const v = this.view(name);
    for (const o of Object.values(this.views)) o.rig.controls.enabled = o === v;
    if (name !== 'world' && this.land && this.state?.battle) this.land.seenFx = this.state.battle.fxId;
    this.active = name;
    const stage = this.canvas.parentElement;
    if (!instant && !this.reducedMotion) {
      stage.classList.remove('view-in');
      void stage.offsetWidth;
      stage.classList.add('view-in');
    }
    this.h.onView?.(name);
  }

  sizeView(v) {
    const el = this.canvas.parentElement;
    v.rig.setAspect((el.clientWidth || 1) / (el.clientHeight || 1));
  }

  resize() {
    const el = this.canvas.parentElement;
    this.renderer.setSize(el.clientWidth || 1, el.clientHeight || 1, false);
    for (const v of Object.values(this.views)) this.sizeView(v);
  }

  setQuality(q) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 1) : Math.min(dpr, 2));
    this.renderer.shadowMap.enabled = q !== 'low';
    for (const v of Object.values(this.views)) {
      v.light.setShadows(q !== 'low');
      v.light.sky.clouds.forEach((c) => (c.visible = q !== 'low'));
    }
    this.resize();
  }

  setMotion(reduced, flashing) {
    this.reducedMotion = reduced;
    this.reducedFlashing = flashing;
    for (const v of Object.values(this.views)) v.rig.reducedMotion = reduced;
  }

  setAccent(c) {
    this.M.accent.color.set(c);
    this.land?.views.defense.setAccent(c);
  }

  sync(state) {
    this.state = state;
    for (const v of Object.values(this.views)) v.sync(state);
  }

  select(id) {
    this.selected = id;
    for (const v of Object.values(this.views)) v.select(id);
  }

  focus(id) { this.current.focus(id); }
  resetCamera() { this.current.rig.reset(); }
  panBy(r, f) { this.current.rig.pan(r, f); }
  rotateBy(a) { this.current.rig.rotate(a); }
  zoomBy(f) { this.current.rig.zoom(f); }

  bindPointer() {
    const el = this.canvas;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;
    this.pickAt = (e) => {
      const v = this.current;
      const r = el.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, v.rig.camera);
      const hit = ray.intersectObjects(v.hitboxes, false)[0];
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
      if (this.current.hovered !== id) {
        this.current.hovered = id;
        el.style.cursor = id ? 'pointer' : '';
      }
      this.h.onHover?.(id, e);
    });
    el.addEventListener('pointerleave', () => { if (this.current) this.current.hovered = null; this.h.onHover?.(null); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  frame(state, alpha = 1) {
    const dt = Math.min(0.1, this.clock.getDelta());
    const v = this.current;
    v.frame(dt, state, {
      alpha, active: true, motion: this.reducedMotion ? 0.4 : 1,
      reducedMotion: this.reducedMotion, reducedFlashing: this.reducedFlashing, onFx: this.h.onFx,
    });
    this.renderer.render(v.scene, v.rig.camera);
  }
}
