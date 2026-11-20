import { Color, Vector3, DirectionalLight, HemisphereLight, Fog, Mesh, SphereGeometry, ShaderMaterial, BackSide, MathUtils } from 'three';
import { CAMERA, LIGHT, PALETTE } from '../config.js';
const vertexShader = `varying vec3 sightline;void main(){sightline=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
const fragmentShader = `uniform vec3 zenith,horizon,sunlight;varying vec3 sightline;
void main(){
 vec3 ray=normalize(sightline);float elevation=clamp(ray.y*1.4,0.0,1.0);
 vec3 sky=mix(horizon,zenith,pow(elevation,.60));float angle=max(dot(ray,sunlight),0.0);
 sky+=vec3(.34,.18,.045)*pow(angle,16.0)+vec3(1.0,.66,.33)*smoothstep(.9994,.9997,angle);
 float cloud=sin(ray.x*23.0+ray.y*105.0+sin(ray.z*19.0)*1.7)*sin(ray.x*13.0-ray.z*11.0);
 float band=smoothstep(.015,.075,ray.y)*(1.0-smoothstep(.09,.34,ray.y));
 gl_FragColor=vec4(mix(sky,vec3(.98,.78,.64),smoothstep(.48,.96,cloud)*band*.37),1.0);
 #include <colorspace_fragment>
}`;
export function buildSky(scene) {
  const zenith = new Color(), horizon = new Color(), sunlight = new Vector3();
  const midday = new Color(PALETTE.skyTop), duskColor = new Color(PALETTE.skyDusk), warm = new Color(PALETTE.sun), sunset = new Color(PALETTE.duskSun);
  const sun = new DirectionalLight(), ambient = new HemisphereLight(PALETTE.fill, PALETTE.bounce);
  const sky = new Mesh(new SphereGeometry(CAMERA.far * .82, 40, 24), new ShaderMaterial({
    uniforms: { zenith: { value: zenith }, horizon: { value: horizon }, sunlight: { value: sunlight } }, side: BackSide, depthWrite: false, vertexShader, fragmentShader,
  }));
  sky.frustumCulled = false; sky.renderOrder = -10; scene.fog = new Fog(0xffd5b6, LIGHT.fogNear, LIGHT.fogFar); scene.add(sky, sun, sun.target, ambient);
  const shadow = sun.shadow, radius = LIGHT.shadowRadius;
  Object.assign(shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: 270 });
  shadow.camera.updateProjectionMatrix(); shadow.bias = -.00025; shadow.normalBias = .14;
  let anchorX = Infinity, anchorZ = Infinity, altitude = LIGHT.sunY;
  function setTime(value) {
    const dusk = MathUtils.clamp(value, 0, 1); altitude = LIGHT.sunY * (1 - dusk * .78);
    sunlight.set(LIGHT.sunX, altitude, LIGHT.sunZ).normalize(); zenith.copy(midday).lerp(duskColor, dusk);
    horizon.set(PALETTE.skyHorizon).lerp(sunset, dusk * .68); scene.fog.color.copy(horizon);
    sun.color.copy(warm).lerp(sunset, dusk); sun.intensity = 2.45 - dusk * 1.03; ambient.intensity = 1.72 - dusk * .57; anchorX = Infinity;
  }
  setTime(0);
  return {
    setTime,
    quality(size) {
      sun.castShadow = size > 0;
      if (!size || shadow.mapSize.x === size && shadow.mapSize.y === size) return;
      shadow.map?.dispose(); shadow.map = null; shadow.mapSize.set(size, size);
    },
    update(camera, target) {
      sky.position.copy(camera.position);
      const x = Math.round(target.x / LIGHT.resnap) * LIGHT.resnap, z = Math.round(target.z / LIGHT.resnap) * LIGHT.resnap;
      if (x === anchorX && z === anchorZ) return;
      anchorX = x; anchorZ = z; sun.target.position.set(x, 0, z); sun.position.set(x + LIGHT.sunX, altitude, z + LIGHT.sunZ);
    },
  };
}
