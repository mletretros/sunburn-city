import * as THREE from 'three';
import { CAMERA, LIGHT as L, PALETTE as C } from '../config.js';

export function buildSky(scene) {
  const upper = { value: new THREE.Color() }, horizon = { value: new THREE.Color() };
  const sun = new THREE.DirectionalLight(C.sun, 2.45);
  const fill = new THREE.HemisphereLight(C.fill, C.bounce, 1.72);
  const direction = new THREE.Vector3(), daylight = new THREE.Color(C.skyTop), dusk = new THREE.Color(C.skyDusk);
  const warm = new THREE.Color(C.sun), late = new THREE.Color(C.duskSun);
  scene.fog = new THREE.Fog(0xffd5b6, L.fogNear, L.fogFar);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(CAMERA.far * .82, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, uniforms: { upper, horizon, direction: { value: direction } },
    vertexShader: `varying vec3 ray; void main() { ray = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform vec3 upper; uniform vec3 horizon; uniform vec3 direction; varying vec3 ray;
    void main() {
      vec3 n = normalize(ray);
      float h = clamp(n.y * 1.4, 0., 1.);
      vec3 color = mix(horizon, upper, pow(h,.60));
      float hot = max(dot(n,direction),0.);
      color += vec3(.34,.18,.045) * pow(hot,16.) + vec3(1.,.66,.33) * smoothstep(.9994,.9997,hot);
      float cloud = sin(n.x * 23. + n.y * 105. + sin(n.z * 19.) * 1.7) * sin(n.x * 13. - n.z * 11.);
      color = mix(color,vec3(.98,.78,.64),smoothstep(.48,.96,cloud) * smoothstep(.015,.075,n.y) * (1.-smoothstep(.09,.34,n.y)) * .37);
      gl_FragColor = vec4(color, 1.);
      #include <colorspace_fragment>
    }`,
  }));
  sky.frustumCulled = false; sky.renderOrder = -10;
  scene.add(sky, sun, sun.target, fill);
  Object.assign(sun.shadow.camera, { left: -L.shadowRadius, right: L.shadowRadius, top: L.shadowRadius, bottom: -L.shadowRadius, near: 1, far: 270 });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -.00025; sun.shadow.normalBias = .14;
  let lastX = Infinity, lastZ = Infinity, amount = 0;
  function setTime(value) {
    amount = THREE.MathUtils.clamp(value, 0, 1);
    upper.value.copy(daylight).lerp(dusk, amount);
    horizon.value.set(C.skyHorizon).lerp(late, amount * .68);
    sun.color.copy(warm).lerp(late, amount);
    sun.intensity = 2.45 - amount * 1.03; fill.intensity = 1.72 - amount * .57;
    direction.set(L.sunX, L.sunY * (1 - amount * .78), L.sunZ).normalize();
    scene.fog.color.copy(horizon.value);
    lastX = Infinity;
  }
  setTime(0);
  return {
    setTime,
    quality(size) {
      sun.castShadow = !!size;
      if (size && sun.shadow.mapSize.x !== size) {
        sun.shadow.map?.dispose(); sun.shadow.map = null;
        sun.shadow.mapSize.set(size, size);
      }
    },
    update(camera, target) {
      sky.position.copy(camera.position);
      const x = Math.round(target.x / L.resnap) * L.resnap, z = Math.round(target.z / L.resnap) * L.resnap;
      if (lastX !== x || lastZ !== z) {
        lastX = x; lastZ = z;
        sun.target.position.set(x, 0, z);
        sun.position.set(x + L.sunX, L.sunY * (1 - amount * .78), z + L.sunZ);
      }
    },
  };
}
