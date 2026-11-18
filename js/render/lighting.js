// Sky and lights for one scene, driven by the game's day and night.
// Overcast twilight by day, cold moonlight by night.
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
    scene.fog = new THREE.Fog('#7d8590', fog[0], fog[1]);
    this.fogRange = fog;
    this.hemi = new THREE.HemisphereLight('#a9b6c8', '#3a3328', 0.75);
    this.key = new THREE.DirectionalLight('#ffd9a8', 1.8);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.bias = -0.0005;
    this.key.shadow.normalBias = 0.02;
    this.setShadowArea(new THREE.Vector3(), shadowR);
    scene.add(this.hemi, this.key, this.key.target);
    this.sky = buildSky('temperate');
    scene.add(this.sky.group);
    this.night = 0;
  }

  setShadowArea(center, r) {
    this.center = center.clone();
    this.shadowR = r;
    Object.assign(this.key.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 0.5, far: r * 8 });
    this.key.shadow.camera.updateProjectionMatrix();
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
    this.scene.fog.color.copy(u.horizon.value).lerp(u.bottom.value, 0.35);
    // a low sun that never climbs high: long shadows all day
    const ang = Math.PI * (0.18 + 0.64 * p);
    const k = this.shadowR * 2.2;
    const elev = (0.42 + Math.sin(ang) * 0.25) * (1 - nf * 0.6);
    const sun = new THREE.Vector3(Math.cos(ang) * k, elev * k + 1, k * 0.5);
    const moon = new THREE.Vector3(-k * 0.6, k * 0.9, -k * 0.4);
    this.key.position.copy(this.center).add(nf > 0.6 ? moon : sun);
    this.key.target.position.copy(this.center);
    this.key.intensity = nf > 0.6 ? 1.35 : 1.9 * (1 - nf) + 0.55;
    this.key.color.set(nf > 0.6 ? '#9fb2ff' : '#ffd9a8').lerp(new THREE.Color('#ff9a62'), nf <= 0.6 ? Math.min(1, nf * 1.6) * 0.8 : 0);
    this.hemi.intensity = 0.8 - 0.12 * nf;
    this.hemi.color.set('#a9b6c8').lerp(new THREE.Color('#6a7bb8'), nf);
    this.hemi.groundColor.set('#3a3328').lerp(new THREE.Color('#2a2838'), nf);
    if (M) {
      M.window.emissiveIntensity = 0.5 + 1.8 * nf;
      M.torch.emissiveIntensity = 0.8 + 2.2 * nf;
      M.rune.emissiveIntensity = 0.8 + 1.8 * nf;
    }
    this.sky.starMat.opacity = 0.05 + 0.85 * nf;
    this.sky.cloudMat.color.set('#9aa3ad').lerp(new THREE.Color('#3c3f5a'), nf);
    this.sky.group.position.copy(camera.position).setY(0);
    this.sky.planet.rotation.y += dt * 0.01;
    extra?.(nf);
    return nf;
  }

  setShadows(on) { this.key.castShadow = on; }
}
