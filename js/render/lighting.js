// Sky and lights for one scene, driven by the game's day and night.
import * as THREE from 'three';
import { buildSky } from './sky.js';

export function nightTarget(state) {
  if (!state) return 0;
  if (state.phase === 'night') return 1;
  const left = state.dayLength - state.phaseT;
  return left < 14 ? ((14 - left) / 14) * 0.8 : 0;
}

export class DayNight {
  constructor(scene, { shadowR = 20, fog = [60, 170] } = {}) {
    this.scene = scene;
    scene.fog = new THREE.Fog('#cfd8e0', fog[0], fog[1]);
    this.hemi = new THREE.HemisphereLight('#e4efff', '#6b5a48', 0.95);
    this.key = new THREE.DirectionalLight('#fff1dc', 2.4);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.03;
    Object.assign(this.key.shadow.camera, { left: -shadowR, right: shadowR, top: shadowR, bottom: -shadowR, near: 1, far: shadowR * 8 });
    this.shadowR = shadowR;
    scene.add(this.hemi, this.key, this.key.target);
    this.sky = buildSky('temperate');
    scene.add(this.sky.group);
    this.night = 0;
  }

  update(dt, state, camera, M, extra) {
    const target = nightTarget(state);
    this.night += (target - this.night) * Math.min(1, dt * (target > this.night ? 1.2 : 0.5));
    const nf = this.night;
    const p = state && state.phase === 'day' ? Math.min(1, state.phaseT / state.dayLength) : 1;
    const P = this.sky.palette;
    const u = this.sky.uniforms;
    const tmp = new THREE.Color();
    ['top', 'horizon', 'bottom'].forEach((key, i) => {
      tmp.copy(P.day[i]).lerp(P.dusk[i], Math.min(1, nf * 2)).lerp(P.night[i], Math.max(0, nf * 2 - 1));
      u[key].value.copy(tmp);
    });
    this.scene.fog.color.copy(u.horizon.value).lerp(u.bottom.value, 0.15);
    const ang = Math.PI * (0.2 + 0.6 * p);
    const elev = Math.max(0.15, Math.sin(ang)) * (1 - nf * 0.75);
    const k = this.shadowR * 2;
    const sun = new THREE.Vector3(Math.cos(ang) * k, elev * k * 1.1 + 4, k * 0.55);
    const moon = new THREE.Vector3(-k * 0.65, k, -k * 0.45);
    this.key.position.copy(nf > 0.6 ? moon : sun);
    this.key.intensity = nf > 0.6 ? 1.25 : 2.5 * (1 - nf) + 0.6;
    this.key.color.set(nf > 0.6 ? '#b4c2ff' : '#fff1dc').lerp(new THREE.Color('#ffae73'), nf <= 0.6 ? Math.min(1, nf * 1.6) * 0.7 : 0);
    this.hemi.intensity = 0.95 - 0.3 * nf;
    this.hemi.color.set('#e4efff').lerp(new THREE.Color('#7f8fd6'), nf);
    this.hemi.groundColor.set('#6b5a48').lerp(new THREE.Color('#3a3550'), nf);
    if (M) {
      M.window.emissiveIntensity = 0.12 + 1.9 * nf;
      M.torch.emissiveIntensity = 0.3 + 2.4 * nf;
      M.rune.emissiveIntensity = 0.5 + 1.8 * nf;
    }
    this.sky.starMat.opacity = 0.1 + 0.85 * nf;
    this.sky.cloudMat.color.set('#ffffff').lerp(new THREE.Color('#8e8fb8'), nf);
    this.sky.group.position.copy(camera.position).setY(0);
    this.sky.planet.rotation.y += dt * 0.01;
    extra?.(nf);
    return nf;
  }

  setShadows(on) { this.key.castShadow = on; }
}
