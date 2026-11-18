// Sky dome, stars, a ringed moon and drifting clouds.
import * as THREE from 'three';
import { G, add, finalize, seeded } from './kit.js';
import { BIOMES } from './world.js';

// Sky dome with a vertical gradient, stars, a ringed gas giant and soft clouds.
export function buildSky(biome) {
  const B = BIOMES[biome] || BIOMES.temperate;
  const group = new THREE.Group();
  const uniforms = { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() } };
  const skyMat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP;
      void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.85, h), 0.7)) : mix(horizon, bottom, pow(smoothstep(0.0, -0.7, h), 0.6));
      gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 20), skyMat);
  sky.renderOrder = -10;
  group.add(sky);

  const rnd = seeded(3);
  const starPos = [];
  for (let i = 0; i < 900; i++) {
    const u = rnd() * 2 - 1;
    const th = rnd() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    starPos.push(Math.cos(th) * s * 380, u * 380, Math.sin(th) * s * 380);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: '#fff7e8', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.5, depthWrite: false });
  const stars = new THREE.Points(sg, starMat);
  group.add(stars);

  // gas giant
  const planet = new THREE.Group();
  const pMat = new THREE.ShaderMaterial({
    uniforms: { a: { value: new THREE.Color(B.planet.a) }, b: { value: new THREE.Color(B.planet.b) }, light: { value: 1 } },
    vertexShader: 'varying vec3 vN; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: `uniform vec3 a; uniform vec3 b; uniform float light; varying vec3 vN; varying vec3 vP;
      void main(){ float band = sin(vP.y*0.55 + sin(vP.x*0.08)*1.5)*0.5+0.5; vec3 c = mix(a,b,band);
      float d = clamp(dot(vN, normalize(vec3(-0.6,0.3,0.7)))*0.9+0.25, 0.08, 1.0);
      float rim = pow(1.0 - abs(vN.z), 3.0);
      gl_FragColor = vec4(c*d*light + rim*0.15, 1.0); }`,
  });
  planet.add(new THREE.Mesh(new THREE.SphereGeometry(38, 48, 32), pMat));
  const ring = new THREE.Mesh(new THREE.RingGeometry(48, 70, 96), new THREE.MeshBasicMaterial({ color: B.planet.ring, side: THREE.DoubleSide, transparent: true, opacity: 0.32, depthWrite: false }));
  ring.rotation.x = Math.PI / 2.25;
  planet.add(ring);
  planet.position.set(-160, 70, -260);
  planet.rotation.z = 0.35;
  group.add(planet);

  // clouds: soft clusters drifting below and around the island
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.4, depthWrite: false });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    for (let k = 0; k < 5; k++) add(c, G.sph(1, 14, 10), cloudMat, (k - 2) * 1.1 + rnd() * 0.5, rnd() * 0.5, rnd() * 0.8, { scale: [1.3 + rnd(), 0.8 + rnd() * 0.5, 1.1 + rnd() * 0.5], cast: false });
    finalize(c);
    const a = rnd() * Math.PI * 2;
    const r = 48 + rnd() * 40;
    c.position.set(Math.cos(a) * r, -14 - rnd() * 18, Math.sin(a) * r);
    c.scale.setScalar(2 + rnd() * 2);
    c.userData = { a, r, speed: 0.004 + rnd() * 0.006 };
    clouds.push(c);
    group.add(c);
  }

  return {
    group, uniforms, stars, starMat, planet, pMat, clouds, cloudMat,
    palette: {
      day: B.sky.day.map((h) => new THREE.Color(h)),
      dusk: B.sky.dusk.map((h) => new THREE.Color(h)),
      night: B.sky.night.map((h) => new THREE.Color(h)),
    },
  };
}
