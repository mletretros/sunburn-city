import * as THREE from 'three';
import { WORLD as W, PALETTE as C } from '../config.js';

export function buildTerrain(scene, city, batch) {
  const { box } = batch, { bounds } = city;
  const width = bounds.east + 48, length = city.south - W.north + 110, mid = (city.south + W.north) / 2;
  box(C.asphalt, width / 2 - 48, -.56, mid, width, 1, length, 0, false);
  box(C.sand, (W.shore - 57 + W.boardwalk) / 2, -.11, mid, W.boardwalk - W.shore + 57, .22, length + 35, 0, false);
  box(C.pavement, (W.boardwalk - W.road / 2) / 2 - 1, .065, mid, -W.road / 2 - W.boardwalk + 2, .15, length, 0, false);
  box(C.curb, -W.road / 2 - .12, .07, mid, .25, .16, length, 0, false);
  box(C.coral, W.boardwalk - 1.5, .15, mid, .18, .045, length, 0, false);
  box(C.teal, W.boardwalk - 1.13, .15, mid, .18, .045, length, 0, false);
  for (const b of city.blocks) {
    box(C.pavement, b.x, .038, b.z, b.side, .20, b.side, 0, false);
    box(b.park ? C.park : C.concrete, b.x, .10, b.z, b.side - 2 * W.sidewalk, .09, b.side - 2 * W.sidewalk, 0, false);
    for (const side of [-1, 1]) {
      box(C.curb, b.x + side * (b.side / 2 - .08), .075, b.z, .18, .145, b.side, 0, false);
      box(C.curb, b.x, .075, b.z + side * (b.side / 2 - .08), b.side, .145, .18, 0, false);
    }
  }
  const half = W.road / 2;
  for (const road of city.roads) {
    const vertical = road.ax === road.bx;
    const line = (offset, inset, w, d, color) => box(color,
      road.ax + (vertical ? offset : inset), -.047, road.az + (vertical ? inset : offset),
      vertical ? w : d, .015, vertical ? d : w, 0, false);
    for (const side of [-1, 1]) line(side * (half - .58), W.cell / 2, .10, W.cell - W.road - 6, C.roadEdge);
    for (let t = half + 6; t < W.cell - half - 4; t += 6) {
      line(-.14, t, .085, 2.7, C.lane); line(.14, t, .085, 2.7, C.lane);
    }
    for (const end of [half + .8, W.cell - half - .8]) {
      for (let offset = -half + 1.3; offset < half - .8; offset += 1.34) line(offset, end, .67, 1.52, C.roadEdge);
    }
  }
  for (let z = W.north - 12; z < city.south + 15; z += 3.8) {
    box(0xbb9690, -13.4, .146, z, 7.6, .012, .045, 0, false);
  }

  const water = new THREE.ShaderMaterial({
    uniforms: { seconds: { value: 0 }, edge: { value: W.shore } },
    vertexShader: `varying vec3 p; void main() {
      vec4 world = modelMatrix * vec4(position, 1.); p = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }`,
    fragmentShader: `uniform float seconds; uniform float edge; varying vec3 p;
    void main() {
      float coast = edge + sin(p.z * .09) * 1.25 + sin(p.z * .023) * 2.;
      float d = coast - p.x;
      if (d < 0.) discard;
      float wave = sin(p.x * .46 + sin(p.z * .28) * 1.8 + seconds * 1.3);
      float glint = pow(max(0., sin(p.z * 1.04 + p.x * 1.65 + wave * 2.) * sin(p.z * .32 - p.x * .63 + seconds * .9)), 11.);
      vec3 col = mix(vec3(.10,.76,.70), vec3(.045,.39,.54), smoothstep(0.,180.,d));
      col += wave * .017 + glint * .22;
      float swash = d - (2.3 + sin(seconds * 1.45 + p.z * .13) * 1.4);
      float foam = exp(-abs(swash) * 2.6) * (.67 + glint) + exp(-abs(d - 7. - wave) * 3.) * .30;
      col = mix(col, vec3(.87,.98,.89), clamp(foam, 0., 1.));
      float haze = smoothstep(90., 790., distance(cameraPosition, p));
      gl_FragColor = vec4(mix(col, vec3(.67,.77,.79), haze), 1.);
    }`,
  });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(W.oceanSize, W.oceanSize), water);
  sea.rotation.x = -Math.PI / 2; sea.position.set(-W.oceanSize / 2 + W.shore + 6, .015, mid);
  scene.add(sea);
  return seconds => { water.uniforms.seconds.value = seconds; };
}
