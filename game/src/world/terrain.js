import { Mesh, PlaneGeometry, ShaderMaterial } from 'three';
import { WORLD as W, PALETTE as C } from '../config.js';
const vertexShader = `varying vec3 surface;
void main(){vec4 p=modelMatrix*vec4(position,1.0);surface=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`;
const fragmentShader = `
uniform float seconds;uniform float edge;varying vec3 surface;
void main(){
 float depth=edge+sin(surface.z*.09)*1.25+sin(surface.z*.023)*2.0-surface.x;
 if(depth<0.0)discard;
 float wave=sin(surface.x*.46+sin(surface.z*.28)*1.8+seconds*1.3);
 float shimmer=sin(surface.z*1.04+surface.x*1.65+wave*2.0)*sin(surface.z*.32-surface.x*.63+seconds*.9);
 float glint=pow(max(0.0,shimmer),11.0);
 vec3 water=mix(vec3(.10,.76,.70),vec3(.045,.39,.54),smoothstep(0.0,180.0,depth));
 water+=wave*.017+glint*.22;
 float swash=depth-(2.3+sin(seconds*1.45+surface.z*.13)*1.4);
 float foam=exp(-abs(swash)*2.6)*(.67+glint)+exp(-abs(depth-7.0-wave)*3.0)*.30;
 water=mix(water,vec3(.87,.98,.89),clamp(foam,0.0,1.0));
 gl_FragColor=vec4(mix(water,vec3(.67,.77,.79),smoothstep(90.0,790.0,distance(cameraPosition,surface))),1.0);
}`;
export function buildTerrain(scene, city, batch) {
  const width = city.bounds.east + 48, length = city.south - W.north + 110, middle = (city.south + W.north) / 2, half = W.road / 2;
  const slab = (color, x, y, z, w, h, d) => batch.box(color, x, y, z, w, h, d, 0, false);
  slab(C.asphalt, width / 2 - 48, -.56, middle, width, 1, length);
  slab(C.sand, (W.shore - 57 + W.boardwalk) / 2, -.11, middle, W.boardwalk - W.shore + 57, .22, length + 35);
  slab(C.pavement, (W.boardwalk - half) / 2 - 1, .065, middle, -half - W.boardwalk + 2, .15, length);
  slab(C.curb, -half - .12, .07, middle, .25, .16, length);
  slab(C.coral, W.boardwalk - 1.5, .15, middle, .18, .045, length); slab(C.teal, W.boardwalk - 1.13, .15, middle, .18, .045, length);
  for (const { x, z, side, park } of city.blocks) {
    const inner = side - W.sidewalk * 2;
    slab(C.pavement, x, .038, z, side, .20, side); slab(park ? C.park : C.concrete, x, .1, z, inner, .09, inner);
    for (const sign of [-1, 1]) {
      slab(C.curb, x + sign * (side / 2 - .08), .075, z, .18, .145, side);
      slab(C.curb, x, .075, z + sign * (side / 2 - .08), side, .145, .18);
    }
  }
  function stripe(road, lateral, forward, width, length, color) {
    const vertical = road.ax === road.bx;
    slab(color, road.ax + (vertical ? lateral : forward), -.047, road.az + (vertical ? forward : lateral), vertical ? width : length, .015, vertical ? length : width);
  }
  for (const road of city.roads) {
    for (const sign of [-1, 1]) stripe(road, sign * (half - .58), W.cell / 2, .1, W.cell - W.road - 6, C.roadEdge);
    for (let t = half + 6; t < W.cell - half - 4; t += 6) { stripe(road, -.14, t, .085, 2.7, C.lane); stripe(road, .14, t, .085, 2.7, C.lane); }
    for (const end of [half + .8, W.cell - half - .8]) for (let u = -half + 1.3; u < half - .8; u += 1.34) stripe(road, u, end, .67, 1.52, C.roadEdge);
  }
  for (let z = W.north - 12; z < city.south + 15; z += 3.8) slab(0xbb9690, -13.4, .146, z, 7.6, .012, .045);
  const seconds = { value: 0 }, ocean = new Mesh(new PlaneGeometry(W.oceanSize, W.oceanSize), new ShaderMaterial({ uniforms: { seconds, edge: { value: W.shore } }, vertexShader, fragmentShader }));
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-W.oceanSize / 2 + W.shore + 6, .015, middle); scene.add(ocean);
  return time => { seconds.value = time % (Math.PI * 2000); };
}
