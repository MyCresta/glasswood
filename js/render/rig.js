// A camera with orbit controls and helpers for pan, rotate, zoom and smooth moves.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraRig {
  constructor(canvas, { fov = 36, min = 6, max = 60, minPolar = 0.25, maxPolar = 1.2, limit = 20, home }) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 1200);
    this.baseFov = fov;
    this.limit = limit;
    this.home = home;
    this.portraitHome = null;
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, {
      enableDamping: true, dampingFactor: 0.09, screenSpacePanning: false,
      minDistance: min, maxDistance: max, minPolarAngle: minPolar, maxPolarAngle: maxPolar,
      zoomSpeed: 0.9, rotateSpeed: 0.55, panSpeed: 0.9,
    });
    this.controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    this.controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    this.controls.addEventListener('change', () => this.clamp());
    this.controls.enabled = false;
    this.reducedMotion = false;
    this.anim = null;
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 1 ? this.baseFov + 14 : this.baseFov;
    this.camera.updateProjectionMatrix();
    this.portrait = aspect < 1;
  }

  homeView() {
    const h = this.home;
    if (!this.portrait) return h;
    return { ...h, dist: h.dist * Math.min(1.35, 0.62 / Math.max(0.4, this.camera.aspect)), target: h.target.clone().add(new THREE.Vector3(0, 0, h.dist * 0.08)) };
  }

  clamp() {
    const t = this.controls.target;
    const d = Math.hypot(t.x, t.z);
    if (d > this.limit) {
      const k = this.limit / d;
      const dx = t.x * k - t.x, dz = t.z * k - t.z;
      t.x += dx; t.z += dz;
      this.camera.position.x += dx; this.camera.position.z += dz;
    }
  }

  apply(v) {
    this.controls.target.copy(v.target);
    this.camera.position.copy(v.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(v.dist, v.polar, v.az)));
    this.controls.update();
  }

  setView(target, dist, polar, az, instant = false) {
    const end = { target: target.clone(), dist, polar, az };
    if (instant || this.reducedMotion) { this.apply(end); this.anim = null; return; }
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    this.anim = { t: 0, from: { target: this.controls.target.clone(), dist: sph.radius, polar: sph.phi, az: sph.theta }, to: end };
  }

  reset(instant = false) {
    const h = this.homeView();
    this.setView(h.target, h.dist, h.polar, h.az, instant);
  }

  focusOn(x, z, dist) {
    const sph = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    this.setView(new THREE.Vector3(x, 0.4, z), dist, Math.min(sph.phi, 1.0), sph.theta);
  }

  pan(right, forward) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    dir.y = 0; dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const scale = Math.max(1, this.camera.position.distanceTo(this.controls.target) / 25);
    const move = side.multiplyScalar(right * scale).add(dir.multiplyScalar(forward * scale));
    this.controls.target.add(move);
    this.camera.position.add(move);
    this.clamp();
    this.controls.update();
  }

  rotate(a) {
    const off = this.camera.position.clone().sub(this.controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
  }

  zoom(f) {
    const off = this.camera.position.clone().sub(this.controls.target);
    off.setLength(THREE.MathUtils.clamp(off.length() * f, this.controls.minDistance, this.controls.maxDistance));
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
  }

  update(dt) {
    if (this.anim) {
      const f = this.anim;
      f.t = Math.min(1, f.t + dt / 0.6);
      const k = 1 - (1 - f.t) ** 3;
      this.apply({
        target: f.from.target.clone().lerp(f.to.target, k),
        dist: THREE.MathUtils.lerp(f.from.dist, f.to.dist, k),
        polar: THREE.MathUtils.lerp(f.from.polar, f.to.polar, k),
        az: f.from.az + (((f.to.az - f.from.az + Math.PI * 3) % (Math.PI * 2)) - Math.PI) * k,
      });
      if (f.t >= 1) this.anim = null;
    }
    this.controls.update();
  }
}
